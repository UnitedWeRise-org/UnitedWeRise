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
//# sourceMappingURL=auth.d.ts.map