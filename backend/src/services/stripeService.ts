import Stripe from 'stripe';
import { PaymentType, PaymentStatus, FeeType, DonationType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { logger } from './logger';

// Using singleton prisma from lib/prisma.ts

// Initialize Stripe with nonprofit account
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  typescript: true,
});

/**
 * Stripe payment integration service
 *
 * Handles:
 * - Tax-deductible donations (501c3 nonprofit)
 * - Non-deductible fees (candidate registration, etc.)
 * - Recurring donations via Payment Links
 * - Webhook event processing
 * - Customer management
 * - Receipt generation
 *
 * Payment types:
 * - DONATION (tax-deductible, via Payment Links)
 * - FEE (not tax-deductible, via Checkout Sessions)
 *
 * Features:
 * - Automatic tax calculation
 * - Promotion code support
 * - Idempotent webhook processing
 * - Automatic subscription management
 */
export class StripeService {
  /**
   * Create or get Stripe customer for a user
   *
   * Checks for existing StripeCustomer record, creates new Stripe customer if needed.
   * Stores customer ID in database for future lookups.
   * Includes user metadata (userId, platform name) in Stripe customer.
   *
   * @param userId - User ID to create/fetch customer for
   * @returns Promise<string> Stripe customer ID
   * @throws {Error} When user not found
   *
   * @example
   * const customerId = await StripeService.getOrCreateCustomer('user_123');
   * console.log(customerId); // "cus_ABC123xyz"
   */
  static async getOrCreateCustomer(userId: string): Promise<string> {
    // Check if customer already exists
    const existingCustomer = await prisma.stripeCustomer.findUnique({
      where: { userId },
      include: { user: true }
    });

    if (existingCustomer) {
      return existingCustomer.stripeCustomerId;
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Create Stripe customer
    const customer = await stripe.customers.create({
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      metadata: {
        userId: user.id,
        platform: 'UnitedWeRise'
      }
    });

    // Save customer to database
    await prisma.stripeCustomer.create({
      data: {
        userId,
        stripeCustomerId: customer.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        address: user.streetAddress ? {
          line1: user.streetAddress,
          city: user.city || '',
          state: user.state || '',
          postal_code: user.zipCode || '',
          country: 'US'
        } : null
      }
    });

    return customer.id;
  }

  /**
   * Create tax-deductible donation payment
   *
   * Creates Payment record and generates Stripe Payment Link (most adblocker-resistant).
   * Supports one-time and recurring donations.
   *
   * Features:
   * - Tax-deductible (501c3 nonprofit)
   * - Automatic tax calculation
   * - Promotion codes enabled
   * - Success redirect to donation-success.html
   * - Automatic receipt generation on completion
   *
   * For recurring donations:
   * - Creates Stripe subscription via Payment Link
   * - QUARTERLY mapped to monthly with interval_count (would need custom handling)
   *
   * @param params - Donation parameters
   * @param params.userId - User ID making donation
   * @param params.amount - Amount in cents (e.g., 5000 = $50.00)
   * @param params.donationType - Type from DonationType enum
   * @param params.campaignId - Optional campaign to credit donation to
   * @param params.isRecurring - Whether this is recurring donation
   * @param params.recurringInterval - Frequency for recurring (required if isRecurring true)
   * @returns Promise<Object> Payment ID, checkout URL, and Payment Link ID
   * @throws {Error} When customer creation fails or Stripe API errors
   *
   * @example
   * const donation = await StripeService.createDonation({
   *   userId: 'user_123',
   *   amount: 10000, // $100.00
   *   donationType: 'GENERAL',
   *   isRecurring: true,
   *   recurringInterval: 'MONTHLY'
   * });
   * // Redirect user to: donation.checkoutUrl
   */
  static async createDonation(params: {
    userId: string;
    amount: number; // In cents
    donationType: DonationType;
    campaignId?: string;
    isRecurring?: boolean;
    recurringInterval?: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  }) {
    const customerId = await this.getOrCreateCustomer(params.userId);

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        userId: params.userId,
        amount: params.amount,
        type: PaymentType.DONATION,
        status: PaymentStatus.PENDING,
        taxDeductible: true, // Donations are tax-deductible
        taxYear: new Date().getFullYear(),
        stripeCustomerId: customerId,
        donationType: params.donationType,
        campaignId: params.campaignId,
        isRecurring: params.isRecurring || false,
        recurringInterval: params.recurringInterval,
        description: `Donation to United We Rise`
      }
    });

    try {
      if (params.isRecurring && params.recurringInterval) {
        // Create recurring price
        const price = await stripe.prices.create({
          unit_amount: params.amount,
          currency: 'usd',
          recurring: {
            interval: this.mapRecurringInterval(params.recurringInterval)
          },
          product_data: {
            name: 'United We Rise Recurring Donation',
            metadata: {
              taxDeductible: 'true',
              donationType: params.donationType
            }
          }
        });

        // Create Payment Link for subscription (most adblocker-resistant)
        const paymentLink = await stripe.paymentLinks.create({
          line_items: [{
            price: price.id,
            quantity: 1
          }],
          after_completion: {
            type: 'redirect',
            redirect: {
              url: process.env.SUCCESS_URL || `${process.env.FRONTEND_URL}/donation-success.html?payment_id=${payment.id}&amount=${params.amount}`
            }
          },
          automatic_tax: { enabled: true },
          allow_promotion_codes: true,
          metadata: {
            paymentId: payment.id,
            userId: params.userId,
            taxDeductible: 'true'
          }
        });

        // Update payment with Payment Link ID
        await prisma.payment.update({
          where: { id: payment.id },
          data: { stripePaymentIntentId: paymentLink.id }
        });

        return {
          paymentId: payment.id,
          checkoutUrl: paymentLink.url,
          paymentLinkId: paymentLink.id
        };
      } else {
        // Create one-time price
        const price = await stripe.prices.create({
          unit_amount: params.amount,
          currency: 'usd',
          product_data: {
            name: 'One-time Donation to United We Rise',
            metadata: {
              taxDeductible: 'true',
              donationType: params.donationType
            }
          }
        });

        // Create Payment Link for one-time donation (most adblocker-resistant)
        const paymentLink = await stripe.paymentLinks.create({
          line_items: [{
            price: price.id,
            quantity: 1
          }],
          after_completion: {
            type: 'redirect',
            redirect: {
              url: process.env.SUCCESS_URL || `${process.env.FRONTEND_URL}/donation-success.html?payment_id=${payment.id}&amount=${params.amount}`
            }
          },
          automatic_tax: { enabled: true },
          allow_promotion_codes: true,
          metadata: {
            paymentId: payment.id,
            userId: params.userId,
            taxDeductible: 'true'
          }
        });

        // Update payment with Payment Link ID
        await prisma.payment.update({
          where: { id: payment.id },
          data: { stripePaymentIntentId: paymentLink.id }
        });

        return {
          paymentId: payment.id,
          checkoutUrl: paymentLink.url,
          paymentLinkId: paymentLink.id
        };
      }
    } catch (error) {
      // Update payment status to failed
      await prisma.payment.update({
        where: { id: payment.id },
        data: { 
          status: PaymentStatus.FAILED,
          failureReason: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      throw error;
    }
  }

  /**
   * Create non-deductible fee payment
   *
   * Creates Payment record and generates Stripe Checkout Session.
   * Used for platform fees like candidate registration.
   *
   * Features:
   * - NOT tax-deductible
   * - Standard checkout flow
   * - Success/cancel URLs
   * - Metadata includes candidateRegistrationId for workflow
   *
   * Common fee types:
   * - CANDIDATE_REGISTRATION: Candidate profile fee
   * - VERIFICATION_FEE: Identity verification
   * - PREMIUM_FEATURES: Premium access
   * - EVENT_HOSTING: Event hosting fee
   * - ADVERTISING: Campaign ads
   *
   * @param params - Fee payment parameters
   * @param params.userId - User ID paying fee
   * @param params.amount - Amount in cents
   * @param params.feeType - Type from FeeType enum
   * @param params.candidateRegistrationId - Optional registration ID to link
   * @param params.description - Optional custom description
   * @returns Promise<Object> Payment ID, checkout URL, and session ID
   * @throws {Error} When customer creation fails or Stripe API errors
   *
   * @example
   * const fee = await StripeService.createFeePayment({
   *   userId: 'user_123',
   *   amount: 25000, // $250.00
   *   feeType: 'CANDIDATE_REGISTRATION',
   *   candidateRegistrationId: 'reg_456'
   * });
   * // Redirect user to: fee.checkoutUrl
   */
  static async createFeePayment(params: {
    userId: string;
    amount: number; // In cents
    feeType: FeeType;
    candidateRegistrationId?: string;
    description?: string;
  }) {
    const customerId = await this.getOrCreateCustomer(params.userId);

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        userId: params.userId,
        amount: params.amount,
        type: PaymentType.FEE,
        status: PaymentStatus.PENDING,
        taxDeductible: false, // Fees are NOT tax-deductible
        stripeCustomerId: customerId,
        feeType: params.feeType,
        candidateRegistrationId: params.candidateRegistrationId,
        description: params.description || `${params.feeType} Fee`
      }
    });

    try {
      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: this.getFeeDescription(params.feeType),
              description: 'Non-tax-deductible fee',
              metadata: {
                taxDeductible: 'false',
                feeType: params.feeType
              }
            },
            unit_amount: params.amount
          },
          quantity: 1
        }],
        mode: 'payment',
        success_url: process.env.SUCCESS_URL || `${process.env.FRONTEND_URL}/donation-success.html?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: process.env.CANCEL_URL || `${process.env.FRONTEND_URL}/donation-cancelled.html`,
        metadata: {
          paymentId: payment.id,
          userId: params.userId,
          taxDeductible: 'false',
          feeType: params.feeType,
          candidateRegistrationId: params.candidateRegistrationId || ''
        }
      });

      // Update payment with Stripe session ID
      await prisma.payment.update({
        where: { id: payment.id },
        data: { stripePaymentIntentId: session.id }
      });

      return {
        paymentId: payment.id,
        checkoutUrl: session.url,
        sessionId: session.id
      };
    } catch (error) {
      // Update payment status to failed
      await prisma.payment.update({
        where: { id: payment.id },
        data: { 
          status: PaymentStatus.FAILED,
          failureReason: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      throw error;
    }
  }

  /**
   * Handle Stripe webhook events with idempotent processing
   *
   * Verifies webhook signature, prevents duplicate processing via PaymentWebhook table.
   * Handles multiple event types including checkouts, payments, and subscriptions.
   *
   * Supported events:
   * - checkout.session.completed: Update payment, generate receipt, update registration
   * - payment_intent.succeeded: Mark payment completed
   * - payment_intent.payment_failed: Mark payment failed
   * - invoice.payment_succeeded: Recurring donation succeeded
   * - customer.subscription.*: Subscription lifecycle events
   *
   * Idempotency:
   * - Checks PaymentWebhook.stripeEventId before processing
   * - Marks processed = true after completion
   * - Stores error if processing fails
   *
   * @param signature - Stripe-Signature header value
   * @param payload - Raw request body buffer
   * @returns Promise<Object> Success status and optional message
   * @throws {Error} When signature verification fails or webhook secret not configured
   *
   * @example
   * // In webhook route:
   * const result = await StripeService.handleWebhook(
   *   req.headers['stripe-signature'],
   *   req.rawBody
   * );
   * console.log(result.success); // true
   */
  static async handleWebhook(signature: string, payload: Buffer) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('Stripe webhook secret not configured');
    }

    let event: Stripe.Event;
    
    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      throw new Error(`Webhook signature verification failed: ${err}`);
    }

    // Check if we've already processed this event
    const existingWebhook = await prisma.paymentWebhook.findUnique({
      where: { stripeEventId: event.id }
    });

    if (existingWebhook?.processed) {
      return { success: true, message: 'Event already processed' };
    }

    // Save webhook event
    await prisma.paymentWebhook.upsert({
      where: { stripeEventId: event.id },
      create: {
        stripeEventId: event.id,
        eventType: event.type,
        payload: event as any,
        processed: false
      },
      update: {
        payload: event as any
      }
    });

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
          break;
        
        case 'payment_intent.succeeded':
          await this.handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
          break;
        
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
          break;


        case 'invoice.payment_succeeded':
          logger.info({ invoiceId: (event.data.object as any).id }, 'Payment Link invoice payment succeeded');
          break;

        case 'invoice.payment_failed':
          logger.warn({ invoiceId: (event.data.object as any).id }, 'Payment Link invoice payment failed');
          break;
        
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
          break;
        
        case 'customer.subscription.deleted':
          await this.handleSubscriptionCancelled(event.data.object as Stripe.Subscription);
          break;

        default:
          logger.debug({ eventType: event.type }, 'Unhandled webhook event type');
      }

      // Mark webhook as processed
      await prisma.paymentWebhook.update({
        where: { stripeEventId: event.id },
        data: { processed: true, processedAt: new Date() }
      });

      return { success: true };
    } catch (error) {
      // Log error
      await prisma.paymentWebhook.update({
        where: { stripeEventId: event.id },
        data: { 
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      throw error;
    }
  }

  /**
   * Handle successful checkout
   */
  private static async handleCheckoutComplete(session: Stripe.Checkout.Session) {
    const paymentId = session.metadata?.paymentId;
    if (!paymentId) return;

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId }
    });

    if (!payment) return;

    // Update payment status
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.COMPLETED,
        processedAt: new Date(),
        stripeChargeId: session.payment_intent as string,
        paymentMethodType: session.payment_method_types?.[0] || 'card'
      }
    });

    // Generate receipt
    await this.generateReceipt(paymentId);

    // If this was a candidate registration fee, update the registration
    if (payment.candidateRegistrationId) {
      await prisma.candidateRegistration.update({
        where: { id: payment.candidateRegistrationId },
        data: {
          status: 'PENDING_VERIFICATION' // Move to next step after payment
          // Note: paymentCompletedAt field would need to be added to schema if needed
        }
      });
    }

    // Update campaign raised amount if applicable
    if (payment.campaignId) {
      await prisma.donationCampaign.update({
        where: { id: payment.campaignId },
        data: {
          raised: { increment: payment.amount }
        }
      });
    }
  }

  /**
   * Handle payment success
   */
  private static async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
    const payment = await prisma.payment.findUnique({
      where: { stripePaymentIntentId: paymentIntent.id }
    });

    if (!payment) return;

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.COMPLETED,
        processedAt: new Date(),
        stripeChargeId: paymentIntent.latest_charge as string
      }
    });
  }

  /**
   * Handle payment failure
   */
  private static async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    const payment = await prisma.payment.findUnique({
      where: { stripePaymentIntentId: paymentIntent.id }
    });

    if (!payment) return;

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.FAILED,
        failureReason: paymentIntent.last_payment_error?.message || 'Payment failed'
      }
    });
  }

  /**
   * Handle subscription updates
   */
  private static async handleSubscriptionUpdate(subscription: Stripe.Subscription) {
    // Handle recurring donation updates
    logger.info({ subscriptionId: subscription.id }, 'Subscription updated');
  }

  /**
   * Handle subscription cancellation
   */
  private static async handleSubscriptionCancelled(subscription: Stripe.Subscription) {
    // Handle recurring donation cancellation
    logger.info({ subscriptionId: subscription.id }, 'Subscription cancelled');
  }


  /**
   * Generate tax-compliant receipt for payment
   *
   * Creates receipt number in format: UWR-{year}-{paymentId-last8}
   * Retrieves Stripe charge receipt URL and updates payment record.
   *
   * Tax-deductible donations include 501(c)(3) information in receipt.
   * Standard receipts generated for non-deductible fees.
   *
   * @param paymentId - Payment ID to generate receipt for
   * @returns Promise<void> Receipt data stored in payment record
   * @throws {Error} When payment not found or Stripe API fails
   *
   * @example
   * await StripeService.generateReceipt('pay_123');
   * // Creates receipt: UWR-2025-ABC12345
   * // Updates payment.receiptUrl, receiptNumber, receiptSent, receiptSentAt
   */
  static async generateReceipt(paymentId: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { user: true }
    });

    if (!payment) return;

    const receiptNumber = `UWR-${new Date().getFullYear()}-${payment.id.slice(-8).toUpperCase()}`;

    // Create receipt in Stripe
    if (payment.stripeChargeId) {
      const charge = await stripe.charges.retrieve(payment.stripeChargeId);
      
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          receiptUrl: charge.receipt_url || undefined,
          receiptNumber,
          receiptSent: true,
          receiptSentAt: new Date()
        }
      });

      // TODO: Send email with receipt and tax information
      if (payment.taxDeductible) {
        // Include 501(c)(3) information in receipt
        logger.info({ paymentId, receiptNumber }, 'Tax-deductible receipt generated');
      } else {
        // Standard receipt for non-deductible fees
        logger.info({ paymentId, receiptNumber }, 'Standard receipt generated');
      }
    }
  }

  /**
   * Helper function to map recurring intervals
   */
  private static mapRecurringInterval(interval: string): Stripe.Price.Recurring.Interval {
    const mapping: Record<string, Stripe.Price.Recurring.Interval> = {
      'WEEKLY': 'week',
      'MONTHLY': 'month',
      'QUARTERLY': 'month', // Will need to handle with interval_count
      'YEARLY': 'year'
    };
    return mapping[interval] || 'month';
  }

  /**
   * Get fee description for display
   */
  private static getFeeDescription(feeType: FeeType): string {
    const descriptions: Record<FeeType, string> = {
      CANDIDATE_REGISTRATION: 'Candidate Registration Fee',
      VERIFICATION_FEE: 'Identity Verification Fee',
      PREMIUM_FEATURES: 'Premium Features Access',
      EVENT_HOSTING: 'Event Hosting Fee',
      ADVERTISING: 'Campaign Advertising Fee',
      OTHER: 'Platform Fee'
    };
    return descriptions[feeType] || 'Platform Fee';
  }
}