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
const cookies_1 = require("../utils/cookies");
const crypto_1 = __importDefault(require("crypto"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const speakeasy = __importStar(require("speakeasy"));
const router = express_1.default.Router();
// Using singleton prisma from lib/prisma.ts
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
        else {
            req.log.debug({ ip: req.ip }, 'Development environment detected: Bypassing hCaptcha verification');
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
                req.log.warn({
                    email,
                    riskScore,
                    fingerprint: deviceFingerprint.fingerprint,
                    ip: req.ip,
                    userAgent: req.get('User-Agent')
                }, 'High-risk registration attempt detected');
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
            req.log.error({ email }, 'Failed to send verification email');
            // Don't fail registration if email fails, but log it
        }
        const token = (0, auth_1.generateToken)(user.id);
        // Generate and store refresh token (30 days, no "Remember Me" on registration)
        const refreshToken = (0, auth_1.generateRefreshToken)();
        const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
        const userAgent = req.get('User-Agent') || 'unknown';
        const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
        await sessionManager_1.sessionManager.storeRefreshToken(user.id, refreshToken, refreshExpiresAt, { userAgent, ipAddress }, false // rememberMe = false for registration
        );
        // Set httpOnly authentication cookie (30 minutes)
        res.cookie(cookies_1.COOKIE_NAMES.AUTH_TOKEN, token, {
            httpOnly: true,
            secure: (0, environment_1.requireSecureCookies)(),
            sameSite: 'none', // Required for cross-subdomain auth (dev.unitedwerise.org → dev-api.unitedwerise.org)
            maxAge: 30 * 60 * 1000, // 30 minutes
            path: '/',
            domain: '.unitedwerise.org' // Allow sharing between www and api subdomains
        });
        // Set httpOnly refresh token cookie (30 days)
        res.cookie(cookies_1.COOKIE_NAMES.REFRESH_TOKEN, refreshToken, {
            httpOnly: true,
            secure: (0, environment_1.requireSecureCookies)(),
            sameSite: 'none',
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
            path: '/',
            domain: '.unitedwerise.org'
        });
        // Generate and set CSRF token
        const csrfToken = crypto_1.default.randomBytes(32).toString('hex');
        res.cookie(cookies_1.COOKIE_NAMES.CSRF_TOKEN, csrfToken, {
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
        req.log.error({ error, email: req.body?.email }, 'Registration error');
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Login
router.post('/login', rateLimiting_1.authLimiter, async (req, res) => {
    try {
        const { email, password, rememberMe } = req.body;
        const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
        const userAgent = req.get('User-Agent') || 'unknown';
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        // Find user (with Gmail normalization support)
        // Gmail ignores dots in addresses, so ashley.m.oberry@gmail.com = ashleymoberry@gmail.com
        let user = await prisma_1.prisma.user.findUnique({
            where: { email }
        });
        // If not found and Gmail address, try normalized lookup
        if (!user && (email.includes('@gmail.com') || email.includes('@googlemail.com'))) {
            const normalizedInputEmail = (0, emailNormalization_1.normalizeEmail)(email);
            const gmailUsers = await prisma_1.prisma.user.findMany({
                where: {
                    email: { contains: '@gmail.com' }
                }
            });
            user = gmailUsers.find(u => (0, emailNormalization_1.normalizeEmail)(u.email) === normalizedInputEmail) || null;
        }
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
        req.log.debug({ statusCheck }, 'Status endpoint style query result');
        // Debug: Add TOTP status to response for testing
        const totpDebug = {
            userId: user.id,
            userDataExists: !!userData,
            userData: userData,
            totpEnabled: userData?.totpEnabled,
            hasSecret: !!userData?.totpSecret,
            totpLastUsedAt: userData?.totpLastUsedAt
        };
        req.log.debug({ totpDebug, email: user.email }, 'TOTP Debug information');
        req.log.debug({ userData }, 'Raw userData query result');
        req.log.debug({
            userDataExists: !!userData,
            totpEnabled: userData?.totpEnabled
        }, 'TOTP Check');
        // Use statusCheck result as authoritative since that logic works
        const actualTotpEnabled = statusCheck?.totpEnabled || false;
        req.log.debug({ totpEnabled: actualTotpEnabled }, 'Using statusCheck result');
        if (actualTotpEnabled && userData?.totpSecret) {
            req.log.debug({ email: user.email }, 'TOTP Required: User has TOTP enabled');
            const { totpToken } = req.body;
            // Require TOTP verification
            if (!totpToken) {
                req.log.debug({ email: user.email }, 'TOTP Token Missing: Requiring TOTP');
                return res.status(200).json({
                    requiresTOTP: true,
                    message: 'Two-factor authentication required',
                    userId: user.id // Temporary ID for TOTP verification
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
            // Generate and store refresh token
            const refreshToken = (0, auth_1.generateRefreshToken)();
            const refreshExpiresAt = rememberMe
                ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
                : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
            await sessionManager_1.sessionManager.storeRefreshToken(user.id, refreshToken, refreshExpiresAt, { userAgent, ipAddress }, rememberMe || false);
            // Set httpOnly cookie for auth token (30 minutes)
            res.cookie(cookies_1.COOKIE_NAMES.AUTH_TOKEN, token, {
                httpOnly: true,
                secure: (0, environment_1.requireSecureCookies)(),
                sameSite: 'none', // Required for cross-subdomain auth (dev.unitedwerise.org → dev-api.unitedwerise.org)
                maxAge: 30 * 60 * 1000, // 30 minutes
                path: '/',
                domain: '.unitedwerise.org' // Allow sharing between www and api subdomains
            });
            // Set httpOnly refresh token cookie
            res.cookie(cookies_1.COOKIE_NAMES.REFRESH_TOKEN, refreshToken, {
                httpOnly: true,
                secure: (0, environment_1.requireSecureCookies)(),
                sameSite: 'none',
                maxAge: rememberMe ? 90 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000, // 90 or 30 days
                path: '/',
                domain: '.unitedwerise.org'
            });
            // Generate and set CSRF token
            const csrfToken = crypto_1.default.randomBytes(32).toString('hex');
            res.cookie(cookies_1.COOKIE_NAMES.CSRF_TOKEN, csrfToken, {
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
        // Generate and store refresh token
        const refreshToken = (0, auth_1.generateRefreshToken)();
        const refreshExpiresAt = rememberMe
            ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
        await sessionManager_1.sessionManager.storeRefreshToken(user.id, refreshToken, refreshExpiresAt, { userAgent, ipAddress }, rememberMe || false);
        // Set httpOnly cookie for auth token (30 minutes)
        res.cookie(cookies_1.COOKIE_NAMES.AUTH_TOKEN, token, {
            httpOnly: true,
            secure: (0, environment_1.requireSecureCookies)(),
            sameSite: 'none', // Required for cross-subdomain auth (dev.unitedwerise.org → dev-api.unitedwerise.org)
            maxAge: 30 * 60 * 1000, // 30 minutes
            path: '/',
            domain: '.unitedwerise.org' // Allow sharing between www and api subdomains
        });
        // Set httpOnly refresh token cookie
        res.cookie(cookies_1.COOKIE_NAMES.REFRESH_TOKEN, refreshToken, {
            httpOnly: true,
            secure: (0, environment_1.requireSecureCookies)(),
            sameSite: 'none',
            maxAge: rememberMe ? 90 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000, // 90 or 30 days
            path: '/',
            domain: '.unitedwerise.org'
        });
        // Generate and set CSRF token
        const csrfToken = crypto_1.default.randomBytes(32).toString('hex');
        res.cookie(cookies_1.COOKIE_NAMES.CSRF_TOKEN, csrfToken, {
            httpOnly: false, // Needs to be readable by JS
            secure: (0, environment_1.requireSecureCookies)(),
            sameSite: 'none', // Required for cross-subdomain auth (dev.unitedwerise.org → dev-api.unitedwerise.org)
            maxAge: 30 * 24 * 60 * 60 * 1000,
            path: '/',
            domain: '.unitedwerise.org' // Allow sharing between www and api subdomains
        });
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
            csrfToken
            // Token is in httpOnly cookie only (not exposed to JavaScript)
        });
    }
    catch (error) {
        req.log.error({ error, email: req.body?.email }, 'Login error');
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
    try {
        // Fetch additional user info not in the auth middleware
        const fullUser = await prisma_1.prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                email: true,
                username: true,
                firstName: true,
                lastName: true,
                isModerator: true,
                isAdmin: true,
                isSuperAdmin: true,
                password: true, // Need to check if set (won't return actual password)
                uiPreferences: true, // UI preferences (dismissed modals, etc.)
                oauthProviders: {
                    select: {
                        provider: true,
                        providerId: true,
                        email: true,
                        createdAt: true
                    }
                }
            }
        });
        if (!fullUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Build response with password status (never expose actual password)
        const userData = {
            id: fullUser.id,
            email: fullUser.email,
            username: fullUser.username,
            firstName: fullUser.firstName,
            lastName: fullUser.lastName,
            isModerator: fullUser.isModerator,
            isAdmin: fullUser.isAdmin,
            isSuperAdmin: fullUser.isSuperAdmin,
            totpVerified: req.user.totpVerified,
            totpVerifiedAt: req.user.totpVerifiedAt,
            // Security-safe password status indicators
            hasPassword: !!fullUser.password,
            hasOAuthProviders: fullUser.oauthProviders.length > 0,
            oauthProviders: fullUser.oauthProviders.map(p => ({
                provider: p.provider,
                email: p.email,
                linkedAt: p.createdAt
            })),
            // UI preferences (dismissed modals, theme choices, etc.)
            uiPreferences: fullUser.uiPreferences || {}
        };
        res.json({ success: true, data: userData });
    }
    catch (error) {
        req.log.error({ error, userId: req.user?.id }, 'Error fetching user data');
        res.status(500).json({ error: 'Failed to fetch user data' });
    }
});
// Forgot password
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }
        // Find user (with Gmail normalization support)
        // Gmail ignores dots in addresses, so ashley.m.oberry@gmail.com = ashleymoberry@gmail.com
        let user = await prisma_1.prisma.user.findUnique({
            where: { email }
        });
        // If not found and Gmail address, try normalized lookup
        if (!user && (email.includes('@gmail.com') || email.includes('@googlemail.com'))) {
            const normalizedInputEmail = (0, emailNormalization_1.normalizeEmail)(email);
            const gmailUsers = await prisma_1.prisma.user.findMany({
                where: {
                    email: { contains: '@gmail.com' }
                }
            });
            user = gmailUsers.find(u => (0, emailNormalization_1.normalizeEmail)(u.email) === normalizedInputEmail) || null;
        }
        if (!user) {
            // Don't reveal if email exists or not
            return res.json({ message: 'If the email exists, a reset link has been sent' });
        }
        // SECURITY FIX: Generate plaintext token for email, hash for database storage
        const resetToken = (0, auth_1.generateResetToken)();
        const hashedResetToken = (0, auth_1.hashResetToken)(resetToken);
        const resetExpiry = new Date(Date.now() + 3600000); // 1 hour
        await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: {
                resetToken: hashedResetToken, // Store hash, not plaintext
                resetExpiry
            }
        });
        // Send password reset email with plaintext token (user needs actual token)
        const emailTemplate = emailService_1.emailService.generatePasswordResetTemplate(email, resetToken, // Email contains plaintext token
        user.firstName);
        const emailSent = await emailService_1.emailService.sendEmail(emailTemplate);
        if (!emailSent) {
            // Log failure but don't expose to user (prevents email enumeration)
            req.log.error({ email }, 'Failed to send password reset email');
        }
        else {
            // Track successful email send
            metricsService_1.metricsService.trackEmailSent('password_reset', email);
        }
        res.json({ message: 'If the email exists, a reset link has been sent' });
    }
    catch (error) {
        req.log.error({ error, email: req.body?.email }, 'Forgot password error');
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Reset password
// SECURITY: validatePasswordReset enforces exact 64-char hex token length
router.post('/reset-password', validation_1.validatePasswordReset, async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        // SECURITY FIX: Hash incoming token to compare with stored hash
        const hashedToken = (0, auth_1.hashResetToken)(token);
        const user = await prisma_1.prisma.user.findFirst({
            where: {
                resetToken: hashedToken, // Compare hashed token
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
        req.log.error({ error }, 'Reset password error');
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Logout user (blacklist token and revoke refresh token)
router.post('/logout', auth_2.requireAuth, async (req, res) => {
    try {
        // Get token from cookie first, fallback to header for transition period
        let token = req.cookies?.[cookies_1.COOKIE_NAMES.AUTH_TOKEN];
        if (!token) {
            token = req.header('Authorization')?.replace('Bearer ', '');
        }
        const sessionId = req.header('X-Session-ID');
        const refreshToken = req.cookies?.[cookies_1.COOKIE_NAMES.REFRESH_TOKEN];
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
        // Revoke refresh token if provided
        if (refreshToken) {
            await sessionManager_1.sessionManager.revokeRefreshToken(refreshToken);
        }
        // Revoke session if provided
        if (sessionId) {
            await sessionManager_1.sessionManager.revokeUserSession(sessionId);
        }
        // Clear all authentication cookies with the same options they were set with
        const httpOnlyCookieOptions = {
            httpOnly: true, // MUST match login cookie settings for authToken and refreshToken
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
        res.clearCookie(cookies_1.COOKIE_NAMES.AUTH_TOKEN, httpOnlyCookieOptions);
        res.clearCookie(cookies_1.COOKIE_NAMES.REFRESH_TOKEN, httpOnlyCookieOptions);
        res.clearCookie(cookies_1.COOKIE_NAMES.CSRF_TOKEN, nonHttpOnlyCookieOptions);
        res.json({ message: 'Logged out successfully' });
    }
    catch (error) {
        req.log.error({ error, userId: req.user?.id }, 'Logout error');
        res.status(500).json({ error: 'Logout failed' });
    }
});
/**
 * @swagger
 * /api/auth/logout-all:
 *   post:
 *     tags: [Authentication]
 *     summary: Logout from all devices (requires authentication)
 *     description: |
 *       Revokes all refresh tokens for the authenticated user, effectively logging them out
 *       from all devices. Also blacklists the current access token and clears cookies.
 *       Useful for security when user suspects account compromise or wants to end all sessions.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Successfully logged out from all devices
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Logged out from all devices successfully"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         description: Server error during logout
 */
// Logout all devices (revoke all refresh tokens)
router.post('/logout-all', auth_2.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        // Get current auth token for blacklisting
        let token = req.cookies?.[cookies_1.COOKIE_NAMES.AUTH_TOKEN];
        if (!token) {
            token = req.header('Authorization')?.replace('Bearer ', '');
        }
        if (token) {
            const decoded = (0, auth_3.verifyToken)(token);
            if (decoded) {
                // Calculate token expiration time
                const tokenExp = decoded.exp ? decoded.exp * 1000 : Date.now() + (7 * 24 * 60 * 60 * 1000);
                // Blacklist the current token
                const tokenId = crypto_1.default.createHash('sha256').update(token).digest('hex');
                await sessionManager_1.sessionManager.blacklistToken(tokenId, tokenExp);
            }
        }
        // Revoke all refresh tokens for this user
        await sessionManager_1.sessionManager.revokeAllUserRefreshTokens(userId);
        // Clear all authentication cookies
        const httpOnlyCookieOptions = {
            httpOnly: true,
            secure: (0, environment_1.requireSecureCookies)(),
            sameSite: 'none',
            path: '/',
            domain: '.unitedwerise.org'
        };
        const nonHttpOnlyCookieOptions = {
            httpOnly: false,
            secure: (0, environment_1.requireSecureCookies)(),
            sameSite: 'none',
            path: '/',
            domain: '.unitedwerise.org'
        };
        res.clearCookie(cookies_1.COOKIE_NAMES.AUTH_TOKEN, httpOnlyCookieOptions);
        res.clearCookie(cookies_1.COOKIE_NAMES.REFRESH_TOKEN, httpOnlyCookieOptions);
        res.clearCookie(cookies_1.COOKIE_NAMES.CSRF_TOKEN, nonHttpOnlyCookieOptions);
        res.json({ message: 'Logged out from all devices successfully' });
    }
    catch (error) {
        req.log.error({ error, userId: req.user?.id }, 'Logout all error');
        res.status(500).json({ error: 'Logout from all devices failed' });
    }
});
/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Change user password (requires authentication)
 *     description: Allows authenticated user to change their password. Revokes all refresh tokens for security, forcing re-login on all devices.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 description: User's current password
 *               newPassword:
 *                 type: string
 *                 description: New password (min 8 characters)
 *     responses:
 *       200:
 *         description: Password changed successfully, all sessions invalidated
 *       400:
 *         description: Invalid request (missing fields, weak password)
 *       401:
 *         description: Current password incorrect or not authenticated
 *       500:
 *         description: Server error
 */
router.post('/change-password', auth_2.requireAuth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user?.id;
        const ipAddress = req.ip || 'unknown';
        const userAgent = req.get('User-Agent') || 'unknown';
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required' });
        }
        // Validate new password strength (min 8 characters)
        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'New password must be at least 8 characters long' });
        }
        // Get user from database
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, username: true, password: true }
        });
        if (!user || !user.password) {
            return res.status(400).json({
                error: 'Password change not available for OAuth-only accounts',
                oauthOnly: true
            });
        }
        // Verify current password
        const isValidPassword = await (0, auth_1.comparePassword)(currentPassword, user.password);
        if (!isValidPassword) {
            // Log failed password change attempt
            await securityService_1.SecurityService.logEvent({
                userId: user.id,
                eventType: 'PASSWORD_CHANGE_FAILED',
                ipAddress,
                userAgent,
                details: {
                    reason: 'Incorrect current password',
                    timestamp: new Date().toISOString()
                },
                riskScore: 40
            });
            return res.status(401).json({ error: 'Current password is incorrect' });
        }
        // Hash new password
        const hashedPassword = await (0, auth_1.hashPassword)(newPassword);
        // Update password in database
        await prisma_1.prisma.user.update({
            where: { id: userId },
            data: {
                password: hashedPassword,
                passwordChangedAt: new Date()
            }
        });
        // SECURITY: Revoke all refresh tokens to force re-login on all devices
        await sessionManager_1.sessionManager.revokeAllUserRefreshTokens(userId);
        // Blacklist current access token
        const token = req.cookies?.[cookies_1.COOKIE_NAMES.AUTH_TOKEN];
        if (token) {
            const decoded = (0, auth_3.verifyToken)(token);
            if (decoded) {
                const tokenId = crypto_1.default.createHash('sha256').update(token).digest('hex');
                const expirationTime = (decoded.exp || 0) * 1000;
                await sessionManager_1.sessionManager.blacklistToken(tokenId, expirationTime);
            }
        }
        // Clear all auth cookies
        const cookieOptions = {
            httpOnly: true,
            secure: (0, environment_1.requireSecureCookies)(),
            sameSite: 'none',
            path: '/',
            domain: '.unitedwerise.org'
        };
        const nonHttpOnlyCookieOptions = {
            httpOnly: false,
            secure: (0, environment_1.requireSecureCookies)(),
            sameSite: 'none',
            path: '/',
            domain: '.unitedwerise.org'
        };
        res.clearCookie(cookies_1.COOKIE_NAMES.AUTH_TOKEN, cookieOptions);
        res.clearCookie(cookies_1.COOKIE_NAMES.REFRESH_TOKEN, cookieOptions);
        res.clearCookie(cookies_1.COOKIE_NAMES.CSRF_TOKEN, nonHttpOnlyCookieOptions);
        // Log successful password change
        await securityService_1.SecurityService.logEvent({
            userId: user.id,
            eventType: 'PASSWORD_CHANGED',
            ipAddress,
            userAgent,
            details: {
                timestamp: new Date().toISOString(),
                allSessionsRevoked: true
            },
            riskScore: 0
        });
        req.log.warn({
            userId,
            username: user.username,
            email: user.email,
            allSessionsRevoked: true
        }, 'Password changed successfully');
        res.json({
            message: 'Password changed successfully. Please log in again.',
            requiresReLogin: true
        });
    }
    catch (error) {
        req.log.error({ error, userId: req.user?.id }, 'Change password error');
        await securityService_1.SecurityService.logEvent({
            userId: req.user?.id,
            eventType: 'SYSTEM_ERROR',
            ipAddress: req.ip || 'unknown',
            userAgent: req.get('User-Agent') || 'unknown',
            details: {
                error: error.message,
                endpoint: '/api/auth/change-password',
                timestamp: new Date().toISOString()
            },
            riskScore: 30
        });
        res.status(500).json({ error: 'Failed to change password' });
    }
});
/**
 * @swagger
 * /api/auth/set-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Set password for OAuth-only accounts
 *     description: |
 *       Allows users who created their account via OAuth (Google) to add a password,
 *       enabling them to login with email+password in addition to OAuth.
 *
 *       **Requirements**:
 *       - User must be authenticated (via OAuth session)
 *       - User must NOT have an existing password (password field is null)
 *       - If user already has a password, use `/change-password` instead
 *
 *       **Security**: Password must meet strength requirements (min 8 chars, complexity).
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newPassword
 *               - confirmPassword
 *             properties:
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 description: New password (min 8 chars with complexity requirements)
 *               confirmPassword:
 *                 type: string
 *                 format: password
 *                 description: Confirmation of new password (must match)
 *     responses:
 *       200:
 *         description: Password set successfully
 *       400:
 *         description: Invalid password, passwords don't match, or user already has password
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
router.post('/set-password', auth_2.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { newPassword, confirmPassword } = req.body;
        const ipAddress = req.ip || 'unknown';
        const userAgent = req.get('User-Agent') || 'unknown';
        // Validate required fields
        if (!newPassword || !confirmPassword) {
            return res.status(400).json({ error: 'New password and confirmation are required' });
        }
        // Validate passwords match
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ error: 'Passwords do not match' });
        }
        // Validate password strength (minimum 8 characters)
        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters long' });
        }
        // Check for password complexity (at least one letter and one number)
        const hasLetter = /[a-zA-Z]/.test(newPassword);
        const hasNumber = /[0-9]/.test(newPassword);
        if (!hasLetter || !hasNumber) {
            return res.status(400).json({
                error: 'Password must contain at least one letter and one number'
            });
        }
        // Get user from database
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, username: true, password: true }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Check if user already has a password - if so, they should use change-password
        if (user.password) {
            return res.status(400).json({
                error: 'You already have a password. Use the change password feature instead.',
                hasPassword: true,
                useEndpoint: '/api/auth/change-password'
            });
        }
        // Hash new password
        const hashedPassword = await (0, auth_1.hashPassword)(newPassword);
        // Update password in database
        await prisma_1.prisma.user.update({
            where: { id: userId },
            data: {
                password: hashedPassword,
                passwordChangedAt: new Date()
            }
        });
        // Log successful password set
        await securityService_1.SecurityService.logEvent({
            userId: user.id,
            eventType: 'PASSWORD_SET',
            ipAddress,
            userAgent,
            details: {
                source: 'oauth_user_set_password',
                timestamp: new Date().toISOString()
            },
            riskScore: 0
        });
        req.log.info({
            userId,
            username: user.username,
            email: user.email
        }, 'OAuth user set password successfully');
        res.json({
            success: true,
            message: 'Password set successfully. You can now log in with email and password.',
            canLoginWithPassword: true
        });
    }
    catch (error) {
        req.log.error({ error, userId: req.user?.id }, 'Set password error');
        await securityService_1.SecurityService.logEvent({
            userId: req.user?.id,
            eventType: 'SYSTEM_ERROR',
            ipAddress: req.ip || 'unknown',
            userAgent: req.get('User-Agent') || 'unknown',
            details: {
                error: error.message,
                endpoint: '/api/auth/set-password',
                timestamp: new Date().toISOString()
            },
            riskScore: 30
        });
        res.status(500).json({ error: 'Failed to set password' });
    }
});
/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     tags: [Authentication]
 *     summary: Refresh access token using refresh token
 *     description: |
 *       Exchanges a valid refresh token (from cookie) for new access token and refresh token.
 *       Implements token rotation: old refresh token is invalidated with 30-second grace period.
 *
 *       **Token Rotation Security**: Each refresh generates new tokens and invalidates old ones,
 *       preventing token reuse attacks. Grace period handles concurrent requests.
 *
 *       **Automatic Refresh**: Frontend automatically calls this when access token expires (30min).
 *       Users see seamless experience - no re-login required for up to 30 days (or 90 with Remember Me).
 *
 *       **TOTP Persistence**: TOTP verification status preserved across token refreshes.
 *     requestBody:
 *       description: No body required - refresh token sent via httpOnly cookie
 *       required: false
 *     responses:
 *       200:
 *         description: Tokens refreshed successfully - new tokens sent as httpOnly cookies
 *         headers:
 *           Set-Cookie:
 *             description: |
 *               Sets three cookies:
 *               - authToken (httpOnly, 30min, new access token)
 *               - refreshToken (httpOnly, 30-90 days, new refresh token)
 *               - csrf-token (readable by JS, for subsequent requests)
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 csrfToken:
 *                   type: string
 *                   description: CSRF token for subsequent authenticated requests
 *       401:
 *         description: Invalid, expired, or revoked refresh token - user must log in again
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Invalid refresh token"
 *                 code:
 *                   type: string
 *                   enum: [REFRESH_TOKEN_INVALID]
 *                   description: Error code for frontend to trigger re-login
 *       500:
 *         description: Server error during token rotation
 */
// Token refresh endpoint - uses refresh tokens for security
router.post('/refresh', async (req, res) => {
    const startTime = Date.now();
    const ipAddress = req.ip || 'unknown';
    try {
        // Get refreshToken from cookies (not authToken)
        const refreshToken = req.cookies?.[cookies_1.COOKIE_NAMES.REFRESH_TOKEN];
        if (!refreshToken) {
            req.log.debug({ ipAddress }, 'Token refresh failed: No refresh token provided');
            return res.status(401).json({
                error: 'Invalid refresh token',
                code: 'REFRESH_TOKEN_INVALID'
            });
        }
        // Validate refresh token and get user data
        const tokenData = await sessionManager_1.sessionManager.validateRefreshToken(refreshToken);
        if (!tokenData) {
            req.log.debug({ ipAddress }, 'Token refresh failed: Invalid or expired refresh token');
            await securityService_1.SecurityService.logEvent({
                eventType: 'REFRESH_TOKEN_FAILED',
                ipAddress,
                userAgent: req.get('User-Agent') || 'unknown',
                details: {
                    reason: 'Invalid or expired refresh token',
                    timestamp: new Date().toISOString()
                },
                riskScore: 20
            });
            return res.status(401).json({
                error: 'Invalid refresh token',
                code: 'REFRESH_TOKEN_INVALID'
            });
        }
        // Generate new access token (preserve TOTP status if present)
        const newAccessToken = (0, auth_1.generateToken)(tokenData.user.id, tokenData.user.totpEnabled);
        // Generate new refresh token
        const newRefreshToken = (0, auth_1.generateRefreshToken)();
        // Rotate refresh tokens with 30-second grace period
        try {
            await sessionManager_1.sessionManager.rotateRefreshToken(refreshToken, newRefreshToken, 30);
        }
        catch (rotationError) {
            req.log.error({ error: rotationError, userId: tokenData.user.id }, 'Token rotation failed');
            return res.status(500).json({ error: 'Internal server error' });
        }
        // Set new authToken cookie (30 minute expiration)
        res.cookie(cookies_1.COOKIE_NAMES.AUTH_TOKEN, newAccessToken, {
            httpOnly: true,
            secure: (0, environment_1.requireSecureCookies)(),
            sameSite: 'none',
            maxAge: 30 * 60 * 1000, // 30 minutes (access token lifetime)
            path: '/',
            domain: '.unitedwerise.org'
        });
        // Set new refreshToken cookie (preserve original expiration from tokenData.rememberMe)
        const refreshTokenMaxAge = tokenData.rememberMe
            ? 90 * 24 * 60 * 60 * 1000 // 90 days
            : 30 * 24 * 60 * 60 * 1000; // 30 days
        res.cookie(cookies_1.COOKIE_NAMES.REFRESH_TOKEN, newRefreshToken, {
            httpOnly: true,
            secure: (0, environment_1.requireSecureCookies)(),
            sameSite: 'none',
            maxAge: refreshTokenMaxAge,
            path: '/',
            domain: '.unitedwerise.org'
        });
        // Generate and set new CSRF token
        const csrfToken = crypto_1.default.randomBytes(32).toString('hex');
        res.cookie(cookies_1.COOKIE_NAMES.CSRF_TOKEN, csrfToken, {
            httpOnly: false,
            secure: (0, environment_1.requireSecureCookies)(),
            sameSite: 'none',
            maxAge: refreshTokenMaxAge,
            path: '/',
            domain: '.unitedwerise.org'
        });
        const duration = Date.now() - startTime;
        req.log.warn({
            userId: tokenData.user.id,
            username: tokenData.user.username,
            email: tokenData.user.email,
            ipAddress,
            durationMs: duration
        }, 'Token refreshed successfully');
        // Log successful refresh for security monitoring
        await securityService_1.SecurityService.logEvent({
            userId: tokenData.user.id,
            eventType: 'REFRESH_TOKEN_SUCCESS',
            ipAddress,
            userAgent: req.get('User-Agent') || 'unknown',
            details: {
                rememberMe: tokenData.rememberMe,
                timestamp: new Date().toISOString()
            },
            riskScore: 0
        });
        res.json({
            success: true,
            csrfToken
        });
    }
    catch (error) {
        req.log.error({ error, ipAddress }, 'Token refresh error');
        // Log system error
        await securityService_1.SecurityService.logEvent({
            eventType: 'SYSTEM_ERROR',
            ipAddress,
            userAgent: req.get('User-Agent') || 'unknown',
            details: {
                error: error.message,
                endpoint: '/api/auth/refresh',
                timestamp: new Date().toISOString()
            },
            riskScore: 40
        });
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
        req.log.error({ error }, 'Error checking test user');
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
        req.log.error({ error, userId: req.user?.id }, 'Password verification error');
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
        req.log.error({ error }, 'Error creating test user');
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
        req.log.error({ error, username: req.body?.username }, 'Username check error');
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
        req.log.error({ error, email: req.body?.email }, 'Email check error');
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
        req.log.error({ error, userId: req.user?.id }, 'Complete onboarding error');
        res.status(500).json({ error: 'Failed to complete onboarding' });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map