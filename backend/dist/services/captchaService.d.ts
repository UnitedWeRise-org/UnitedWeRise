declare class CaptchaService {
    private secretKey;
    constructor();
    verifyCaptcha(token: string, userIP?: string): Promise<{
        success: boolean;
        error?: string;
        score?: number;
    }>;
    isValidScore(score?: number, threshold?: number): boolean;
    testConfiguration(): Promise<boolean>;
}
export declare const captchaService: CaptchaService;
export {};
//# sourceMappingURL=captchaService.d.ts.map