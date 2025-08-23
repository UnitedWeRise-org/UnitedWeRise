import { FeeType, DonationType } from '@prisma/client';
export declare class StripeService {
    /**
     * Create or get Stripe customer for a user
     */
    static getOrCreateCustomer(userId: string): Promise<string>;
    /**
     * Create a tax-deductible donation using Payment Links (most adblocker-resistant)
     */
    static createDonation(params: {
        userId: string;
        amount: number;
        donationType: DonationType;
        campaignId?: string;
        isRecurring?: boolean;
        recurringInterval?: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
    }): Promise<{
        paymentId: string;
        checkoutUrl: string;
        paymentLinkId: string;
    }>;
    /**
     * Create a non-deductible fee payment (e.g., candidate registration)
     */
    static createFeePayment(params: {
        userId: string;
        amount: number;
        feeType: FeeType;
        candidateRegistrationId?: string;
        description?: string;
    }): Promise<{
        paymentId: string;
        checkoutUrl: string;
        sessionId: string;
    }>;
    /**
     * Handle Stripe webhook events
     */
    static handleWebhook(signature: string, payload: Buffer): Promise<{
        success: boolean;
        message: string;
    } | {
        success: boolean;
        message?: undefined;
    }>;
    /**
     * Handle successful checkout
     */
    private static handleCheckoutComplete;
    /**
     * Handle payment success
     */
    private static handlePaymentSuccess;
    /**
     * Handle payment failure
     */
    private static handlePaymentFailed;
    /**
     * Handle subscription updates
     */
    private static handleSubscriptionUpdate;
    /**
     * Handle subscription cancellation
     */
    private static handleSubscriptionCancelled;
    /**
     * Generate tax-compliant receipt
     */
    static generateReceipt(paymentId: string): Promise<void>;
    /**
     * Helper function to map recurring intervals
     */
    private static mapRecurringInterval;
    /**
     * Get fee description for display
     */
    private static getFeeDescription;
}
//# sourceMappingURL=stripeService.d.ts.map