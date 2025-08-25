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
exports.clearTOTPVerification = exports.markTOTPVerified = exports.requireTOTPForAdmin = void 0;
const prisma_1 = require("../lib/prisma");
;
const speakeasy = __importStar(require("speakeasy"));
// Using singleton prisma from lib/prisma.ts
/**
 * Middleware to require TOTP verification for admin access
 * Should be used after requireAuth and requireAdmin middleware
 */
const requireTOTPForAdmin = async (req, res, next) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        // Only enforce TOTP for admin users
        if (!user.isAdmin) {
            return next(); // Non-admin users don't need TOTP
        }
        // Check if admin has TOTP enabled and get their secret
        const userData = await prisma_1.prisma.user.findUnique({
            where: { id: user.id },
            select: {
                totpEnabled: true,
                totpSecret: true
            }
        });
        if (!userData?.totpEnabled || !userData?.totpSecret) {
            return res.status(403).json({
                error: 'TOTP_REQUIRED',
                message: 'Two-factor authentication is required for admin access. Please enable TOTP in your settings.'
            });
        }
        // Check if TOTP verification is present in headers
        const totpVerified = req.headers['x-totp-verified'] === 'true';
        const totpToken = req.headers['x-totp-token'];
        if (!totpVerified || !totpToken) {
            return res.status(403).json({
                error: 'TOTP_VERIFICATION_REQUIRED',
                message: 'Please verify your TOTP token to access admin features.'
            });
        }
        // Verify the temporary verification token
        // This uses a 24-hour window for the verification token (session-based)
        const isValidToken = speakeasy.totp.verify({
            secret: userData.totpSecret,
            encoding: 'base32',
            token: totpToken,
            step: 86400, // 24 hours - must match the generation in /api/totp/verify
            window: 1 // Allow 1 step for slight timing differences
        });
        if (!isValidToken) {
            return res.status(403).json({
                error: 'TOTP_VERIFICATION_EXPIRED',
                message: 'Your TOTP verification has expired. Please verify again.'
            });
        }
        next();
    }
    catch (error) {
        console.error('TOTP admin verification error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.requireTOTPForAdmin = requireTOTPForAdmin;
/**
 * Middleware to mark TOTP as verified for the current session
 * Should be called after successful TOTP verification
 */
const markTOTPVerified = (req, res, next) => {
    // Set response header for stateless verification
    res.setHeader('X-TOTP-Verified', 'true');
    next();
};
exports.markTOTPVerified = markTOTPVerified;
/**
 * Middleware to clear TOTP verification status
 * Should be called on logout or when verification expires
 */
const clearTOTPVerification = (req, res, next) => {
    res.removeHeader('X-TOTP-Verified');
    next();
};
exports.clearTOTPVerification = clearTOTPVerification;
//# sourceMappingURL=totpAuth.js.map