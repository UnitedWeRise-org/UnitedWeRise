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
 * @returns 64-character hex string (256 bits of randomness)
 * @description Used for long-lived session persistence. Token is hashed before storage in database.
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
//# sourceMappingURL=auth.d.ts.map