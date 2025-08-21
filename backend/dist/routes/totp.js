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
const express_1 = __importDefault(require("express"));
const speakeasy = __importStar(require("speakeasy"));
const QRCode = __importStar(require("qrcode"));
const crypto_1 = __importDefault(require("crypto"));
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const prisma = new client_1.PrismaClient();
const router = express_1.default.Router();
/**
 * Setup TOTP for a user
 * Generates a secret and QR code for Google Authenticator
 */
router.post('/setup', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        // Check if user already has TOTP enabled
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { totpEnabled: true, username: true, email: true }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (user.totpEnabled) {
            return res.status(400).json({ error: 'TOTP is already enabled for this account' });
        }
        // Generate a new secret
        const secret = speakeasy.generateSecret({
            name: `UnitedWeRise (${user.username})`,
            issuer: 'UnitedWeRise',
            length: 32
        });
        // Generate QR code URL
        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
        // Store the secret temporarily (user must verify before it's permanently saved)
        await prisma.user.update({
            where: { id: userId },
            data: {
                totpSecret: secret.base32 // Store temporarily
            }
        });
        res.json({
            success: true,
            data: {
                secret: secret.base32,
                qrCode: qrCodeUrl,
                backupCodes: [] // Will be generated after verification
            }
        });
    }
    catch (error) {
        console.error('TOTP setup error:', error);
        res.status(500).json({ error: 'Failed to setup TOTP' });
    }
});
/**
 * Verify TOTP setup
 * User must provide a valid token to confirm setup
 */
router.post('/verify-setup', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ error: 'TOTP token is required' });
        }
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { totpSecret: true, totpEnabled: true }
        });
        if (!user || !user.totpSecret) {
            return res.status(400).json({ error: 'TOTP setup not initiated' });
        }
        if (user.totpEnabled) {
            return res.status(400).json({ error: 'TOTP is already enabled' });
        }
        // Verify the token
        const verified = speakeasy.totp.verify({
            secret: user.totpSecret,
            encoding: 'base32',
            token: token,
            window: 2 // Allow 2 time steps (60 seconds) for clock drift
        });
        if (!verified) {
            return res.status(400).json({ error: 'Invalid TOTP token' });
        }
        // Generate backup codes
        const backupCodes = [];
        for (let i = 0; i < 8; i++) {
            backupCodes.push(crypto_1.default.randomBytes(4).toString('hex').toUpperCase());
        }
        // Enable TOTP and save backup codes
        await prisma.user.update({
            where: { id: userId },
            data: {
                totpEnabled: true,
                totpBackupCodes: backupCodes,
                totpSetupAt: new Date(),
                totpLastUsedAt: new Date() // Prevent immediate reuse of this token
            }
        });
        res.json({
            success: true,
            data: {
                message: 'TOTP successfully enabled',
                backupCodes: backupCodes
            }
        });
    }
    catch (error) {
        console.error('TOTP verification error:', error);
        res.status(500).json({ error: 'Failed to verify TOTP' });
    }
});
/**
 * Verify TOTP token for authentication
 * Used during login or for admin access
 */
router.post('/verify', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { token, backupCode } = req.body;
        if (!token && !backupCode) {
            return res.status(400).json({ error: 'TOTP token or backup code is required' });
        }
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                totpSecret: true,
                totpEnabled: true,
                totpBackupCodes: true,
                totpLastUsedAt: true
            }
        });
        if (!user || !user.totpEnabled || !user.totpSecret) {
            return res.status(400).json({ error: 'TOTP is not enabled for this account' });
        }
        let verified = false;
        let usedBackupCode = false;
        if (backupCode) {
            // Verify backup code
            if (user.totpBackupCodes.includes(backupCode.toUpperCase())) {
                verified = true;
                usedBackupCode = true;
                // Remove used backup code
                const updatedBackupCodes = user.totpBackupCodes.filter(code => code !== backupCode.toUpperCase());
                await prisma.user.update({
                    where: { id: userId },
                    data: {
                        totpBackupCodes: updatedBackupCodes,
                        totpLastUsedAt: new Date()
                    }
                });
            }
        }
        else if (token) {
            // Verify TOTP token
            verified = speakeasy.totp.verify({
                secret: user.totpSecret,
                encoding: 'base32',
                token: token,
                window: 2 // Allow 2 time steps for clock drift
            });
            if (verified) {
                // Update last used timestamp
                await prisma.user.update({
                    where: { id: userId },
                    data: { totpLastUsedAt: new Date() }
                });
            }
        }
        if (!verified) {
            return res.status(400).json({ error: 'Invalid TOTP token or backup code' });
        }
        res.json({
            success: true,
            data: {
                verified: true,
                usedBackupCode: usedBackupCode,
                remainingBackupCodes: usedBackupCode ?
                    user.totpBackupCodes.length - 1 :
                    user.totpBackupCodes.length
            }
        });
    }
    catch (error) {
        console.error('TOTP verification error:', error);
        res.status(500).json({ error: 'Failed to verify TOTP' });
    }
});
/**
 * Disable TOTP for a user
 * Requires password confirmation for security
 */
router.post('/disable', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { password } = req.body;
        if (!password) {
            return res.status(400).json({ error: 'Password confirmation is required' });
        }
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { password: true, totpEnabled: true }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (!user.totpEnabled) {
            return res.status(400).json({ error: 'TOTP is not enabled for this account' });
        }
        // Verify password
        const bcrypt = require('bcryptjs');
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid password' });
        }
        // Disable TOTP
        await prisma.user.update({
            where: { id: userId },
            data: {
                totpEnabled: false,
                totpSecret: null,
                totpBackupCodes: [],
                totpLastUsedAt: null,
                totpSetupAt: null
            }
        });
        res.json({
            success: true,
            data: { message: 'TOTP successfully disabled' }
        });
    }
    catch (error) {
        console.error('TOTP disable error:', error);
        res.status(500).json({ error: 'Failed to disable TOTP' });
    }
});
/**
 * Get TOTP status for a user
 */
router.get('/status', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                totpEnabled: true,
                totpSetupAt: true,
                totpBackupCodes: true
            }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({
            success: true,
            data: {
                enabled: user.totpEnabled,
                setupAt: user.totpSetupAt,
                backupCodesRemaining: user.totpBackupCodes.length
            }
        });
    }
    catch (error) {
        console.error('TOTP status error:', error);
        res.status(500).json({ error: 'Failed to get TOTP status' });
    }
});
/**
 * Generate new backup codes
 * Requires TOTP verification for security
 */
router.post('/regenerate-backup-codes', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { token, backupCode } = req.body;
        if (!token && !backupCode) {
            return res.status(400).json({ error: 'TOTP token or backup code is required' });
        }
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                totpSecret: true,
                totpEnabled: true,
                totpBackupCodes: true
            }
        });
        if (!user || !user.totpEnabled) {
            return res.status(400).json({ error: 'TOTP is not enabled for this account' });
        }
        // Verify TOTP or backup code first
        let verified = false;
        if (backupCode && user.totpBackupCodes.includes(backupCode.toUpperCase())) {
            verified = true;
        }
        else if (token && user.totpSecret) {
            verified = speakeasy.totp.verify({
                secret: user.totpSecret,
                encoding: 'base32',
                token: token,
                window: 2
            });
        }
        if (!verified) {
            return res.status(400).json({ error: 'Invalid TOTP token or backup code' });
        }
        // Generate new backup codes
        const newBackupCodes = [];
        for (let i = 0; i < 8; i++) {
            newBackupCodes.push(crypto_1.default.randomBytes(4).toString('hex').toUpperCase());
        }
        // Update backup codes
        await prisma.user.update({
            where: { id: userId },
            data: {
                totpBackupCodes: newBackupCodes,
                totpLastUsedAt: new Date()
            }
        });
        res.json({
            success: true,
            data: {
                backupCodes: newBackupCodes
            }
        });
    }
    catch (error) {
        console.error('Backup codes regeneration error:', error);
        res.status(500).json({ error: 'Failed to regenerate backup codes' });
    }
});
exports.default = router;
//# sourceMappingURL=totp.js.map