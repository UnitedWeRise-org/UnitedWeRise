"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importStar(require("express"));
const auth_1 = require("../middleware/auth");
const stripeService_1 = require("../services/stripeService");
const prisma_1 = require("../lib/prisma");
const express_validator_1 = require("express-validator");
const router = (0, express_1.Router)();
// Using singleton prisma from lib/prisma.ts
/**
 * Create a tax-deductible donation
 */
router.post('/donation', auth_1.requireAuth, [
    (0, express_validator_1.body)('amount').isInt({ min: 100 }).withMessage('Minimum donation is $1.00'),
    (0, express_validator_1.body)('donationType').isIn(['ONE_TIME', 'RECURRING', 'CAMPAIGN_SPECIFIC', 'GENERAL_SUPPORT', 'MEMORIAL', 'HONOR']),
    (0, express_validator_1.body)('recurringInterval').optional().isIn(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'])
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const userId = req.user.id;
        const { amount, donationType, campaignId, isRecurring, recurringInterval } = req.body;
        const result = await stripeService_1.StripeService.createDonation({
            userId,
            amount,
            donationType: donationType,
            campaignId,
            isRecurring,
            recurringInterval
        });
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error('Donation creation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create donation'
        });
    }
});
/**
 * Create a non-deductible fee payment
 */
router.post('/fee', auth_1.requireAuth, [
    (0, express_validator_1.body)('amount').isInt({ min: 100 }).withMessage('Minimum fee is $1.00'),
    (0, express_validator_1.body)('feeType').isIn(['CANDIDATE_REGISTRATION', 'VERIFICATION_FEE', 'PREMIUM_FEATURES', 'EVENT_HOSTING', 'ADVERTISING', 'OTHER'])
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const userId = req.user.id;
        const { amount, feeType, candidateRegistrationId, description } = req.body;
        const result = await stripeService_1.StripeService.createFeePayment({
            userId,
            amount,
            feeType: feeType,
            candidateRegistrationId,
            description
        });
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error('Fee payment creation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create payment'
        });
    }
});
/**
 * Get user's payment history
 */
router.get('/history', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { type, limit = 10, offset = 0 } = req.query;
        const where = { userId };
        if (type) {
            where.type = type;
        }
        const payments = await prisma_1.prisma.payment.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: Number(limit),
            skip: Number(offset),
            include: {
                refunds: true
            }
        });
        const total = await prisma_1.prisma.payment.count({ where });
        res.json({
            success: true,
            data: {
                payments,
                total,
                hasMore: Number(offset) + payments.length < total
            }
        });
    }
    catch (error) {
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
router.get('/campaigns', async (req, res) => {
    try {
        const campaigns = await prisma_1.prisma.donationCampaign.findMany({
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
    }
    catch (error) {
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
router.get('/receipt/:paymentId', auth_1.requireAuth, async (req, res) => {
    try {
        const { paymentId } = req.params;
        const userId = req.user.id;
        const payment = await prisma_1.prisma.payment.findFirst({
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
            await stripeService_1.StripeService.generateReceipt(paymentId);
            // Fetch updated payment
            const updatedPayment = await prisma_1.prisma.payment.findUnique({
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
    }
    catch (error) {
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
router.get('/tax-summary/:year', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const year = parseInt(req.params.year);
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year + 1, 0, 1);
        const donations = await prisma_1.prisma.payment.findMany({
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
                taxMessage: 'United We Rise is a registered 501(c)(3) nonprofit organization. Your donations are tax-deductible to the extent allowed by law. EIN: XX-XXXXXXX'
            }
        });
    }
    catch (error) {
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
express_1.default.raw({ type: 'application/json' }), // Important: raw body for signature verification
async (req, res) => {
    const signature = req.headers['stripe-signature'];
    if (!signature) {
        return res.status(400).json({ error: 'Missing stripe signature' });
    }
    try {
        await stripeService_1.StripeService.handleWebhook(signature, req.body);
        res.json({ received: true });
    }
    catch (error) {
        console.error('Webhook error:', error);
        res.status(400).json({
            error: error instanceof Error ? error.message : 'Webhook processing failed'
        });
    }
});
exports.default = router;
//# sourceMappingURL=payments.js.map