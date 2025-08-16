"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const auth_1 = require("../utils/auth");
const auth_2 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const rateLimiting_1 = require("../middleware/rateLimiting");
const sessionManager_1 = require("../services/sessionManager");
const auth_3 = require("../utils/auth");
const emailService_1 = require("../services/emailService");
const captchaService_1 = require("../services/captchaService");
const metricsService_1 = require("../services/metricsService");
const securityService_1 = require("../services/securityService");
const crypto_1 = __importDefault(require("crypto"));
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Authentication]
 *     summary: Register a new user account
 *     description: Creates a new user account with email verification and optional phone verification
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - username
 *               - password
 *               - hcaptchaToken
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 30
 *                 pattern: '^[a-zA-Z0-9_]+$'
 *                 description: Unique username (letters, numbers, underscores only)
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 description: Password (min 8 chars, must include uppercase, lowercase, number, special char)
 *               firstName:
 *                 type: string
 *                 maxLength: 50
 *                 description: User's first name (optional)
 *               lastName:
 *                 type: string
 *                 maxLength: 50
 *                 description: User's last name (optional)
 *               phoneNumber:
 *                 type: string
 *                 pattern: '^[\+]?[1-9]\d{1,14}$'
 *                 description: Phone number in international format (optional)
 *               hcaptchaToken:
 *                 type: string
 *                 description: hCaptcha verification token
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Account created successfully. Please check your email to verify your account.
 *                 user:
 *                   allOf:
 *                     - $ref: '#/components/schemas/User'
 *                     - type: object
 *                       properties:
 *                         requiresEmailVerification:
 *                           type: boolean
 *                         requiresPhoneVerification:
 *                           type: boolean
 *                 token:
 *                   type: string
 *                   description: JWT authentication token
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 */
// Register
router.post('/register', rateLimiting_1.authLimiter, validation_1.validateRegistration, async (req, res) => {
    try {
        const { email, username, password, firstName, lastName, phoneNumber, hcaptchaToken, deviceFingerprint } = req.body;
        // Check if running in local development environment
        const isLocalDevelopment = process.env.NODE_ENV === 'development' ||
            req.ip === '127.0.0.1' ||
            req.ip === '::1' ||
            req.ip?.startsWith('192.168.') ||
            req.ip?.startsWith('10.') ||
            req.ip?.startsWith('172.16.') ||
            req.hostname === 'localhost';
        // Verify captcha (skip for local development)
        if (!isLocalDevelopment) {
            const captchaResult = await captchaService_1.captchaService.verifyCaptcha(hcaptchaToken, req.ip);
            if (!captchaResult.success) {
                return res.status(400).json({
                    error: 'Captcha verification failed. Please try again.',
                    captchaError: captchaResult.error
                });
            }
        }
        else {
            console.log('🔧 Local development detected: Bypassing hCaptcha verification');
            console.log(`   IP: ${req.ip}, NODE_ENV: ${process.env.NODE_ENV}`);
        }
        // Process device fingerprint for anti-bot protection
        let riskScore = 0;
        let deviceFingerprintData = null;
        if (deviceFingerprint) {
            riskScore = deviceFingerprint.riskScore || 0;
            deviceFingerprintData = {
                fingerprint: deviceFingerprint.fingerprint,
                riskScore,
                components: deviceFingerprint.components,
                userAgent: req.get('User-Agent'),
                ip: req.ip,
                timestamp: new Date()
            };
            // Log high-risk registrations for review
            if (riskScore > 30) {
                console.warn(`High-risk registration attempt: ${email}, risk score: ${riskScore}`, {
                    fingerprint: deviceFingerprint.fingerprint,
                    ip: req.ip,
                    userAgent: req.get('User-Agent')
                });
            }
        }
        // Check if user exists
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { email },
                    { username },
                    ...(phoneNumber ? [{ phoneNumber, phoneVerified: true }] : [])
                ]
            }
        });
        if (existingUser) {
            if (existingUser.email === email) {
                return res.status(400).json({ error: 'Email address is already registered' });
            }
            if (existingUser.username === username) {
                return res.status(400).json({ error: 'Username is already taken' });
            }
            if (phoneNumber && existingUser.phoneNumber === phoneNumber) {
                return res.status(400).json({ error: 'Phone number is already registered' });
            }
        }
        // Hash password
        const hashedPassword = await (0, auth_1.hashPassword)(password);
        // Generate email verification token
        const emailVerifyToken = crypto_1.default.randomBytes(32).toString('hex');
        const emailVerifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        // Create user
        const user = await prisma.user.create({
            data: {
                email,
                username,
                password: hashedPassword,
                firstName,
                lastName,
                phoneNumber: phoneNumber || null,
                emailVerifyToken,
                emailVerifyExpiry,
                embedding: [], // Empty array for future AI features
                deviceFingerprint: deviceFingerprintData,
                riskScore
            },
            select: {
                id: true,
                email: true,
                username: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
                emailVerified: true,
                phoneVerified: true,
                createdAt: true
            }
        });
        // Send verification email
        const emailTemplate = emailService_1.emailService.generateEmailVerificationTemplate(email, emailVerifyToken, firstName);
        const emailSent = await emailService_1.emailService.sendEmail(emailTemplate);
        if (!emailSent) {
            console.error('Failed to send verification email to:', email);
            // Don't fail registration if email fails, but log it
        }
        const token = (0, auth_1.generateToken)(user.id);
        // Track user registration metrics
        metricsService_1.metricsService.trackUserRegistration(user.id);
        if (emailSent) {
            metricsService_1.metricsService.trackEmailSent('verification', email);
        }
        res.status(201).json({
            message: 'Account created successfully. Please check your email to verify your account.',
            user: {
                ...user,
                requiresEmailVerification: !user.emailVerified,
                requiresPhoneVerification: !!phoneNumber && !user.phoneVerified
            },
            token
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Login
router.post('/login', rateLimiting_1.authLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;
        const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
        const userAgent = req.get('User-Agent') || 'unknown';
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        // Find user
        const user = await prisma.user.findUnique({
            where: { email }
        });
        if (!user) {
            // Log failed login attempt with unknown user
            await securityService_1.SecurityService.logEvent({
                eventType: securityService_1.SecurityService.EVENT_TYPES.LOGIN_FAILED,
                ipAddress,
                userAgent,
                details: {
                    email,
                    reason: 'User not found',
                    timestamp: new Date().toISOString()
                },
                riskScore: 30
            });
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        // Check if account is locked
        if (await securityService_1.SecurityService.isAccountLocked(user.id)) {
            await securityService_1.SecurityService.logEvent({
                userId: user.id,
                eventType: securityService_1.SecurityService.EVENT_TYPES.LOGIN_FAILED,
                ipAddress,
                userAgent,
                details: {
                    reason: 'Account locked',
                    timestamp: new Date().toISOString()
                },
                riskScore: 60
            });
            return res.status(423).json({
                error: 'Account temporarily locked due to multiple failed login attempts. Please try again later.'
            });
        }
        // Check if user has a password (OAuth-only users don't have passwords)
        if (!user.password) {
            // User only has OAuth providers linked, no password set
            await securityService_1.SecurityService.logEvent({
                userId: user.id,
                eventType: securityService_1.SecurityService.EVENT_TYPES.LOGIN_FAILED,
                ipAddress,
                userAgent,
                details: {
                    email,
                    reason: 'OAuth-only account, password not set',
                    timestamp: new Date().toISOString()
                },
                riskScore: 20
            });
            return res.status(401).json({
                error: 'This account was created with social login. Please sign in with Google, Microsoft, or Apple.',
                oauthOnly: true
            });
        }
        // Check password
        const isValidPassword = await (0, auth_1.comparePassword)(password, user.password);
        if (!isValidPassword) {
            // Handle failed login
            await securityService_1.SecurityService.handleFailedLogin(user.id, ipAddress, userAgent);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        // Successful login - handle security logging
        await securityService_1.SecurityService.handleSuccessfulLogin(user.id, ipAddress, userAgent);
        const token = (0, auth_1.generateToken)(user.id);
        // Record metrics
        metricsService_1.metricsService.incrementCounter('auth_attempts_total', { status: 'success' });
        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                isAdmin: user.isAdmin,
                isModerator: user.isModerator
            },
            token
        });
    }
    catch (error) {
        console.error('Login error:', error);
        // Log system error
        await securityService_1.SecurityService.logEvent({
            eventType: 'SYSTEM_ERROR',
            ipAddress: req.ip || 'unknown',
            userAgent: req.get('User-Agent') || 'unknown',
            details: {
                error: error.message,
                endpoint: '/api/auth/login',
                timestamp: new Date().toISOString()
            },
            riskScore: 40
        });
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get current user
router.get('/me', auth_2.requireAuth, async (req, res) => {
    res.json({ user: req.user });
});
// Forgot password
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }
        const user = await prisma.user.findUnique({
            where: { email }
        });
        if (!user) {
            // Don't reveal if email exists or not
            return res.json({ message: 'If the email exists, a reset link has been sent' });
        }
        const resetToken = (0, auth_1.generateResetToken)();
        const resetExpiry = new Date(Date.now() + 3600000); // 1 hour
        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetToken,
                resetExpiry
            }
        });
        // TODO: Send email with reset token
        console.log(`Reset token for ${email}: ${resetToken}`);
        res.json({ message: 'If the email exists, a reset link has been sent' });
    }
    catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Reset password
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Token and new password are required' });
        }
        const user = await prisma.user.findFirst({
            where: {
                resetToken: token,
                resetExpiry: {
                    gt: new Date()
                }
            }
        });
        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }
        const hashedPassword = await (0, auth_1.hashPassword)(newPassword);
        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetToken: null,
                resetExpiry: null
            }
        });
        res.json({ message: 'Password reset successful' });
    }
    catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Logout user (blacklist token)
router.post('/logout', auth_2.requireAuth, async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        const sessionId = req.header('X-Session-ID');
        if (token) {
            const decoded = (0, auth_3.verifyToken)(token);
            if (decoded) {
                // Calculate token expiration time
                const tokenExp = decoded.exp ? decoded.exp * 1000 : Date.now() + (7 * 24 * 60 * 60 * 1000);
                const tokenId = `${decoded.userId}_${token.slice(-10)}`;
                // Blacklist the token
                await sessionManager_1.sessionManager.blacklistToken(tokenId, tokenExp);
            }
        }
        // Revoke session if provided
        if (sessionId) {
            await sessionManager_1.sessionManager.revokeUserSession(sessionId);
        }
        res.json({ message: 'Logged out successfully' });
    }
    catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Logout failed' });
    }
});
// Debug endpoint to check test user data (local development only)
router.get('/debug-test-user', async (req, res) => {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development' && req.ip !== '127.0.0.1' && req.ip !== '::1') {
        return res.status(403).json({ error: 'Not allowed in production' });
    }
    try {
        const testUser = await prisma.user.findUnique({
            where: { email: 'test@test.com' },
            select: {
                id: true,
                email: true,
                username: true,
                firstName: true,
                lastName: true,
                emailVerified: true,
                verificationStatus: true,
                createdAt: true,
                updatedAt: true
            }
        });
        if (!testUser) {
            return res.json({ message: 'Test user not found', exists: false });
        }
        res.json({
            message: 'Test user data',
            exists: true,
            user: testUser,
            hasFirstName: !!testUser.firstName,
            hasLastName: !!testUser.lastName
        });
    }
    catch (error) {
        console.error('Error checking test user:', error);
        res.status(500).json({ error: 'Failed to check test user' });
    }
});
// Create test user endpoint (local development only)
router.post('/create-test-user', async (req, res) => {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development' && req.ip !== '127.0.0.1' && req.ip !== '::1') {
        return res.status(403).json({ error: 'Not allowed in production' });
    }
    try {
        const hashedPassword = await (0, auth_1.hashPassword)('test123');
        // Always update the test user to ensure it has all fields
        const testUser = await prisma.user.upsert({
            where: { email: 'test@test.com' },
            update: {
                firstName: 'Test',
                lastName: 'User',
                username: 'testuser',
                emailVerified: true,
                verificationStatus: 'NOT_REQUIRED'
            },
            create: {
                email: 'test@test.com',
                username: 'testuser',
                password: hashedPassword,
                firstName: 'Test',
                lastName: 'User',
                emailVerified: true,
                verificationStatus: 'NOT_REQUIRED'
            }
        });
        res.json({
            message: 'Test user created/updated',
            credentials: {
                email: 'test@test.com',
                password: 'test123'
            }
        });
    }
    catch (error) {
        console.error('Error creating test user:', error);
        res.status(500).json({ error: 'Failed to create test user' });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map