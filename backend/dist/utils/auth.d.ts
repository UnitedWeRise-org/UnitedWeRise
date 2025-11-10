import { JwtPayload } from 'jsonwebtoken';
export declare const hashPassword: (password: string) => Promise<string>;
export declare const comparePassword: (password: string, hashedPassword: string) => Promise<boolean>;
export declare const generateToken: (userId: string, totpVerified?: boolean) => string;
export declare const verifyToken: (token: string) => (JwtPayload & {
    userId: string;
    totpVerified?: boolean;
    totpVerifiedAt?: number | null;
}) | null;
export declare const generateResetToken: () => string;
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
export declare const generateRefreshToken: () => string;
/**
 * Hash refresh token for secure database storage
 * @param token - Plaintext refresh token (64-char hex)
 * @returns SHA-256 hash of token (64-char hex)
 * @description Never store plaintext tokens in database. Only store hashed version.
 * Validation: Hash incoming token and compare with stored hash.
 */
export declare const hashRefreshToken: (token: string) => string;
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
export declare const hashResetToken: (token: string) => string;
//# sourceMappingURL=auth.d.ts.map