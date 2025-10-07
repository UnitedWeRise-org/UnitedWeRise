import bcrypt from 'bcryptjs';
import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';

// SECURITY: JWT_SECRET must be set via environment variable
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable must be set');
}

// Reduced from 7d to 24h for better security while maintaining UX
// TODO: Implement refresh tokens for even better security with long-lived sessions
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12');

export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
};

export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword);
};

export const generateToken = (userId: string): string => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as any);
};

export const verifyToken = (token: string): (JwtPayload & { userId: string }) | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload & { userId: string };
    return decoded;
  } catch (error) {
    return null;
  }
};

export const generateResetToken = (): string => {
  // SECURITY: Use cryptographically secure random bytes instead of Math.random()
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex'); // 256 bits of cryptographic randomness
};