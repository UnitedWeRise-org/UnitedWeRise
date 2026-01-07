import express, { Router, Response, Request } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { StripeService } from '../services/stripeService';
import { DonationType, FeeType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { body, validationResult } from 'express-validator';
import { logger } from '../services/logger';
import { safePaginationParams } from '../utils/safeJson';

const router = Router();
// Using singleton prisma from lib/prisma.ts

/**
 * @swagger
 * /api/payments/donation:
 *   post:
 *     tags: [Payment]
 *     summary: Create tax-deductible donation
 *     description: Creates a donation payment with Stripe integration. Supports one-time and recurring donations. All donations are tax-deductible (501c3 nonprofit).
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - donationType
 *             properties:
 *               amount:
 *                 type: integer
 *                 minimum: 100
 *                 description: Donation amount in cents (minimum $1.00)
 *                 example: 2500
 *               donationType:
 *                 type: string
 *                 enum: [ONE_TIME, RECURRING, CAMPAIGN_SPECIFIC, GENERAL_SUPPORT, MEMORIAL, HONOR]
 *                 description: Type of donation
 *                 example: "ONE_TIME"
 *               campaignId:
 *                 type: string
 *                 description: Campaign ID for campaign-specific donations
 *               isRecurring:
 *                 type: boolean
 *                 description: Whether donation repeats automatically
 *               recurringInterval:
 *                 type: string
 *                 enum: [WEEKLY, MONTHLY, QUARTERLY, YEARLY]
 *                 description: Interval for recurring donations (required if isRecurring is true)
 *     responses:
 *       200:
 *         description: Donation created successfully with Stripe Payment Link
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
 *                   description: Stripe payment details (Payment Link URL, payment ID, etc.)
 *       400:
 *         description: Validation error - invalid amount or donation type
 *       401:
 *         description: Unauthorized - authentication required
 *       500:
 *         description: Server error - Stripe integration failure
 */
router.post('/donation',
  requireAuth,
  [
    body('amount').isInt({ min: 100 }).withMessage('Minimum donation is $1.00'),
    body('donationType').isIn(['ONE_TIME', 'RECURRING', 'CAMPAIGN_SPECIFIC', 'GENERAL_SUPPORT', 'MEMORIAL', 'HONOR']),
    body('recurringInterval').optional().isIn(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'])
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const userId = req.user!.id;
      const { amount, donationType, campaignId, isRecurring, recurringInterval } = req.body;

      const result = await StripeService.createDonation({
        userId,
        amount,
        donationType: donationType as DonationType,
        campaignId,
        isRecurring,
        recurringInterval
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error({ error, userId: req.user?.id, amount: req.body.amount }, 'Donation creation error');
      res.status(500).json({
        success: false,
        error: 'Failed to create donation'
      });
    }
  }
);

/**
 * @swagger
 * /api/payments/fee:
 *   post:
 *     tags: [Payment]
 *     summary: Create non-deductible fee payment
 *     description: Creates a fee payment via Stripe (NOT tax-deductible). Used for candidate registration, premium features, event hosting, advertising, etc.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - feeType
 *             properties:
 *               amount:
 *                 type: integer
 *                 minimum: 100
 *                 description: Fee amount in cents (minimum $1.00)
 *                 example: 5000
 *               feeType:
 *                 type: string
 *                 enum: [CANDIDATE_REGISTRATION, VERIFICATION_FEE, PREMIUM_FEATURES, EVENT_HOSTING, ADVERTISING, OTHER]
 *                 description: Type of fee payment
 *                 example: "CANDIDATE_REGISTRATION"
 *               candidateRegistrationId:
 *                 type: string
 *                 description: Candidate registration ID (required for CANDIDATE_REGISTRATION fee type)
 *               description:
 *                 type: string
 *                 description: Optional description of fee payment
 *     responses:
 *       200:
 *         description: Fee payment created successfully with Stripe Checkout Session
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
 *                   description: Stripe Checkout Session details (session URL, payment ID, etc.)
 *       400:
 *         description: Validation error - invalid amount or fee type
 *       401:
 *         description: Unauthorized - authentication required
 *       500:
 *         description: Server error - Stripe integration failure
 */
router.post('/fee',
  requireAuth,
  [
    body('amount').isInt({ min: 100 }).withMessage('Minimum fee is $1.00'),
    body('feeType').isIn(['CANDIDATE_REGISTRATION', 'VERIFICATION_FEE', 'PREMIUM_FEATURES', 'EVENT_HOSTING', 'ADVERTISING', 'OTHER'])
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const userId = req.user!.id;
      const { amount, feeType, candidateRegistrationId, description } = req.body;

      const result = await StripeService.createFeePayment({
        userId,
        amount,
        feeType: feeType as FeeType,
        candidateRegistrationId,
        description
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error({ error, userId: req.user?.id, feeType: req.body.feeType }, 'Fee payment creation error');
      res.status(500).json({
        success: false,
        error: 'Failed to create payment'
      });
    }
  }
);

/**
 * @swagger
 * /api/payments/history:
 *   get:
 *     tags: [Payment]
 *     summary: Get user's payment history
 *     description: Retrieves authenticated user's payment history (donations and fees) with pagination and filtering. Includes refund information.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [DONATION, FEE]
 *         description: Filter by payment type
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of payments to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of payments to skip
 *     responses:
 *       200:
 *         description: Payment history retrieved successfully
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
 *                     payments:
 *                       type: array
 *                       items:
 *                         type: object
 *                         description: Payment record with refund details
 *                     total:
 *                       type: integer
 *                       description: Total number of payments matching filter
 *                     hasMore:
 *                       type: boolean
 *                       description: Whether more payments exist beyond current page
 *       401:
 *         description: Unauthorized - authentication required
 *       500:
 *         description: Server error - failed to fetch payment history
 */
router.get('/history', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user!.id;
    const { type } = req.query;
    const { limit, offset } = safePaginationParams(
      req.query.limit as string | undefined,
      req.query.offset as string | undefined
    );

    const where: any = { userId };
    if (type) {
      where.type = type;
    }

    const payments = await prisma.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        refunds: true
      }
    });

    const total = await prisma.payment.count({ where });

    res.json({
      success: true,
      data: {
        payments,
        total,
        hasMore: offset + payments.length < total
      }
    });
  } catch (error) {
    logger.error({ error, userId: (req as AuthRequest).user?.id }, 'Payment history error');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment history'
    });
  }
});

/**
 * @swagger
 * /api/payments/campaigns:
 *   get:
 *     tags: [Payment]
 *     summary: Get active donation campaigns
 *     description: Retrieves all active donation campaigns for public display. No authentication required. Returns featured campaigns first.
 *     responses:
 *       200:
 *         description: Donation campaigns retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     description: Donation campaign details (title, goal, progress, featured status)
 *       500:
 *         description: Server error - failed to fetch campaigns
 */
router.get('/campaigns', async (req: Request, res: Response) => {
  try {
    const campaigns = await prisma.donationCampaign.findMany({
      where: {
        isActive: true,
        OR: [
          { endDate: null },
          { endDate: { gt: new Date() } }
        ]
      },
      orderBy: [
        { featured: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    res.json({
      success: true,
      data: campaigns
    });
  } catch (error) {
    logger.error({ error }, 'Campaign fetch error');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaigns'
    });
  }
});

/**
 * @swagger
 * /api/payments/receipt/{paymentId}:
 *   get:
 *     tags: [Payment]
 *     summary: Get payment receipt
 *     description: Retrieves payment receipt for authenticated user. Generates receipt if not already created. Only user's own receipts are accessible.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment unique identifier
 *     responses:
 *       200:
 *         description: Receipt retrieved successfully
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
 *                     receiptUrl:
 *                       type: string
 *                       description: URL to PDF receipt
 *                     receiptNumber:
 *                       type: string
 *                       description: Unique receipt number for tax purposes
 *                     taxDeductible:
 *                       type: boolean
 *                       description: Whether payment is tax-deductible
 *                     amount:
 *                       type: integer
 *                       description: Payment amount in cents
 *                     date:
 *                       type: string
 *                       format: date-time
 *                       description: Payment processed date
 *       401:
 *         description: Unauthorized - authentication required
 *       404:
 *         description: Payment not found or not owned by user
 *       500:
 *         description: Server error - failed to generate receipt
 */
router.get('/receipt/:paymentId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;
    const userId = (req as AuthRequest).user!.id;

    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        userId // Ensure user can only access their own receipts
      }
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    if (!payment.receiptUrl) {
      // Generate receipt if not exists
      await StripeService.generateReceipt(paymentId);
      
      // Fetch updated payment
      const updatedPayment = await prisma.payment.findUnique({
        where: { id: paymentId }
      });

      return res.json({
        success: true,
        data: {
          receiptUrl: updatedPayment?.receiptUrl,
          receiptNumber: updatedPayment?.receiptNumber,
          taxDeductible: updatedPayment?.taxDeductible,
          amount: updatedPayment?.amount,
          date: updatedPayment?.processedAt
        }
      });
    }

    res.json({
      success: true,
      data: {
        receiptUrl: payment.receiptUrl,
        receiptNumber: payment.receiptNumber,
        taxDeductible: payment.taxDeductible,
        amount: payment.amount,
        date: payment.processedAt
      }
    });
  } catch (error) {
    logger.error({ error, paymentId: req.params.paymentId, userId: (req as AuthRequest).user?.id }, 'Receipt fetch error');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch receipt'
    });
  }
});

/**
 * @swagger
 * /api/payments/tax-summary/{year}:
 *   get:
 *     tags: [Payment]
 *     summary: Get annual tax summary
 *     description: Generates tax summary for all tax-deductible donations in specified year. Includes EIN and IRS compliance message for tax filing.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: year
 *         required: true
 *         schema:
 *           type: integer
 *         description: Tax year (e.g., 2025)
 *         example: 2025
 *     responses:
 *       200:
 *         description: Tax summary generated successfully
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
 *                     year:
 *                       type: integer
 *                       description: Tax year
 *                     totalDonations:
 *                       type: integer
 *                       description: Total amount donated in cents
 *                     donationCount:
 *                       type: integer
 *                       description: Number of donations made
 *                     donations:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           amount:
 *                             type: integer
 *                           date:
 *                             type: string
 *                             format: date-time
 *                           receiptNumber:
 *                             type: string
 *                           description:
 *                             type: string
 *                     taxMessage:
 *                       type: string
 *                       description: IRS tax-deductible message with EIN
 *       401:
 *         description: Unauthorized - authentication required
 *       500:
 *         description: Server error - failed to generate tax summary
 */
router.get('/tax-summary/:year', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user!.id;
    const rawYear = parseInt(req.params.year);
    const year = Number.isNaN(rawYear) || rawYear < 1900 || rawYear > 2100 ? new Date().getFullYear() : rawYear;

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year + 1, 0, 1);

    const donations = await prisma.payment.findMany({
      where: {
        userId,
        type: 'DONATION',
        taxDeductible: true,
        status: 'COMPLETED',
        processedAt: {
          gte: startDate,
          lt: endDate
        }
      },
      orderBy: { processedAt: 'asc' }
    });

    const totalAmount = donations.reduce((sum, payment) => sum + payment.amount, 0);

    res.json({
      success: true,
      data: {
        year,
        totalDonations: totalAmount,
        donationCount: donations.length,
        donations: donations.map(d => ({
          id: d.id,
          amount: d.amount,
          date: d.processedAt,
          receiptNumber: d.receiptNumber,
          description: d.description
        })),
        taxMessage: 'United We Rise is a registered 501(c)(3) nonprofit organization. Your donations are tax-deductible to the extent allowed by law. EIN: 99-2862201'
      }
    });
  } catch (error) {
    logger.error({ error, year: req.params.year, userId: (req as AuthRequest).user?.id }, 'Tax summary error');
    res.status(500).json({
      success: false,
      error: 'Failed to generate tax summary'
    });
  }
});

/**
 * @swagger
 * /api/payments/webhook:
 *   post:
 *     tags: [Payment]
 *     summary: Stripe webhook handler
 *     description: Handles Stripe webhook events for payment processing. Verifies Stripe signature for security. NO AUTHENTICATION REQUIRED (uses Stripe signature instead).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Stripe event payload (raw body required for signature verification)
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 received:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Invalid signature or webhook processing failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message (signature verification failure or event processing error)
 */
router.post('/webhook', 
  // Note: No auth middleware for webhooks
  express.raw({ type: 'application/json' }), // Important: raw body for signature verification
  async (req: AuthRequest, res: Response) => {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe signature' });
    }

    try {
      await StripeService.handleWebhook(signature, req.body);
      res.json({ received: true });
    } catch (error) {
      logger.error({ error, signature: !!signature }, 'Webhook error');
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Webhook processing failed'
      });
    }
  }
);

export default router;