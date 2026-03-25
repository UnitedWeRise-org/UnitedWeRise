/**
 * Verification Billing Service
 *
 * Manages verification credit balances for campaign voter registration lookups.
 * Each campaign (candidate) purchases blocks of 1,000 verifications at $100/block
 * via Stripe Checkout. Credits are consumed when the voter verification API is
 * called during petition signing.
 *
 * Features:
 * - Credit balance management (purchase, consume, query)
 * - Daily usage caps to prevent runaway spending
 * - Auto-replenish via saved Stripe payment method
 * - Usage alerts at 80% consumption threshold
 * - Full purchase audit trail
 */

import Stripe from 'stripe';
import { prisma } from '../lib/prisma';
import { logger } from './logger';

// Initialize Stripe (same instance pattern as stripeService)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  typescript: true,
});

/**
 * Verification billing service for managing campaign verification credits.
 *
 * Provides methods to purchase, consume, and query verification credit balances
 * tied to candidate campaigns. Integrates with Stripe for payment processing
 * and supports auto-replenishment via saved payment methods.
 */
export class VerificationBillingService {
  /**
   * Get or create a verification balance record for a candidate.
   *
   * If no balance record exists, creates one with default values
   * (zero credits, 500 daily cap, no auto-replenish).
   *
   * @param candidateId - Candidate ID to get/create balance for
   * @returns The verification balance record
   */
  async getOrCreateBalance(candidateId: string) {
    const existing = await prisma.verificationBalance.findUnique({
      where: { candidateId },
    });

    if (existing) {
      return existing;
    }

    return prisma.verificationBalance.create({
      data: { candidateId },
    });
  }

  /**
   * Get current balance with remaining credit count.
   *
   * Returns the balance record along with a computed `remaining` field
   * representing how many credits are still available (purchased - consumed).
   *
   * @param candidateId - Candidate ID to query balance for
   * @returns Balance record with remaining count, or null if not found
   */
  async getBalance(candidateId: string) {
    const balance = await prisma.verificationBalance.findUnique({
      where: { candidateId },
    });

    if (!balance) {
      return null;
    }

    const remaining = balance.totalPurchased - balance.totalConsumed;

    return {
      ...balance,
      remaining,
    };
  }

  /**
   * Check if a campaign has available verification credits.
   *
   * Returns true only if:
   * 1. A balance record exists
   * 2. Remaining credits (purchased - consumed) > 0
   * 3. Daily cap has not been reached (if dailyCap > 0)
   *
   * Automatically resets daily counters if the reset date is in the past.
   *
   * @param candidateId - Candidate ID to check credits for
   * @returns True if credits are available for use
   */
  async hasAvailableCredits(candidateId: string): Promise<boolean> {
    const balance = await prisma.verificationBalance.findUnique({
      where: { candidateId },
    });

    if (!balance) {
      return false;
    }

    // Reset daily count if needed
    await this.resetDailyIfNeeded(balance);

    const remaining = balance.totalPurchased - balance.totalConsumed;
    if (remaining <= 0) {
      return false;
    }

    // Check daily cap (0 = unlimited)
    if (balance.dailyCap > 0) {
      // Re-fetch after potential reset
      const freshBalance = await prisma.verificationBalance.findUnique({
        where: { candidateId },
      });
      if (freshBalance && freshBalance.dailyConsumed >= freshBalance.dailyCap) {
        return false;
      }
    }

    return true;
  }

  /**
   * Atomically consume one verification credit.
   *
   * Increments totalConsumed and dailyConsumed within a transaction.
   * Returns false if no credits are available (prevents over-consumption).
   *
   * @param candidateId - Candidate ID to consume credit from
   * @returns True if credit was successfully consumed, false if unavailable
   */
  async consumeCredit(candidateId: string): Promise<boolean> {
    try {
      const hasCredits = await this.hasAvailableCredits(candidateId);
      if (!hasCredits) {
        return false;
      }

      await prisma.verificationBalance.update({
        where: { candidateId },
        data: {
          totalConsumed: { increment: 1 },
          dailyConsumed: { increment: 1 },
        },
      });

      logger.debug({ candidateId }, 'Verification credit consumed');
      return true;
    } catch (error) {
      logger.error(
        { error, candidateId },
        'Failed to consume verification credit'
      );
      return false;
    }
  }

  /**
   * Credit a purchase to a campaign's verification balance.
   *
   * Creates a VerificationPurchase audit record and increments the
   * totalPurchased count on the balance. Resets the usage alert flag
   * so alerts can fire again for the new credit block.
   *
   * @param candidateId - Candidate ID to credit
   * @param amount - Number of verifications purchased (typically 1000)
   * @param stripeSessionId - Stripe Checkout Session ID for the purchase
   * @param priceCents - Price paid in cents (typically 10000 = $100)
   */
  async creditPurchase(
    candidateId: string,
    amount: number,
    stripeSessionId: string,
    priceCents: number
  ): Promise<void> {
    const balance = await this.getOrCreateBalance(candidateId);

    await prisma.$transaction([
      prisma.verificationPurchase.create({
        data: {
          balanceId: balance.id,
          amount,
          priceCents,
          stripeSessionId,
          status: 'completed',
        },
      }),
      prisma.verificationBalance.update({
        where: { id: balance.id },
        data: {
          totalPurchased: { increment: amount },
          usageAlertSent: false,
        },
      }),
    ]);

    logger.info(
      { candidateId, amount, stripeSessionId, priceCents },
      'Verification credits purchased and credited'
    );
  }

  /**
   * Get purchase history for a campaign.
   *
   * Returns all VerificationPurchase records ordered by creation date
   * (newest first).
   *
   * @param candidateId - Candidate ID to query purchases for
   * @returns Array of purchase records
   */
  async getPurchaseHistory(candidateId: string) {
    const balance = await prisma.verificationBalance.findUnique({
      where: { candidateId },
    });

    if (!balance) {
      return [];
    }

    return prisma.verificationPurchase.findMany({
      where: { balanceId: balance.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Reset daily consumption counts for all balances where the reset date is in the past.
   *
   * Intended to be called from a daily cron job. Updates all balances
   * whose dailyResetDate is before the start of today.
   */
  async resetDailyCounts(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await prisma.verificationBalance.updateMany({
      where: {
        dailyResetDate: { lt: today },
      },
      data: {
        dailyConsumed: 0,
        dailyResetDate: today,
      },
    });

    if (result.count > 0) {
      logger.info(
        { resetCount: result.count },
        'Daily verification counts reset'
      );
    }
  }

  /**
   * Enable auto-replenish for a campaign.
   *
   * Stores the Stripe customer ID and payment method ID so that
   * credits can be automatically purchased when the balance runs low.
   *
   * @param candidateId - Candidate ID to enable auto-replenish for
   * @param stripeCustomerId - Stripe customer ID for charging
   * @param paymentMethodId - Stripe payment method ID to charge
   */
  async enableAutoReplenish(
    candidateId: string,
    stripeCustomerId: string,
    paymentMethodId: string
  ): Promise<void> {
    await this.getOrCreateBalance(candidateId);

    await prisma.verificationBalance.update({
      where: { candidateId },
      data: {
        autoReplenish: true,
        stripeCustomerId,
        stripePaymentMethodId: paymentMethodId,
      },
    });

    logger.info(
      { candidateId },
      'Auto-replenish enabled for verification credits'
    );
  }

  /**
   * Disable auto-replenish for a campaign.
   *
   * Clears the auto-replenish flag but retains the stored payment
   * method for potential re-enablement.
   *
   * @param candidateId - Candidate ID to disable auto-replenish for
   */
  async disableAutoReplenish(candidateId: string): Promise<void> {
    await prisma.verificationBalance.update({
      where: { candidateId },
      data: {
        autoReplenish: false,
      },
    });

    logger.info(
      { candidateId },
      'Auto-replenish disabled for verification credits'
    );
  }

  /**
   * Process auto-replenish for a campaign.
   *
   * Creates a Stripe PaymentIntent using the saved payment method
   * and credits 1,000 verifications on success. On failure, disables
   * auto-replenish and logs the error.
   *
   * @param candidateId - Candidate ID to process auto-replenish for
   */
  async processAutoReplenish(candidateId: string): Promise<void> {
    const balance = await prisma.verificationBalance.findUnique({
      where: { candidateId },
    });

    if (!balance || !balance.autoReplenish) {
      return;
    }

    if (!balance.stripeCustomerId || !balance.stripePaymentMethodId) {
      logger.warn(
        { candidateId },
        'Auto-replenish enabled but missing Stripe payment details'
      );
      await this.disableAutoReplenish(candidateId);
      return;
    }

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: 10000, // $100.00
        currency: 'usd',
        customer: balance.stripeCustomerId,
        payment_method: balance.stripePaymentMethodId,
        off_session: true,
        confirm: true,
        description: 'Voter Verification Credits - 1,000 verifications (auto-replenish)',
        metadata: {
          type: 'verification_credits_auto_replenish',
          candidateId,
          amount: '1000',
        },
      });

      if (paymentIntent.status === 'succeeded') {
        await this.creditPurchase(
          candidateId,
          1000,
          paymentIntent.id,
          10000
        );

        logger.info(
          { candidateId, paymentIntentId: paymentIntent.id },
          'Auto-replenish successful: 1,000 verification credits added'
        );
      } else {
        logger.warn(
          { candidateId, status: paymentIntent.status },
          'Auto-replenish payment intent not immediately succeeded'
        );
      }
    } catch (error) {
      logger.error(
        { error, candidateId },
        'Auto-replenish payment failed — disabling auto-replenish'
      );

      await this.disableAutoReplenish(candidateId);
    }
  }

  /**
   * Check if a usage alert should be sent for a campaign.
   *
   * Returns true if the remaining credits are below 20% of the last
   * purchased block amount and the alert has not already been sent.
   * Marks the alert as sent when triggered.
   *
   * @param candidateId - Candidate ID to check usage for
   * @returns True if usage alert should be sent
   */
  async checkUsageAlert(candidateId: string): Promise<boolean> {
    const balance = await prisma.verificationBalance.findUnique({
      where: { candidateId },
      include: {
        purchases: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!balance || balance.usageAlertSent) {
      return false;
    }

    const lastPurchaseAmount = balance.purchases[0]?.amount || 1000;
    const remaining = balance.totalPurchased - balance.totalConsumed;
    const threshold = Math.ceil(lastPurchaseAmount * 0.2);

    if (remaining <= threshold && remaining >= 0) {
      await prisma.verificationBalance.update({
        where: { candidateId },
        data: { usageAlertSent: true },
      });

      logger.info(
        { candidateId, remaining, threshold },
        'Verification usage alert triggered'
      );

      return true;
    }

    return false;
  }

  /**
   * Reset daily count for a single balance if the reset date is in the past.
   *
   * @param balance - Balance record to check and potentially reset
   */
  private async resetDailyIfNeeded(balance: {
    id: string;
    dailyResetDate: Date;
  }): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (balance.dailyResetDate < today) {
      await prisma.verificationBalance.update({
        where: { id: balance.id },
        data: {
          dailyConsumed: 0,
          dailyResetDate: today,
        },
      });
    }
  }
}

/** Singleton verification billing service instance */
export const verificationBillingService = new VerificationBillingService();
