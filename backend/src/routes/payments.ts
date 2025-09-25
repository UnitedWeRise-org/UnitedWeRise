import express, { Router, Response, Request } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { StripeService } from '../services/stripeService';
import { DonationType, FeeType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { body, validationResult } from 'express-validator';

const router = Router();
// Using singleton prisma from lib/prisma.ts

/**
 * Create a tax-deductible donation
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
      console.error('Donation creation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create donation'
      });
    }
  }
);

/**
 * Create a non-deductible fee payment
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
      console.error('Fee payment creation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create payment'
      });
    }
  }
);

/**
 * Get user's payment history
 */
router.get('/history', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user!.id;
    const { type, limit = 10, offset = 0 } = req.query;

    const where: any = { userId };
    if (type) {
      where.type = type;
    }

    const payments = await prisma.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset),
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
        hasMore: Number(offset) + payments.length < total
      }
    });
  } catch (error) {
    console.error('Payment history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment history'
    });
  }
});

/**
 * Get donation campaigns
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
    console.error('Campaign fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaigns'
    });
  }
});

/**
 * Get payment receipt
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
    console.error('Receipt fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch receipt'
    });
  }
});

/**
 * Get tax summary for user (for tax-deductible donations)
 */
router.get('/tax-summary/:year', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthRequest).user!.id;
    const year = parseInt(req.params.year);

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
    console.error('Tax summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate tax summary'
    });
  }
});

/**
 * Stripe webhook endpoint
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
      console.error('Webhook error:', error);
      res.status(400).json({ 
        error: error instanceof Error ? error.message : 'Webhook processing failed' 
      });
    }
  }
);

export default router;