declare class SMSService {
    private client;
    private fromNumber;
    constructor();
    private initializeClient;
    sendSMS(to: string, message: string): Promise<boolean>;
    sendVerificationCode(phoneNumber: string, code: string): Promise<boolean>;
    generateVerificationCode(): string;
    private formatPhoneNumber;
    isValidPhoneNumber(phoneNumber: string): boolean;
    testService(): Promise<boolean>;
}
export declare const smsService: SMSService;
export {};
//# sourceMappingURL=smsService.d.ts.map