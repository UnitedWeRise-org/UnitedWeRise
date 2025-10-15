import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
export declare function checkVerificationStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response<any, Record<string, any>>>;
//# sourceMappingURL=verificationEnforcement.d.ts.map