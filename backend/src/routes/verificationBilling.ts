/**
 * Verification Billing API Routes
 *
 * Manages voter verification credit purchases and balance management
 * for candidate campaigns. Integrates with Stripe for payment processing.
 *
 * Route prefix: /api/verification-billing
 * All endpoints require authentication and a linked Candidate record.
 */

import { Router, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import Stripe from 'stripe';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { verificationBillingService } from '../services/verificationBillingService';
import { prisma } from '../lib/prisma';
import { logger } from '../services/logger';
import { safePaginationParams } from '../utils/safeJson';

const router = Router();

// Initialize Stripe (same instance pattern as stripeService)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  typescript: true,
});

/**
 * Helper to look up the authenticated user's linked Candidate record.
 *
 * @param userId - Authenticated user ID
 * @returns Candidate record or null
 */
async function getCandidateForUser(userId: string) {
  return prisma.candidate.findUnique({
    where: { userId },
    select: { id: true, name: true, campaignEmail: true },
  });
}

/**
 * @swagger
 * /api/verification-billing/balance:
 *   get:
 *     tags: [Verification Billing]
 *     summary: Get campaign verification balance
 *     description: Returns the campaign's current verification credit balance including remaining credits and daily usage. Requires authenticated user with a linked Candidate record.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Balance retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalPurchased:
 *                       type: integer
 *                       description: Total verifications purchased
 *                     totalConsumed:
 *                       type: integer
 *                       description: Total verifications used
 *                     remaining:
 *                       type: integer
 *                       description: Credits remaining
 *                     dailyCap:
 *                       type: integer
 *                       description: Daily verification cap
 *                     dailyConsumed:
 *                       type: integer
 *                       description: Verifications used today
 *                     autoReplenish:
 *                       type: boolean
 *                       description: Whether auto-replenish is enabled
 *       401:
 *         description: Unauthorized - authentication required
 *       403:
 *         description: User does not have a linked Candidate record
 *       500:
 *         description: Server error
 */
router.get('/balance', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const candidate = await getCandidateForUser(userId);

    if (!candidate) {
      // Non-candidates can still use verification — return zero balance
      return res.json({
        success: true,
        data: {
          totalPurchased: 0,
          totalConsumed: 0,
          remaining: 0,
          dailyCap: 0,
          dailyConsumed: 0,
          autoReplenish: false,
          hasBalance: false
        }
      });
    }

    const balance = await verificationBillingService.getBalance(candidate.id);

    if (!balance) {
      // Return zero balance for candidates who haven't purchased yet
      return res.json({
        success: true,
        data: {
          totalPurchased: 0,
          totalConsumed: 0,
          remaining: 0,
          dailyCap: 500,
          dailyConsumed: 0,
          autoReplenish: false,
        },
      });
    }

    res.json({
      success: true,
      data: balance,
    });
  } catch (error) {
    logger.error(
      { error, userId: req.user?.id },
      'Get verification balance error'
    );
    res.status(500).json({
      success: false,
      error: 'Failed to fetch verification balance',
    });
  }
});

/**
 * @swagger
 * /api/verification-billing/checkout:
 *   post:
 *     tags: [Verification Billing]
 *     summary: Create Stripe Checkout Session for verification credits
 *     description: Creates a Stripe Checkout Session for purchasing a block of 1,000 voter verification credits at $100. Returns the checkout URL for redirect.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Checkout session created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     checkoutUrl:
 *                       type: string
 *                       description: Stripe Checkout URL to redirect user to
 *                     sessionId:
 *                       type: string
 *                       description: Stripe Checkout Session ID
 *       401:
 *         description: Unauthorized - authentication required
 *       403:
 *         description: User does not have a linked Candidate record
 *       500:
 *         description: Server error - Stripe integration failure
 */
router.post('/checkout', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const candidate = await getCandidateForUser(userId);

    if (!candidate) {
      return res.status(403).json({
        success: false,
        error: 'No candidate profile linked to this account',
      });
    }

    const priceId = process.env.STRIPE_VERIFICATION_PRICE_ID;
    if (!priceId) {
      logger.error('STRIPE_VERIFICATION_PRICE_ID not configured');
      return res.status(500).json({
        success: false,
        error: 'Verification billing not configured',
      });
    }

    // Determine success/cancel URLs based on environment
    const env = process.env.NODE_ENV;
    let frontendUrl: string;
    if (env === 'production') {
      frontendUrl = 'https://www.unitedwerise.org';
    } else if (env === 'staging') {
      frontendUrl = 'https://dev.unitedwerise.org';
    } else {
      frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${frontendUrl}/verification-billing?session_id={CHECKOUT_SESSION_ID}&status=success`,
      cancel_url: `${frontendUrl}/verification-billing?status=cancelled`,
      metadata: {
        type: 'verification_credits',
        candidateId: candidate.id,
        amount: '1000',
      },
    });

    // Create pending purchase record
    const balance = await verificationBillingService.getOrCreateBalance(candidate.id);
    await prisma.verificationPurchase.create({
      data: {
        balanceId: balance.id,
        amount: 1000,
        priceCents: 10000,
        stripeSessionId: session.id,
        status: 'pending',
      },
    });

    res.json({
      success: true,
      data: {
        checkoutUrl: session.url,
        sessionId: session.id,
      },
    });
  } catch (error) {
    logger.error(
      { error, userId: req.user?.id },
      'Verification checkout creation error'
    );
    res.status(500).json({
      success: false,
      error: 'Failed to create checkout session',
    });
  }
});

/**
 * @swagger
 * /api/verification-billing/checkout/success:
 *   get:
 *     tags: [Verification Billing]
 *     summary: Handle checkout success redirect
 *     description: Verifies the Stripe Checkout Session after successful payment and returns the updated balance. Called when user is redirected back from Stripe.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: session_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Stripe Checkout Session ID
 *     responses:
 *       200:
 *         description: Checkout verified and balance updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   description: Updated verification balance
 *       400:
 *         description: Missing or invalid session ID
 *       401:
 *         description: Unauthorized - authentication required
 *       403:
 *         description: User does not have a linked Candidate record
 *       500:
 *         description: Server error
 */
router.get('/checkout/success', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const sessionId = req.query.session_id as string;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Missing session_id parameter',
      });
    }

    const candidate = await getCandidateForUser(userId);
    if (!candidate) {
      return res.status(403).json({
        success: false,
        error: 'No candidate profile linked to this account',
      });
    }

    // Verify session with Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return res.status(400).json({
        success: false,
        error: 'Payment has not been completed',
      });
    }

    // Return updated balance (credits already applied via webhook)
    const balance = await verificationBillingService.getBalance(candidate.id);

    res.json({
      success: true,
      data: balance,
    });
  } catch (error) {
    logger.error(
      { error, userId: req.user?.id },
      'Verification checkout success handler error'
    );
    res.status(500).json({
      success: false,
      error: 'Failed to verify checkout session',
    });
  }
});

/**
 * @swagger
 * /api/verification-billing/auto-replenish/enable:
 *   post:
 *     tags: [Verification Billing]
 *     summary: Enable auto-replenish
 *     description: Enables automatic credit replenishment when balance runs low. Requires a Stripe Setup Intent to save a payment method.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - stripeCustomerId
 *               - paymentMethodId
 *             properties:
 *               stripeCustomerId:
 *                 type: string
 *                 description: Stripe customer ID
 *               paymentMethodId:
 *                 type: string
 *                 description: Stripe payment method ID
 *     responses:
 *       200:
 *         description: Auto-replenish enabled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Auto-replenish enabled
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Unauthorized - authentication required
 *       403:
 *         description: User does not have a linked Candidate record
 *       500:
 *         description: Server error
 */
router.post(
  '/auto-replenish/enable',
  requireAuth,
  [
    body('stripeCustomerId').notEmpty().withMessage('Stripe customer ID is required'),
    body('paymentMethodId').notEmpty().withMessage('Payment method ID is required'),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const userId = req.user!.id;
      const candidate = await getCandidateForUser(userId);

      if (!candidate) {
        return res.status(403).json({
          success: false,
          error: 'No candidate profile linked to this account',
        });
      }

      const { stripeCustomerId, paymentMethodId } = req.body;
      await verificationBillingService.enableAutoReplenish(
        candidate.id,
        stripeCustomerId,
        paymentMethodId
      );

      res.json({
        success: true,
        message: 'Auto-replenish enabled',
      });
    } catch (error) {
      logger.error(
        { error, userId: req.user?.id },
        'Enable auto-replenish error'
      );
      res.status(500).json({
        success: false,
        error: 'Failed to enable auto-replenish',
      });
    }
  }
);

/**
 * @swagger
 * /api/verification-billing/auto-replenish/disable:
 *   post:
 *     tags: [Verification Billing]
 *     summary: Disable auto-replenish
 *     description: Disables automatic credit replenishment for the campaign.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Auto-replenish disabled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Auto-replenish disabled
 *       401:
 *         description: Unauthorized - authentication required
 *       403:
 *         description: User does not have a linked Candidate record
 *       500:
 *         description: Server error
 */
router.post('/auto-replenish/disable', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const candidate = await getCandidateForUser(userId);

    if (!candidate) {
      return res.status(403).json({
        success: false,
        error: 'No candidate profile linked to this account',
      });
    }

    await verificationBillingService.disableAutoReplenish(candidate.id);

    res.json({
      success: true,
      message: 'Auto-replenish disabled',
    });
  } catch (error) {
    logger.error(
      { error, userId: req.user?.id },
      'Disable auto-replenish error'
    );
    res.status(500).json({
      success: false,
      error: 'Failed to disable auto-replenish',
    });
  }
});

/**
 * @swagger
 * /api/verification-billing/purchases:
 *   get:
 *     tags: [Verification Billing]
 *     summary: List purchase history
 *     description: Returns paginated list of verification credit purchase records for the campaign.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of records to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of records to skip
 *     responses:
 *       200:
 *         description: Purchase history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     purchases:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           amount:
 *                             type: integer
 *                           priceCents:
 *                             type: integer
 *                           status:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                     total:
 *                       type: integer
 *                     hasMore:
 *                       type: boolean
 *       401:
 *         description: Unauthorized - authentication required
 *       403:
 *         description: User does not have a linked Candidate record
 *       500:
 *         description: Server error
 */
router.get('/purchases', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const candidate = await getCandidateForUser(userId);

    if (!candidate) {
      return res.status(403).json({
        success: false,
        error: 'No candidate profile linked to this account',
      });
    }

    const { limit, offset } = safePaginationParams(
      req.query.limit as string | undefined,
      req.query.offset as string | undefined
    );

    const balance = await prisma.verificationBalance.findUnique({
      where: { candidateId: candidate.id },
    });

    if (!balance) {
      return res.json({
        success: true,
        data: {
          purchases: [],
          total: 0,
          hasMore: false,
        },
      });
    }

    const [purchases, total] = await Promise.all([
      prisma.verificationPurchase.findMany({
        where: { balanceId: balance.id },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.verificationPurchase.count({
        where: { balanceId: balance.id },
      }),
    ]);

    res.json({
      success: true,
      data: {
        purchases,
        total,
        hasMore: offset + purchases.length < total,
      },
    });
  } catch (error) {
    logger.error(
      { error, userId: req.user?.id },
      'Get purchase history error'
    );
    res.status(500).json({
      success: false,
      error: 'Failed to fetch purchase history',
    });
  }
});

export default router;
