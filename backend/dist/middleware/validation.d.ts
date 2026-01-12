import { Request, Response, NextFunction } from 'express';
export declare const handleValidationErrors: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
export declare const validateRegistration: (((req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>>) | import("express-validator").ValidationChain)[];
export declare const validatePhoneVerification: (((req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>>) | import("express-validator").ValidationChain)[];
export declare const validatePhoneCode: (((req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>>) | import("express-validator").ValidationChain)[];
export declare const validateEmailVerification: (((req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>>) | import("express-validator").ValidationChain)[];
export declare const validatePasswordReset: (((req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>>) | import("express-validator").ValidationChain)[];
export declare const validateLogin: (((req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>>) | import("express-validator").ValidationChain)[];
export declare const validatePost: (((req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>>) | import("express-validator").ValidationChain)[];
export declare const validateComment: (((req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>>) | import("express-validator").ValidationChain)[];
export declare const validateProfileUpdate: (((req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>>) | import("express-validator").ValidationChain)[];
export declare const validatePoliticalProfile: (((req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>>) | import("express-validator").ValidationChain)[];
export declare const validateMessage: (((req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>>) | import("express-validator").ValidationChain)[];
export declare const validateReport: (((req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>>) | import("express-validator").ValidationChain)[];
export declare const validateModerationAction: (((req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>>) | import("express-validator").ValidationChain)[];
//# sourceMappingURL=validation.d.ts.map