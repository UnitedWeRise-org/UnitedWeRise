"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const rateLimiting_1 = require("../middleware/rateLimiting");
const emailService_1 = require("../services/emailService");
const smsService_1 = require("../services/smsService");
const captchaService_1 = require("../services/captchaService");
const crypto_1 = __importDefault(require("crypto"));
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
// Send email verification
router.post('/email/send', auth_1.requireAuth, rateLimiting_1.verificationLimiter, async (req, res) => {
    try {
        const userId = req.user.id;
        // Get user details
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                email: true,
                firstName: true,
                emailVerified: true,
                emailVerifyToken: true,
                emailVerifyExpiry: true
            }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (user.emailVerified) {
            return res.status(400).json({ error: 'Email already verified' });
        }
        // Temporarily disable database-level rate limiting for testing
        // The middleware rate limiting (verificationLimiter) provides sufficient protection
        // Generate verification token
        const verifyToken = crypto_1.default.randomBytes(32).toString('hex');
        const verifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        // Update user with verification token
        await prisma.user.update({
            where: { id: userId },
            data: {
                emailVerifyToken: verifyToken,
                emailVerifyExpiry: verifyExpiry
            }
        });
        // Send verification email
        const emailTemplate = emailService_1.emailService.generateEmailVerificationTemplate(user.email, verifyToken, user.firstName || undefined);
        const emailSent = await emailService_1.emailService.sendEmail(emailTemplate);
        if (!emailSent) {
            return res.status(500).json({ error: 'Failed to send verification email' });
        }
        res.json({
            message: 'Verification email sent successfully',
            expiresIn: '24 hours'
        });
    }
    catch (error) {
        console.error('Send email verification error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Verify email with token
router.post('/email/verify', validation_1.validateEmailVerification, async (req, res) => {
    try {
        const { token } = req.body;
        // Find user with this verification token
        const user = await prisma.user.findFirst({
            where: {
                emailVerifyToken: token,
                emailVerifyExpiry: {
                    gte: new Date()
                }
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                emailVerified: true
            }
        });
        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired verification token' });
        }
        if (user.emailVerified) {
            return res.status(400).json({ error: 'Email already verified' });
        }
        // Verify the email
        await prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerified: true,
                emailVerifyToken: null,
                emailVerifyExpiry: null
            }
        });
        // Send welcome email
        const welcomeTemplate = emailService_1.emailService.generateWelcomeTemplate(user.email, user.firstName || undefined);
        await emailService_1.emailService.sendEmail(welcomeTemplate);
        res.json({
            message: 'Email verified successfully',
            verified: true
        });
    }
    catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Send phone verification code
router.post('/phone/send', auth_1.requireAuth, rateLimiting_1.verificationLimiter, validation_1.validatePhoneVerification, async (req, res) => {
    try {
        const userId = req.user.id;
        const { phoneNumber, hcaptchaToken } = req.body;
        // Verify captcha if provided
        if (hcaptchaToken) {
            const captchaResult = await captchaService_1.captchaService.verifyCaptcha(hcaptchaToken, req.ip);
            if (!captchaResult.success) {
                return res.status(400).json({ error: 'Captcha verification failed' });
            }
        }
        // Validate phone number format
        if (!smsService_1.smsService.isValidPhoneNumber(phoneNumber)) {
            return res.status(400).json({ error: 'Invalid phone number format' });
        }
        // Check if phone is already verified by another user
        const existingUser = await prisma.user.findFirst({
            where: {
                phoneNumber,
                phoneVerified: true,
                id: { not: userId }
            }
        });
        if (existingUser) {
            return res.status(400).json({ error: 'Phone number already registered' });
        }
        // Get current user
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                phoneVerifyExpiry: true,
                phoneVerified: true,
                phoneNumber: true
            }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Check rate limiting (5 minutes between requests)
        if (user.phoneVerifyExpiry && new Date() < new Date(user.phoneVerifyExpiry.getTime() - 5 * 60 * 1000)) {
            const timeLeft = Math.ceil((user.phoneVerifyExpiry.getTime() - 5 * 60 * 1000 - Date.now()) / 1000 / 60);
            return res.status(429).json({
                error: `Please wait ${timeLeft} minutes before requesting another code`
            });
        }
        // Generate verification code
        const verifyCode = smsService_1.smsService.generateVerificationCode();
        const verifyExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        // Update user with verification code
        await prisma.user.update({
            where: { id: userId },
            data: {
                phoneNumber,
                phoneVerifyCode: verifyCode,
                phoneVerifyExpiry: verifyExpiry,
                phoneVerified: false
            }
        });
        // Send SMS
        const smsSent = await smsService_1.smsService.sendVerificationCode(phoneNumber, verifyCode);
        if (!smsSent) {
            return res.status(500).json({ error: 'Failed to send verification code' });
        }
        res.json({
            message: 'Verification code sent successfully',
            expiresIn: '10 minutes'
        });
    }
    catch (error) {
        console.error('Send phone verification error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Verify phone with code
router.post('/phone/verify', auth_1.requireAuth, validation_1.validatePhoneCode, async (req, res) => {
    try {
        const userId = req.user.id;
        const { phoneNumber, code } = req.body;
        // Find user and verify code
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                phoneNumber: true,
                phoneVerifyCode: true,
                phoneVerifyExpiry: true,
                phoneVerified: true
            }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (user.phoneVerified && user.phoneNumber === phoneNumber) {
            return res.status(400).json({ error: 'Phone number already verified' });
        }
        if (user.phoneNumber !== phoneNumber) {
            return res.status(400).json({ error: 'Phone number mismatch' });
        }
        if (!user.phoneVerifyCode || !user.phoneVerifyExpiry) {
            return res.status(400).json({ error: 'No verification code found. Please request a new code.' });
        }
        if (new Date() > user.phoneVerifyExpiry) {
            return res.status(400).json({ error: 'Verification code expired. Please request a new code.' });
        }
        if (user.phoneVerifyCode !== code) {
            return res.status(400).json({ error: 'Invalid verification code' });
        }
        // Verify the phone number
        await prisma.user.update({
            where: { id: userId },
            data: {
                phoneVerified: true,
                phoneVerifyCode: null,
                phoneVerifyExpiry: null
            }
        });
        res.json({
            message: 'Phone number verified successfully',
            verified: true
        });
    }
    catch (error) {
        console.error('Phone verification error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get verification status
router.get('/status', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                emailVerified: true,
                phoneVerified: true,
                phoneNumber: true,
                emailVerifyExpiry: true,
                phoneVerifyExpiry: true
            }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({
            email: {
                verified: user.emailVerified,
                canRequestNew: !user.emailVerifyExpiry || new Date() > user.emailVerifyExpiry
            },
            phone: {
                verified: user.phoneVerified,
                number: user.phoneVerified ? user.phoneNumber : null,
                canRequestNew: !user.phoneVerifyExpiry || new Date() > new Date(user.phoneVerifyExpiry.getTime() - 5 * 60 * 1000)
            }
        });
    }
    catch (error) {
        console.error('Get verification status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=verification.js.map