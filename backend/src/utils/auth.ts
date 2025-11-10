import bcrypt from 'bcryptjs';
import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';

// SECURITY: JWT_SECRET must be set via environment variable
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable must be set');
}

// Access token: Short-lived (30 min) for security, refreshed using refresh tokens
// Refresh token: Long-lived (30-90 days) stored in database for session persistence
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30m'; // Changed from 24h to 30m
const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12');

export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
};

export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword);
};

export const generateToken = (userId: string, totpVerified: boolean = false): string => {
  const payload = {
    userId,
    totpVerified,
    totpVerifiedAt: totpVerified ? Date.now() : null
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as any);
};

export const verifyToken = (token: string): (JwtPayload & { userId: string; totpVerified?: boolean; totpVerifiedAt?: number | null }) | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload & { userId: string; totpVerified?: boolean; totpVerifiedAt?: number | null };
    return decoded;
  } catch (error) {
    return null;
  }
};

export const generateResetToken = (): string => {
  // SECURITY: Use cryptographically secure random bytes instead of Math.random()
  return crypto.randomBytes(32).toString('hex'); // 256 bits of cryptographic randomness
};

/**
 * Generate a cryptographically secure refresh token
 *
 * Creates a random token for long-lived session persistence. Token must be
 * hashed with hashRefreshToken() before database storage. Never store plaintext.
 *
 * @returns {string} 64-character hex string (256 bits of cryptographic randomness)
 *
 * @example
 * // Generate new refresh token for user login
 * const refreshToken = generateRefreshToken();
 * const tokenHash = hashRefreshToken(refreshToken);
 * await prisma.refreshToken.create({
 *   data: { userId, tokenHash, expiresAt }
 * });
 * // Send refreshToken to client in httpOnly cookie
 * res.cookie('refreshToken', refreshToken, { httpOnly: true, ... });
 */
export const generateRefreshToken = (): string => {
  // SECURITY: 256 bits of cryptographic randomness (same as password reset tokens)
  // Returns 64-character hex string
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Hash refresh token for secure database storage
 * @param token - Plaintext refresh token (64-char hex)
 * @returns SHA-256 hash of token (64-char hex)
 * @description Never store plaintext tokens in database. Only store hashed version.
 * Validation: Hash incoming token and compare with stored hash.
 */
export const hashRefreshToken = (token: string): string => {
  // SECURITY: Use SHA-256 for fast, secure one-way hashing
  // SHA-256 is appropriate for tokens (not passwords - those use bcrypt)
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Hash password reset token for secure database storage
 *
 * SECURITY FIX: Password reset tokens must be hashed before storage to prevent
 * database breach from exposing valid reset links. Uses same pattern as refresh tokens.
 *
 * @param token - Plaintext reset token (64-char hex from generateResetToken())
 * @returns SHA-256 hash of token (64-char hex)
 *
 * @description
 * - Never store plaintext reset tokens in database
 * - Only store hashed version in User.resetToken field
 * - Email still contains plaintext token (user needs actual token to reset)
 * - Validation: Hash incoming token from email link and compare with stored hash
 *
 * @example
 * // Forgot Password Flow
 * const resetToken = generateResetToken();           // Generate plaintext
 * const hashedToken = hashResetToken(resetToken);    // Hash for storage
 * await prisma.user.update({
 *   data: { resetToken: hashedToken, resetExpiry }  // Store hash only
 * });
 * sendResetEmail(email, resetToken);                 // Email contains plaintext
 *
 * @example
 * // Reset Password Validation
 * const { token } = req.body;                        // Plaintext from email link
 * const hashedToken = hashResetToken(token);         // Hash incoming token
 * const user = await prisma.user.findFirst({
 *   where: { resetToken: hashedToken }              // Compare hashes
 * });
 */
export const hashResetToken = (token: string): string => {
  // SECURITY: SHA-256 is secure and fast for token hashing
  // Not suitable for passwords (use bcrypt), but perfect for high-entropy tokens
  return crypto.createHash('sha256').update(token).digest('hex');
};