"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashRefreshToken = exports.generateRefreshToken = exports.generateResetToken = exports.verifyToken = exports.generateToken = exports.comparePassword = exports.hashPassword = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
// SECURITY: JWT_SECRET must be set via environment variable
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('FATAL: JWT_SECRET environment variable must be set');
}
// Access token: Short-lived (30 min) for security, refreshed using refresh tokens
// Refresh token: Long-lived (30-90 days) stored in database for session persistence
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30m'; // Changed from 24h to 30m
const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12');
const hashPassword = async (password) => {
    return await bcryptjs_1.default.hash(password, BCRYPT_SALT_ROUNDS);
};
exports.hashPassword = hashPassword;
const comparePassword = async (password, hashedPassword) => {
    return await bcryptjs_1.default.compare(password, hashedPassword);
};
exports.comparePassword = comparePassword;
const generateToken = (userId, totpVerified = false) => {
    const payload = {
        userId,
        totpVerified,
        totpVerifiedAt: totpVerified ? Date.now() : null
    };
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};
exports.generateToken = generateToken;
const verifyToken = (token) => {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        return decoded;
    }
    catch (error) {
        return null;
    }
};
exports.verifyToken = verifyToken;
const generateResetToken = () => {
    // SECURITY: Use cryptographically secure random bytes instead of Math.random()
    return crypto_1.default.randomBytes(32).toString('hex'); // 256 bits of cryptographic randomness
};
exports.generateResetToken = generateResetToken;
/**
 * Generate a cryptographically secure refresh token
 * @returns 64-character hex string (256 bits of randomness)
 * @description Used for long-lived session persistence. Token is hashed before storage in database.
 */
const generateRefreshToken = () => {
    // SECURITY: 256 bits of cryptographic randomness (same as password reset tokens)
    // Returns 64-character hex string
    return crypto_1.default.randomBytes(32).toString('hex');
};
exports.generateRefreshToken = generateRefreshToken;
/**
 * Hash refresh token for secure database storage
 * @param token - Plaintext refresh token (64-char hex)
 * @returns SHA-256 hash of token (64-char hex)
 * @description Never store plaintext tokens in database. Only store hashed version.
 * Validation: Hash incoming token and compare with stored hash.
 */
const hashRefreshToken = (token) => {
    // SECURITY: Use SHA-256 for fast, secure one-way hashing
    // SHA-256 is appropriate for tokens (not passwords - those use bcrypt)
    return crypto_1.default.createHash('sha256').update(token).digest('hex');
};
exports.hashRefreshToken = hashRefreshToken;
//# sourceMappingURL=auth.js.map