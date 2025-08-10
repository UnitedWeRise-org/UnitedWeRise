import { Request, Response, NextFunction } from 'express';
export interface CustomError extends Error {
    statusCode?: number;
    isOperational?: boolean;
}
export declare const errorHandler: (err: CustomError, req: Request, res: Response, next: NextFunction) => void;
export declare const notFoundHandler: (req: Request, res: Response) => void;
export declare const requestLogger: (req: Request, res: Response, next: NextFunction) => void;
export declare const securityLogger: (event: string, details: any, req?: Request) => void;
export declare const createError: (message: string, statusCode: number) => CustomError;
//# sourceMappingURL=errorHandler.d.ts.map