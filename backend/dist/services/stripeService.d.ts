import { FeeType, DonationType } from '@prisma/client';
/**
 * Stripe payment integration service
 *
 * Handles:
 * - Tax-deductible donations (501c3 nonprofit)
 * - Non-deductible fees (candidate registration, etc.)
 * - Recurring donations via Payment Links
 * - Webhook event processing
 * - Customer management
 * - Receipt generation
 *
 * Payment types:
 * - DONATION (tax-deductible, via Payment Links)
 * - FEE (not tax-deductible, via Checkout Sessions)
 *
 * Features:
 * - Automatic tax calculation
 * - Promotion code support
 * - Idempotent webhook processing
 * - Automatic subscription management
 */
export declare class StripeService {
    /**
     * Create or get Stripe customer for a user
     *
     * Checks for existing StripeCustomer record, creates new Stripe customer if needed.
     * Stores customer ID in database for future lookups.
     * Includes user metadata (userId, platform name) in Stripe customer.
     *
     * @param userId - User ID to create/fetch customer for
     * @returns Promise<string> Stripe customer ID
     * @throws {Error} When user not found
     *
     * @example
     * const customerId = await StripeService.getOrCreateCustomer('user_123');
     * console.log(customerId); // "cus_ABC123xyz"
     */
    static getOrCreateCustomer(userId: string): Promise<string>;
    /**
     * Create tax-deductible donation payment
     *
     * Creates Payment record and generates Stripe Payment Link (most adblocker-resistant).
     * Supports one-time and recurring donations.
     *
     * Features:
     * - Tax-deductible (501c3 nonprofit)
     * - Automatic tax calculation
     * - Promotion codes enabled
     * - Success redirect to donation-success.html
     * - Automatic receipt generation on completion
     *
     * For recurring donations:
     * - Creates Stripe subscription via Payment Link
     * - QUARTERLY mapped to monthly with interval_count (would need custom handling)
     *
     * @param params - Donation parameters
     * @param params.userId - User ID making donation
     * @param params.amount - Amount in cents (e.g., 5000 = $50.00)
     * @param params.donationType - Type from DonationType enum
     * @param params.campaignId - Optional campaign to credit donation to
     * @param params.isRecurring - Whether this is recurring donation
     * @param params.recurringInterval - Frequency for recurring (required if isRecurring true)
     * @returns Promise<Object> Payment ID, checkout URL, and Payment Link ID
     * @throws {Error} When customer creation fails or Stripe API errors
     *
     * @example
     * const donation = await StripeService.createDonation({
     *   userId: 'user_123',
     *   amount: 10000, // $100.00
     *   donationType: 'GENERAL',
     *   isRecurring: true,
     *   recurringInterval: 'MONTHLY'
     * });
     * // Redirect user to: donation.checkoutUrl
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
     * Create non-deductible fee payment
     *
     * Creates Payment record and generates Stripe Checkout Session.
     * Used for platform fees like candidate registration.
     *
     * Features:
     * - NOT tax-deductible
     * - Standard checkout flow
     * - Success/cancel URLs
     * - Metadata includes candidateRegistrationId for workflow
     *
     * Common fee types:
     * - CANDIDATE_REGISTRATION: Candidate profile fee
     * - VERIFICATION_FEE: Identity verification
     * - PREMIUM_FEATURES: Premium access
     * - EVENT_HOSTING: Event hosting fee
     * - ADVERTISING: Campaign ads
     *
     * @param params - Fee payment parameters
     * @param params.userId - User ID paying fee
     * @param params.amount - Amount in cents
     * @param params.feeType - Type from FeeType enum
     * @param params.candidateRegistrationId - Optional registration ID to link
     * @param params.description - Optional custom description
     * @returns Promise<Object> Payment ID, checkout URL, and session ID
     * @throws {Error} When customer creation fails or Stripe API errors
     *
     * @example
     * const fee = await StripeService.createFeePayment({
     *   userId: 'user_123',
     *   amount: 25000, // $250.00
     *   feeType: 'CANDIDATE_REGISTRATION',
     *   candidateRegistrationId: 'reg_456'
     * });
     * // Redirect user to: fee.checkoutUrl
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
     * Handle Stripe webhook events with idempotent processing
     *
     * Verifies webhook signature, prevents duplicate processing via PaymentWebhook table.
     * Handles multiple event types including checkouts, payments, and subscriptions.
     *
     * Supported events:
     * - checkout.session.completed: Update payment, generate receipt, update registration
     * - payment_intent.succeeded: Mark payment completed
     * - payment_intent.payment_failed: Mark payment failed
     * - invoice.payment_succeeded: Recurring donation succeeded
     * - customer.subscription.*: Subscription lifecycle events
     *
     * Idempotency:
     * - Checks PaymentWebhook.stripeEventId before processing
     * - Marks processed = true after completion
     * - Stores error if processing fails
     *
     * @param signature - Stripe-Signature header value
     * @param payload - Raw request body buffer
     * @returns Promise<Object> Success status and optional message
     * @throws {Error} When signature verification fails or webhook secret not configured
     *
     * @example
     * // In webhook route:
     * const result = await StripeService.handleWebhook(
     *   req.headers['stripe-signature'],
     *   req.rawBody
     * );
     * console.log(result.success); // true
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
     * Generate tax-compliant receipt for payment
     *
     * Creates receipt number in format: UWR-{year}-{paymentId-last8}
     * Retrieves Stripe charge receipt URL and updates payment record.
     *
     * Tax-deductible donations include 501(c)(3) information in receipt.
     * Standard receipts generated for non-deductible fees.
     *
     * @param paymentId - Payment ID to generate receipt for
     * @returns Promise<void> Receipt data stored in payment record
     * @throws {Error} When payment not found or Stripe API fails
     *
     * @example
     * await StripeService.generateReceipt('pay_123');
     * // Creates receipt: UWR-2025-ABC12345
     * // Updates payment.receiptUrl, receiptNumber, receiptSent, receiptSentAt
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