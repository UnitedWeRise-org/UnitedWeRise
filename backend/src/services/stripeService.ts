import Stripe from 'stripe';
import { PrismaClient, PaymentType, PaymentStatus, FeeType, DonationType } from '@prisma/client';

const prisma = new PrismaClient();

// Initialize Stripe with nonprofit account
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  typescript: true,
});

export class StripeService {
  /**
   * Create or get Stripe customer for a user
   */
  static async getOrCreateCustomer(userId: string): Promise<string> {
    // Check if customer already exists
    const existingCustomer = await prisma.stripeCustomer.findUnique({
      where: { userId },
      include: { user: true }
    });

    if (existingCustomer) {
      return existingCustomer.stripeCustomerId;
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Create Stripe customer
    const customer = await stripe.customers.create({
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      metadata: {
        userId: user.id,
        platform: 'UnitedWeRise'
      }
    });

    // Save customer to database
    await prisma.stripeCustomer.create({
      data: {
        userId,
        stripeCustomerId: customer.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        address: user.streetAddress ? {
          line1: user.streetAddress,
          city: user.city || '',
          state: user.state || '',
          postal_code: user.zipCode || '',
          country: 'US'
        } : null
      }
    });

    return customer.id;
  }

  /**
   * Create a tax-deductible donation
   */
  static async createDonation(params: {
    userId: string;
    amount: number; // In cents
    donationType: DonationType;
    campaignId?: string;
    isRecurring?: boolean;
    recurringInterval?: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  }) {
    const customerId = await this.getOrCreateCustomer(params.userId);

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        userId: params.userId,
        amount: params.amount,
        type: PaymentType.DONATION,
        status: PaymentStatus.PENDING,
        taxDeductible: true, // Donations are tax-deductible
        taxYear: new Date().getFullYear(),
        stripeCustomerId: customerId,
        donationType: params.donationType,
        campaignId: params.campaignId,
        isRecurring: params.isRecurring || false,
        recurringInterval: params.recurringInterval,
        description: `Donation to United We Rise`
      }
    });

    try {
      if (params.isRecurring && params.recurringInterval) {
        // Create subscription for recurring donation
        const price = await stripe.prices.create({
          unit_amount: params.amount,
          currency: 'usd',
          recurring: {
            interval: this.mapRecurringInterval(params.recurringInterval)
          },
          product_data: {
            name: 'United We Rise Recurring Donation',
            metadata: {
              taxDeductible: 'true',
              donationType: params.donationType
            }
          }
        });

        // Return checkout session for subscription
        const session = await stripe.checkout.sessions.create({
          customer: customerId,
          payment_method_types: ['card'],
          line_items: [{
            price: price.id,
            quantity: 1
          }],
          mode: 'subscription',
          success_url: `${process.env.FRONTEND_URL}/donation/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${process.env.FRONTEND_URL}/donation/cancelled`,
          metadata: {
            paymentId: payment.id,
            userId: params.userId,
            taxDeductible: 'true'
          }
        });

        // Update payment with Stripe session ID
        await prisma.payment.update({
          where: { id: payment.id },
          data: { stripePaymentIntentId: session.id }
        });

        return {
          paymentId: payment.id,
          checkoutUrl: session.url,
          sessionId: session.id
        };
      } else {
        // One-time donation
        const session = await stripe.checkout.sessions.create({
          customer: customerId,
          payment_method_types: ['card'],
          line_items: [{
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'One-time Donation to United We Rise',
                description: 'Your tax-deductible donation supports civic engagement',
                metadata: {
                  taxDeductible: 'true'
                }
              },
              unit_amount: params.amount
            },
            quantity: 1
          }],
          mode: 'payment',
          success_url: `${process.env.FRONTEND_URL}/donation/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${process.env.FRONTEND_URL}/donation/cancelled`,
          metadata: {
            paymentId: payment.id,
            userId: params.userId,
            taxDeductible: 'true'
          }
        });

        // Update payment with Stripe session ID
        await prisma.payment.update({
          where: { id: payment.id },
          data: { stripePaymentIntentId: session.id }
        });

        return {
          paymentId: payment.id,
          checkoutUrl: session.url,
          sessionId: session.id
        };
      }
    } catch (error) {
      // Update payment status to failed
      await prisma.payment.update({
        where: { id: payment.id },
        data: { 
          status: PaymentStatus.FAILED,
          failureReason: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      throw error;
    }
  }

  /**
   * Create a non-deductible fee payment (e.g., candidate registration)
   */
  static async createFeePayment(params: {
    userId: string;
    amount: number; // In cents
    feeType: FeeType;
    candidateRegistrationId?: string;
    description?: string;
  }) {
    const customerId = await this.getOrCreateCustomer(params.userId);

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        userId: params.userId,
        amount: params.amount,
        type: PaymentType.FEE,
        status: PaymentStatus.PENDING,
        taxDeductible: false, // Fees are NOT tax-deductible
        stripeCustomerId: customerId,
        feeType: params.feeType,
        candidateRegistrationId: params.candidateRegistrationId,
        description: params.description || `${params.feeType} Fee`
      }
    });

    try {
      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: this.getFeeDescription(params.feeType),
              description: 'Non-tax-deductible fee',
              metadata: {
                taxDeductible: 'false',
                feeType: params.feeType
              }
            },
            unit_amount: params.amount
          },
          quantity: 1
        }],
        mode: 'payment',
        success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/payment/cancelled`,
        metadata: {
          paymentId: payment.id,
          userId: params.userId,
          taxDeductible: 'false',
          feeType: params.feeType,
          candidateRegistrationId: params.candidateRegistrationId || ''
        }
      });

      // Update payment with Stripe session ID
      await prisma.payment.update({
        where: { id: payment.id },
        data: { stripePaymentIntentId: session.id }
      });

      return {
        paymentId: payment.id,
        checkoutUrl: session.url,
        sessionId: session.id
      };
    } catch (error) {
      // Update payment status to failed
      await prisma.payment.update({
        where: { id: payment.id },
        data: { 
          status: PaymentStatus.FAILED,
          failureReason: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      throw error;
    }
  }

  /**
   * Handle Stripe webhook events
   */
  static async handleWebhook(signature: string, payload: Buffer) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('Stripe webhook secret not configured');
    }

    let event: Stripe.Event;
    
    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      throw new Error(`Webhook signature verification failed: ${err}`);
    }

    // Check if we've already processed this event
    const existingWebhook = await prisma.paymentWebhook.findUnique({
      where: { stripeEventId: event.id }
    });

    if (existingWebhook?.processed) {
      return { success: true, message: 'Event already processed' };
    }

    // Save webhook event
    await prisma.paymentWebhook.upsert({
      where: { stripeEventId: event.id },
      create: {
        stripeEventId: event.id,
        eventType: event.type,
        payload: event as any,
        processed: false
      },
      update: {
        payload: event as any
      }
    });

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
          break;
        
        case 'payment_intent.succeeded':
          await this.handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
          break;
        
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
          break;
        
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
          break;
        
        case 'customer.subscription.deleted':
          await this.handleSubscriptionCancelled(event.data.object as Stripe.Subscription);
          break;
        
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      // Mark webhook as processed
      await prisma.paymentWebhook.update({
        where: { stripeEventId: event.id },
        data: { processed: true, processedAt: new Date() }
      });

      return { success: true };
    } catch (error) {
      // Log error
      await prisma.paymentWebhook.update({
        where: { stripeEventId: event.id },
        data: { 
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      throw error;
    }
  }

  /**
   * Handle successful checkout
   */
  private static async handleCheckoutComplete(session: Stripe.Checkout.Session) {
    const paymentId = session.metadata?.paymentId;
    if (!paymentId) return;

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId }
    });

    if (!payment) return;

    // Update payment status
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.COMPLETED,
        processedAt: new Date(),
        stripeChargeId: session.payment_intent as string,
        paymentMethodType: session.payment_method_types?.[0] || 'card'
      }
    });

    // Generate receipt
    await this.generateReceipt(paymentId);

    // If this was a candidate registration fee, update the registration
    if (payment.candidateRegistrationId) {
      await prisma.candidateRegistration.update({
        where: { id: payment.candidateRegistrationId },
        data: {
          status: 'PENDING_VERIFICATION' // Move to next step after payment
          // Note: paymentCompletedAt field would need to be added to schema if needed
        }
      });
    }

    // Update campaign raised amount if applicable
    if (payment.campaignId) {
      await prisma.donationCampaign.update({
        where: { id: payment.campaignId },
        data: {
          raised: { increment: payment.amount }
        }
      });
    }
  }

  /**
   * Handle payment success
   */
  private static async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
    const payment = await prisma.payment.findUnique({
      where: { stripePaymentIntentId: paymentIntent.id }
    });

    if (!payment) return;

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.COMPLETED,
        processedAt: new Date(),
        stripeChargeId: paymentIntent.latest_charge as string
      }
    });
  }

  /**
   * Handle payment failure
   */
  private static async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    const payment = await prisma.payment.findUnique({
      where: { stripePaymentIntentId: paymentIntent.id }
    });

    if (!payment) return;

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.FAILED,
        failureReason: paymentIntent.last_payment_error?.message || 'Payment failed'
      }
    });
  }

  /**
   * Handle subscription updates
   */
  private static async handleSubscriptionUpdate(subscription: Stripe.Subscription) {
    // Handle recurring donation updates
    console.log('Subscription updated:', subscription.id);
  }

  /**
   * Handle subscription cancellation
   */
  private static async handleSubscriptionCancelled(subscription: Stripe.Subscription) {
    // Handle recurring donation cancellation
    console.log('Subscription cancelled:', subscription.id);
  }

  /**
   * Generate tax-compliant receipt
   */
  static async generateReceipt(paymentId: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { user: true }
    });

    if (!payment) return;

    const receiptNumber = `UWR-${new Date().getFullYear()}-${payment.id.slice(-8).toUpperCase()}`;

    // Create receipt in Stripe
    if (payment.stripeChargeId) {
      const charge = await stripe.charges.retrieve(payment.stripeChargeId);
      
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          receiptUrl: charge.receipt_url || undefined,
          receiptNumber,
          receiptSent: true,
          receiptSentAt: new Date()
        }
      });

      // TODO: Send email with receipt and tax information
      if (payment.taxDeductible) {
        // Include 501(c)(3) information in receipt
        console.log(`Tax-deductible receipt generated for payment ${paymentId}`);
      } else {
        // Standard receipt for non-deductible fees
        console.log(`Standard receipt generated for payment ${paymentId}`);
      }
    }
  }

  /**
   * Helper function to map recurring intervals
   */
  private static mapRecurringInterval(interval: string): Stripe.Price.Recurring.Interval {
    const mapping: Record<string, Stripe.Price.Recurring.Interval> = {
      'WEEKLY': 'week',
      'MONTHLY': 'month',
      'QUARTERLY': 'month', // Will need to handle with interval_count
      'YEARLY': 'year'
    };
    return mapping[interval] || 'month';
  }

  /**
   * Get fee description for display
   */
  private static getFeeDescription(feeType: FeeType): string {
    const descriptions: Record<FeeType, string> = {
      CANDIDATE_REGISTRATION: 'Candidate Registration Fee',
      VERIFICATION_FEE: 'Identity Verification Fee',
      PREMIUM_FEATURES: 'Premium Features Access',
      EVENT_HOSTING: 'Event Hosting Fee',
      ADVERTISING: 'Campaign Advertising Fee',
      OTHER: 'Platform Fee'
    };
    return descriptions[feeType] || 'Platform Fee';
  }
}