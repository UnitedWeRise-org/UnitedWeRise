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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../lib/prisma");
const express_1 = __importDefault(require("express"));
;
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
const environment_1 = require("../utils/environment");
const emailNormalization_1 = require("../utils/emailNormalization");
const crypto_1 = __importDefault(require("crypto"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const speakeasy = __importStar(require("speakeasy"));
const router = express_1.default.Router();
// Using singleton prisma from lib/prisma.ts
/**
 * Debug logging helper - only logs in development/staging environments
 * Prevents verbose debugging logs in production
 */
const debugLog = (...args) => {
    if ((0, environment_1.isDevelopment)()) {
        console.log(...args);
    }
};
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
        // Verify captcha (skip for development environment)
        if ((0, environment_1.requiresCaptcha)()) {
            const captchaResult = await captchaService_1.captchaService.verifyCaptcha(hcaptchaToken, req.ip);
            if (!captchaResult.success) {
                return res.status(400).json({
                    error: 'Captcha verification failed. Please try again.',
                    captchaError: captchaResult.error
                });
            }
        }
        else if ((0, environment_1.enableRequestLogging)()) {
            console.log('🔧 Development environment detected: Bypassing hCaptcha verification');
            console.log(`   IP: ${req.ip}`);
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
        // Check if user exists with exact match
        const existingUser = await prisma_1.prisma.user.findFirst({
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
        // Check for normalized email duplicates (prevents Gmail variants like jeffrey.a.benson@gmail.com vs jeffreyabenson@gmail.com)
        const normalizedEmail = (0, emailNormalization_1.normalizeEmail)(email);
        const allUsers = await prisma_1.prisma.user.findMany({
            select: { email: true }
        });
        const hasNormalizedDuplicate = allUsers.some(user => (0, emailNormalization_1.normalizeEmail)(user.email) === normalizedEmail);
        if (hasNormalizedDuplicate) {
            return res.status(400).json({
                error: 'An account with this email address already exists. If you previously signed up with Google, please use the Google sign-in button.',
                suggestion: 'oauth'
            });
        }
        // Hash password
        const hashedPassword = await (0, auth_1.hashPassword)(password);
        // Generate email verification token
        const emailVerifyToken = crypto_1.default.randomBytes(32).toString('hex');
        const emailVerifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        // Create user
        const user = await prisma_1.prisma.user.create({
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
        // Set httpOnly authentication cookie (matching login pattern)
        res.cookie('authToken', token, {
            httpOnly: true,
            secure: (0, environment_1.requireSecureCookies)(),
            sameSite: 'none', // Required for cross-subdomain auth (dev.unitedwerise.org → dev-api.unitedwerise.org)
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
            path: '/',
            domain: '.unitedwerise.org' // Allow sharing between www and api subdomains
        });
        // Generate and set CSRF token
        const csrfToken = require('crypto').randomBytes(32).toString('hex');
        res.cookie('csrf-token', csrfToken, {
            httpOnly: false, // CSRF token needs to be readable by JavaScript
            secure: (0, environment_1.requireSecureCookies)(),
            sameSite: 'none',
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
            path: '/',
            domain: '.unitedwerise.org'
        });
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
            csrfToken // Return CSRF token for frontend use (not JWT token)
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
        const user = await prisma_1.prisma.user.findUnique({
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
                error: 'This account was created with social login. Please sign in with Google.',
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
        // Check if user has TOTP enabled (using same query pattern as working status endpoint)
        const userData = await prisma_1.prisma.user.findUnique({
            where: { id: user.id },
            select: {
                totpEnabled: true,
                totpSecret: true,
                totpLastUsedAt: true,
                totpSetupAt: true,
                totpBackupCodes: true
            }
        });
        // Additional check: Try the exact same query as the working status endpoint
        const statusCheck = await prisma_1.prisma.user.findUnique({
            where: { id: user.id },
            select: {
                totpEnabled: true,
                totpSetupAt: true,
                totpBackupCodes: true
            }
        });
        debugLog(`🔍 Status endpoint style query result:`, statusCheck);
        // Debug: Add TOTP status to response for testing
        const totpDebug = {
            userId: user.id,
            userDataExists: !!userData,
            userData: userData,
            totpEnabled: userData?.totpEnabled,
            hasSecret: !!userData?.totpSecret,
            totpLastUsedAt: userData?.totpLastUsedAt
        };
        debugLog(`🔍 TOTP Debug for ${user.email}:`, totpDebug);
        debugLog(`🔍 Raw userData query result:`, userData);
        debugLog(`🔍 TOTP Check: userData exists=${!!userData}, totpEnabled=${userData?.totpEnabled}`);
        // Use statusCheck result as authoritative since that logic works
        const actualTotpEnabled = statusCheck?.totpEnabled || false;
        debugLog(`🔍 Using statusCheck result: totpEnabled=${actualTotpEnabled}`);
        if (actualTotpEnabled && userData?.totpSecret) {
            debugLog(`🔍 TOTP Required: User ${user.email} has TOTP enabled`);
            const { totpToken } = req.body;
            // Require TOTP verification
            if (!totpToken) {
                debugLog(`🔍 TOTP Token Missing: Requiring TOTP for user ${user.email}`);
                return res.status(200).json({
                    requiresTOTP: true,
                    message: 'Two-factor authentication required',
                    userId: user.id, // Temporary ID for TOTP verification
                    totpDebug: { ...totpDebug, requiresTOTP: true, reason: 'No TOTP token provided' }
                });
            }
            // Verify TOTP token
            if (!userData.totpSecret) {
                return res.status(500).json({ error: 'TOTP configuration error' });
            }
            const validTOTP = speakeasy.totp.verify({
                secret: userData.totpSecret,
                encoding: 'base32',
                token: totpToken,
                window: 2
            });
            if (!validTOTP) {
                await securityService_1.SecurityService.handleFailedLogin(user.id, ipAddress, userAgent);
                return res.status(401).json({ error: 'Invalid TOTP token' });
            }
            await prisma_1.prisma.user.update({
                where: { id: user.id },
                data: { totpLastUsedAt: new Date() }
            });
            // Successful login with TOTP
            await securityService_1.SecurityService.handleSuccessfulLogin(user.id, ipAddress, userAgent);
            const token = (0, auth_1.generateToken)(user.id, true); // TOTP verified
            metricsService_1.metricsService.incrementCounter('auth_attempts_total', { status: 'success', totp: 'verified' });
            metricsService_1.metricsService.incrementCounter('cookie_auth_success_total', { method: 'totp_verified' });
            // Set httpOnly cookie for auth token
            res.cookie('authToken', token, {
                httpOnly: true,
                secure: (0, environment_1.requireSecureCookies)(),
                sameSite: 'none', // Required for cross-subdomain auth (dev.unitedwerise.org → dev-api.unitedwerise.org)
                maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
                path: '/',
                domain: '.unitedwerise.org' // Allow sharing between www and api subdomains
            });
            // Generate and set CSRF token
            const csrfToken = require('crypto').randomBytes(32).toString('hex');
            res.cookie('csrf-token', csrfToken, {
                httpOnly: false, // Needs to be readable by JS
                secure: (0, environment_1.requireSecureCookies)(),
                sameSite: 'none', // Required for cross-subdomain auth (dev.unitedwerise.org → dev-api.unitedwerise.org)
                maxAge: 30 * 24 * 60 * 60 * 1000,
                path: '/',
                domain: '.unitedwerise.org' // Allow sharing between www and api subdomains
            });
            return res.json({
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
                csrfToken,
                totpVerified: true // Simple flag for frontend
            });
        }
        // No TOTP required - regular login
        await securityService_1.SecurityService.handleSuccessfulLogin(user.id, ipAddress, userAgent);
        const token = (0, auth_1.generateToken)(user.id);
        metricsService_1.metricsService.incrementCounter('auth_attempts_total', { status: 'success' });
        metricsService_1.metricsService.incrementCounter('cookie_auth_success_total', { method: 'regular' });
        // Set httpOnly cookie for auth token
        res.cookie('authToken', token, {
            httpOnly: true,
            secure: (0, environment_1.requireSecureCookies)(),
            sameSite: 'none', // Required for cross-subdomain auth (dev.unitedwerise.org → dev-api.unitedwerise.org)
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
            path: '/',
            domain: '.unitedwerise.org' // Allow sharing between www and api subdomains
        });
        // Generate and set CSRF token
        const csrfToken = require('crypto').randomBytes(32).toString('hex');
        res.cookie('csrf-token', csrfToken, {
            httpOnly: false, // Needs to be readable by JS
            secure: (0, environment_1.requireSecureCookies)(),
            sameSite: 'none', // Required for cross-subdomain auth (dev.unitedwerise.org → dev-api.unitedwerise.org)
            maxAge: 30 * 24 * 60 * 60 * 1000,
            path: '/',
            domain: '.unitedwerise.org' // Allow sharing between www and api subdomains
        });
        res.json({
            message: 'Login successful',
            totpDebug: totpDebug, // Temporary debug info
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                isAdmin: user.isAdmin,
                isModerator: user.isModerator
            },
            csrfToken
            // Token is in httpOnly cookie only (not exposed to JavaScript)
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
    res.json({ success: true, data: req.user });
});
// Forgot password
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: { email }
        });
        if (!user) {
            // Don't reveal if email exists or not
            return res.json({ message: 'If the email exists, a reset link has been sent' });
        }
        const resetToken = (0, auth_1.generateResetToken)();
        const resetExpiry = new Date(Date.now() + 3600000); // 1 hour
        await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: {
                resetToken,
                resetExpiry
            }
        });
        // Send password reset email
        const emailTemplate = emailService_1.emailService.generatePasswordResetTemplate(email, resetToken, user.firstName);
        const emailSent = await emailService_1.emailService.sendEmail(emailTemplate);
        if (!emailSent) {
            // Log failure but don't expose to user (prevents email enumeration)
            console.error('Failed to send password reset email to:', email);
        }
        else {
            // Track successful email send
            metricsService_1.metricsService.trackEmailSent('password_reset', email);
        }
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
        const user = await prisma_1.prisma.user.findFirst({
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
        await prisma_1.prisma.user.update({
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
        // Get token from cookie first, fallback to header for transition period
        let token = req.cookies?.authToken;
        if (!token) {
            token = req.header('Authorization')?.replace('Bearer ', '');
        }
        const sessionId = req.header('X-Session-ID');
        if (token) {
            const decoded = (0, auth_3.verifyToken)(token);
            if (decoded) {
                // Calculate token expiration time
                const tokenExp = decoded.exp ? decoded.exp * 1000 : Date.now() + (7 * 24 * 60 * 60 * 1000);
                // SECURITY FIX: Use SHA-256 hash of token for blacklisting (matches authMiddleware.ts)
                // This ensures logout properly blacklists tokens and prevents token reuse
                const tokenId = crypto_1.default.createHash('sha256').update(token).digest('hex');
                // Blacklist the token
                await sessionManager_1.sessionManager.blacklistToken(tokenId, tokenExp);
            }
        }
        // Revoke session if provided
        if (sessionId) {
            await sessionManager_1.sessionManager.revokeUserSession(sessionId);
        }
        // Clear all authentication cookies with the same options they were set with
        const httpOnlyCookieOptions = {
            httpOnly: true, // MUST match login cookie settings for authToken
            secure: (0, environment_1.requireSecureCookies)(),
            sameSite: 'none', // MUST match login cookie settings
            path: '/',
            domain: '.unitedwerise.org' // MUST match login cookie settings
        };
        const nonHttpOnlyCookieOptions = {
            httpOnly: false, // MUST match login cookie settings for csrf-token
            secure: (0, environment_1.requireSecureCookies)(),
            sameSite: 'none', // MUST match login cookie settings
            path: '/',
            domain: '.unitedwerise.org'
        };
        res.clearCookie('authToken', httpOnlyCookieOptions);
        res.clearCookie('csrf-token', nonHttpOnlyCookieOptions);
        res.json({ message: 'Logged out successfully' });
    }
    catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Logout failed' });
    }
});
// Token refresh endpoint
router.post('/refresh', async (req, res) => {
    const startTime = Date.now();
    const ipAddress = req.ip || 'unknown';
    try {
        const token = req.cookies?.authToken;
        if (!token) {
            console.log(`🔄 Token refresh failed: No token provided (IP: ${ipAddress})`);
            return res.status(401).json({ error: 'No token provided' });
        }
        try {
            const decoded = (0, auth_3.verifyToken)(token);
            if (!decoded || !decoded.userId) {
                console.log(`🔄 Token refresh failed: Invalid token (IP: ${ipAddress})`);
                return res.status(401).json({ error: 'Invalid token' });
            }
            // Verify user still exists and get admin status
            const user = await prisma_1.prisma.user.findUnique({
                where: { id: decoded.userId },
                select: {
                    id: true,
                    email: true,
                    username: true,
                    isAdmin: true,
                    isModerator: true,
                    isSuperAdmin: true
                }
            });
            if (!user) {
                console.log(`🔄 Token refresh failed: User not found (userId: ${decoded.userId}, IP: ${ipAddress})`);
                return res.status(401).json({ error: 'User not found' });
            }
            // DIAGNOSTIC: Log token refresh details
            const totpVerifiedStatus = decoded.totpVerified || false;
            console.log(`🔄 Token refresh for ${user.username}:`, {
                userId: user.id,
                isAdmin: user.isAdmin,
                isModerator: user.isModerator,
                totpVerifiedInOldToken: decoded.totpVerified,
                totpVerifiedInNewToken: totpVerifiedStatus,
                ipAddress
            });
            // Generate new token - preserve TOTP verification status from old token
            const newToken = (0, auth_1.generateToken)(decoded.userId, totpVerifiedStatus);
            // Set new httpOnly cookie
            res.cookie('authToken', newToken, {
                httpOnly: true,
                secure: (0, environment_1.requireSecureCookies)(),
                sameSite: 'none', // Required for cross-subdomain auth (dev.unitedwerise.org → dev-api.unitedwerise.org)
                maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
                path: '/',
                domain: '.unitedwerise.org' // Allow sharing between www and api subdomains
            });
            // Generate new CSRF token
            const csrfToken = require('crypto').randomBytes(32).toString('hex');
            res.cookie('csrf-token', csrfToken, {
                httpOnly: false,
                secure: (0, environment_1.requireSecureCookies)(),
                sameSite: 'none', // Required for cross-subdomain auth (dev.unitedwerise.org → dev-api.unitedwerise.org)
                maxAge: 30 * 24 * 60 * 60 * 1000,
                path: '/',
                domain: '.unitedwerise.org' // Allow sharing between www and api subdomains
            });
            const duration = Date.now() - startTime;
            console.log(`✅ Token refreshed successfully for user ${user.username || user.email} (userId: ${user.id}, IP: ${ipAddress}, duration: ${duration}ms)`);
            res.json({
                success: true,
                csrfToken
            });
        }
        catch (tokenError) {
            console.log(`🔄 Token refresh failed: Token verification error (IP: ${ipAddress})`, tokenError);
            return res.status(401).json({ error: 'Invalid token' });
        }
    }
    catch (error) {
        console.error(`❌ Token refresh error (IP: ${ipAddress}):`, error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Debug endpoint to check test user data (local development only)
router.get('/debug-test-user', async (req, res) => {
    // Only allow in development
    if ((0, environment_1.requiresCaptcha)()) {
        return res.status(403).json({ error: 'Not allowed in production' });
    }
    try {
        const testUser = await prisma_1.prisma.user.findUnique({
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
// Verify password for sensitive operations
router.post('/verify-password', auth_2.requireAuth, async (req, res) => {
    try {
        const { password } = req.body;
        const userId = req.user.id;
        if (!password) {
            return res.status(400).json({ error: 'Password is required' });
        }
        // Get user's current password hash
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: { password: true }
        });
        if (!user || !user.password) {
            return res.status(400).json({ error: 'User account not found or has no password set' });
        }
        // Verify the provided password
        const isValid = await bcryptjs_1.default.compare(password, user.password);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid password' });
        }
        // Return a verification token (timestamp for simple implementation)
        res.json({
            success: true,
            token: Date.now().toString(),
            message: 'Password verified successfully'
        });
    }
    catch (error) {
        console.error('Password verification error:', error);
        res.status(500).json({ error: 'Failed to verify password' });
    }
});
// Create test user endpoint (local development only)
router.post('/create-test-user', async (req, res) => {
    // Only allow in development
    if ((0, environment_1.requiresCaptcha)()) {
        return res.status(403).json({ error: 'Not allowed in production' });
    }
    try {
        const hashedPassword = await (0, auth_1.hashPassword)('test123');
        // Always update the test user to ensure it has all fields
        const testUser = await prisma_1.prisma.user.upsert({
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
// Check username availability
router.post('/check-username', async (req, res) => {
    try {
        const { username } = req.body;
        if (!username || username.length < 3) {
            return res.status(400).json({ error: 'Username must be at least 3 characters' });
        }
        // Check if username exists
        const existingUser = await prisma_1.prisma.user.findUnique({
            where: { username }
        });
        res.json({ available: !existingUser });
    }
    catch (error) {
        console.error('Username check error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Check email availability
router.post('/check-email', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email || !email.includes('@')) {
            return res.status(400).json({ error: 'Invalid email format' });
        }
        const normalizedEmail = (0, emailNormalization_1.normalizeEmail)(email);
        // Check for both exact match and normalized match
        // This prevents duplicate accounts from Gmail variants (e.g., jeffrey.a.benson@gmail.com vs jeffreyabenson@gmail.com)
        const allUsers = await prisma_1.prisma.user.findMany({
            select: { email: true }
        });
        const hasDuplicate = allUsers.some(user => (0, emailNormalization_1.normalizeEmail)(user.email) === normalizedEmail);
        res.json({ available: !hasDuplicate });
    }
    catch (error) {
        console.error('Email check error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Complete onboarding for OAuth users (select username)
router.post('/complete-onboarding', auth_2.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { username } = req.body;
        // Validate username
        if (!username || username.length < 3 || username.length > 30) {
            return res.status(400).json({ error: 'Username must be between 3 and 30 characters' });
        }
        // Check username format (alphanumeric and underscores only)
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores' });
        }
        // Check if username is available
        const existingUser = await prisma_1.prisma.user.findUnique({
            where: { username }
        });
        if (existingUser && existingUser.id !== userId) {
            return res.status(400).json({ error: 'Username is already taken' });
        }
        // Update user with selected username and mark onboarding as complete
        const updatedUser = await prisma_1.prisma.user.update({
            where: { id: userId },
            data: {
                username,
                onboardingCompleted: true
            },
            select: {
                id: true,
                email: true,
                username: true,
                firstName: true,
                lastName: true,
                avatar: true,
                onboardingCompleted: true
            }
        });
        res.json({
            success: true,
            message: 'Onboarding completed successfully',
            user: updatedUser
        });
    }
    catch (error) {
        console.error('Complete onboarding error:', error);
        res.status(500).json({ error: 'Failed to complete onboarding' });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map