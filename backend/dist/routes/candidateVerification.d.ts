declare const router: import("express-serve-static-core").Router;
declare global {
    namespace Express {
        interface Request {
            candidate?: any;
        }
    }
}
export default router;
//# sourceMappingURL=candidateVerification.d.ts.map