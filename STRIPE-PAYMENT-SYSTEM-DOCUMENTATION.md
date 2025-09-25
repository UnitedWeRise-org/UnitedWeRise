# United We Rise - Stripe Payment System Documentation

**Version**: 1.0
**Last Updated**: September 25, 2025
**Status**: Live Production System
**Compliance**: 501(c)(3) Tax-Deductible Donations & Non-Deductible Fees

---

## 🎯 Executive Summary

United We Rise operates a comprehensive Stripe-powered payment system supporting both **tax-deductible donations** and **non-deductible fees**. The system processes all payments through Stripe's secure infrastructure, automatically generates tax-compliant receipts, and maintains detailed records for IRS compliance.

### Key Financial Metrics
- **Payment Types**: Donations (tax-deductible) + Fees (non-deductible)
- **Processing Volume**: Production-ready for high-volume transactions
- **Tax Compliance**: Full 501(c)(3) nonprofit compliance with receipt generation
- **Security Level**: PCI-compliant through Stripe's infrastructure

---

## 🏗️ System Architecture

### Core Components
```
┌─────────────────────────────────────────────────────────┐
│                    PAYMENT FLOW                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Frontend (donation-system.js)                         │
│           ↓                                             │
│  API Routes (/api/payments/*)                           │
│           ↓                                             │
│  StripeService (payment processing)                     │
│           ↓                                             │
│  Stripe Checkout/Payment Links                          │
│           ↓                                             │
│  Webhook Processing (/api/payments/webhook)             │
│           ↓                                             │
│  Receipt Generation & Database Updates                  │
│           ↓                                             │
│  Tax Summary Reports                                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Database Schema
```sql
-- Core payment tracking
Payment {
  id: String (primary key)
  userId: String (references User)
  amount: Int (in cents)
  type: PaymentType (DONATION | FEE)
  status: PaymentStatus
  taxDeductible: Boolean
  taxYear: Int
  receiptUrl: String
  receiptNumber: String
  stripePaymentIntentId: String
  stripeChargeId: String
  stripeCustomerId: String
  donationType: DonationType (optional)
  feeType: FeeType (optional)
  campaignId: String (optional)
  isRecurring: Boolean
  recurringInterval: RecurringInterval (optional)
}

-- Stripe customer management
StripeCustomer {
  userId: String (unique)
  stripeCustomerId: String (unique)
  email: String
  name: String
  address: Json
}

-- Webhook tracking for reliability
PaymentWebhook {
  stripeEventId: String (unique)
  eventType: String
  processed: Boolean
  payload: Json
  error: String (optional)
}

-- Refund handling
Refund {
  paymentId: String (references Payment)
  amount: Int
  reason: RefundReason
  status: RefundStatus
  stripeRefundId: String
}

-- Campaign tracking
DonationCampaign {
  id: String
  name: String
  description: String
  goal: Int (optional)
  raised: Int (auto-calculated)
  featured: Boolean
}
```

---

## 💳 Payment Types & Business Rules

### 1. Tax-Deductible Donations (`PaymentType.DONATION`)

**IRS Compliance**: Full 501(c)(3) nonprofit donation handling
**Tax Status**: `taxDeductible: true`
**Processing Method**: Stripe Payment Links (adblocker-resistant)

#### Donation Types:
- `ONE_TIME`: Single donation
- `RECURRING`: Subscription-based recurring donations
- `CAMPAIGN_SPECIFIC`: Targeted campaign donations
- `GENERAL_SUPPORT`: Unrestricted organizational support
- `MEMORIAL`: In memory of someone
- `HONOR`: In honor of someone

#### Recurring Intervals:
- `WEEKLY`: Every 7 days
- `MONTHLY`: Every month (most common)
- `QUARTERLY`: Every 3 months
- `YEARLY`: Annual donations

#### Business Rules:
- ✅ Minimum donation: $1.00 (`amount >= 100` cents)
- ✅ Maximum donation: $10,000 per transaction
- ✅ All donations generate tax receipts automatically
- ✅ Campaign donations increment campaign `raised` amount
- ✅ Recurring donations create Stripe subscriptions

### 2. Non-Deductible Fees (`PaymentType.FEE`)

**Tax Status**: `taxDeductible: false`
**Processing Method**: Stripe Checkout Sessions

#### Fee Types:
- `CANDIDATE_REGISTRATION`: Political candidate registration fees ($25-$500)
- `VERIFICATION_FEE`: Identity verification services
- `PREMIUM_FEATURES`: Enhanced platform access
- `EVENT_HOSTING`: Event creation and promotion
- `ADVERTISING`: Campaign advertisement placement
- `OTHER`: Miscellaneous platform fees

#### Business Rules:
- ✅ Minimum fee: $1.00
- ✅ Candidate registration fees automatically advance registration status
- ✅ Standard receipts generated (non-tax-deductible)
- ✅ Integrated with candidate verification workflow

---

## 🌐 API Endpoints Documentation

### Payment Creation

#### `POST /api/payments/donation`
**Purpose**: Create tax-deductible donation
**Authentication**: Required (Bearer token)

**Request Body**:
```json
{
  "amount": 2500,                    // $25.00 in cents
  "donationType": "ONE_TIME",        // or RECURRING, CAMPAIGN_SPECIFIC, etc.
  "campaignId": "optional-campaign-id",
  "isRecurring": false,
  "recurringInterval": "MONTHLY"     // required if isRecurring: true
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "paymentId": "payment-uuid",
    "checkoutUrl": "https://checkout.stripe.com/c/pay/...",
    "paymentLinkId": "plink_xxx"     // for Payment Links
  }
}
```

#### `POST /api/payments/fee`
**Purpose**: Create non-deductible fee payment
**Authentication**: Required (Bearer token)

**Request Body**:
```json
{
  "amount": 5000,                    // $50.00 in cents
  "feeType": "CANDIDATE_REGISTRATION",
  "candidateRegistrationId": "optional-reg-id",
  "description": "Optional description"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "paymentId": "payment-uuid",
    "checkoutUrl": "https://checkout.stripe.com/c/pay/...",
    "sessionId": "cs_xxx"            // for Checkout Sessions
  }
}
```

### Payment Information

#### `GET /api/payments/history`
**Purpose**: Get user's payment history
**Authentication**: Required
**Query Parameters**:
- `type`: Filter by payment type (DONATION | FEE)
- `limit`: Number of records (default: 10)
- `offset`: Pagination offset (default: 0)

**Response**:
```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "id": "payment-id",
        "amount": 2500,
        "type": "DONATION",
        "status": "COMPLETED",
        "taxDeductible": true,
        "createdAt": "2025-09-25T10:00:00Z",
        "receiptNumber": "UWR-2025-12345678"
      }
    ],
    "total": 15,
    "hasMore": true
  }
}
```

#### `GET /api/payments/receipt/:paymentId`
**Purpose**: Get specific payment receipt
**Authentication**: Required (user can only access own receipts)

**Response**:
```json
{
  "success": true,
  "data": {
    "receiptUrl": "https://pay.stripe.com/receipts/...",
    "receiptNumber": "UWR-2025-12345678",
    "taxDeductible": true,
    "amount": 2500,
    "date": "2025-09-25T10:00:00Z"
  }
}
```

#### `GET /api/payments/tax-summary/:year`
**Purpose**: Generate annual tax summary for deductible donations
**Authentication**: Required

**Response**:
```json
{
  "success": true,
  "data": {
    "year": 2025,
    "totalDonations": 75000,         // $750.00 total for year
    "donationCount": 3,
    "donations": [
      {
        "id": "payment-id",
        "amount": 25000,
        "date": "2025-01-15T10:00:00Z",
        "receiptNumber": "UWR-2025-12345678",
        "description": "Donation to United We Rise"
      }
    ],
    "taxMessage": "United We Rise is a registered 501(c)(3) nonprofit organization. Your donations are tax-deductible to the extent allowed by law. EIN: XX-XXXXXXX"
  }
}
```

#### `GET /api/payments/campaigns`
**Purpose**: Get active donation campaigns
**Authentication**: None required

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "campaign-id",
      "name": "Civic Engagement Initiative",
      "description": "Supporting democratic participation...",
      "goal": 500000,              // $5,000 goal
      "raised": 125000,            // $1,250 raised
      "featured": true,
      "startDate": "2025-01-01T00:00:00Z",
      "endDate": null,             // ongoing
      "isActive": true
    }
  ]
}
```

### Webhook Processing

#### `POST /api/payments/webhook`
**Purpose**: Handle Stripe webhook events
**Authentication**: Stripe signature verification
**Content-Type**: `application/json` (raw body required)

**Supported Events**:
- `checkout.session.completed`: Payment completion
- `payment_intent.succeeded`: Direct payment success
- `payment_intent.payment_failed`: Payment failure
- `customer.subscription.created/updated`: Recurring donation changes
- `customer.subscription.deleted`: Recurring donation cancellation

---

## 🎨 Frontend Integration

### DonationSystem Class

Located in: `frontend/src/js/donation-system.js`

**Initialization**:
```javascript
import { DonationSystem, initializeDonationSystem } from './donation-system.js';

// Auto-initialization
const donationSystem = initializeDonationSystem();

// Manual initialization
const donationSystem = new DonationSystem();
```

### Key Features:

#### 1. **Modal-Based Donation Interface**
- Responsive design with mobile optimization
- Preset amount buttons ($10, $25, $50, $100, $250, $500)
- Custom amount input with validation
- One-time vs recurring donation selection

#### 2. **Adblocker-Resistant Payment Processing**
- Primary: Direct redirect to Stripe Checkout
- Fallback: Manual link with instructions
- User guidance for adblocker issues

#### 3. **Integration with Main Application**
- Sidebar donation button (`💝 Donate`)
- Automatic user authentication check
- Environment-aware API routing

### Frontend Payment Flow:

```javascript
// 1. User clicks donate button
donationSystem.openDonationModal();

// 2. User selects amount and type
donationSystem.selectAmount(button);
donationSystem.updateDonationType('MONTHLY');

// 3. Process donation
async processDonation() {
  const response = await window.apiCall('/payments/donation', {
    method: 'POST',
    body: { amount: 2500, donationType: 'ONE_TIME' }
  });

  if (response.data.success) {
    // Redirect to Stripe Checkout
    window.location.href = response.data.data.checkoutUrl;
  }
}
```

### Success Page Integration

**File**: `frontend/donation-success.html`

**Features**:
- Automatic payment details retrieval via URL parameters
- Tax receipt information display
- Print receipt functionality
- Return to platform link

---

## 🔄 Webhook Event Processing

### Event Handling Architecture

**Webhook Endpoint**: `POST /api/payments/webhook`
**Security**: Stripe signature verification required
**Idempotency**: Duplicate event prevention via database tracking

### Supported Webhook Events:

#### 1. `checkout.session.completed`
**Trigger**: User completes Stripe Checkout
**Actions**:
- Update payment status to `COMPLETED`
- Generate tax receipt automatically
- Update candidate registration status (if applicable)
- Increment campaign raised amount
- Send confirmation notifications

```javascript
await this.handleCheckoutComplete(session);
// - payment.status = COMPLETED
// - payment.processedAt = new Date()
// - Generate receipt
// - Update related records
```

#### 2. `payment_intent.succeeded`
**Trigger**: Payment Link payment succeeds
**Actions**:
- Update payment status
- Record Stripe charge ID
- Process recurring payments

#### 3. `payment_intent.payment_failed`
**Trigger**: Payment fails
**Actions**:
- Update payment status to `FAILED`
- Record failure reason
- Log for admin review

#### 4. Subscription Events
**Events**: `customer.subscription.created/updated/deleted`
**Actions**:
- Manage recurring donation status
- Handle subscription changes
- Process cancellations

### Webhook Reliability Features:

#### 1. **Idempotent Processing**
```sql
-- Prevent duplicate processing
PaymentWebhook {
  stripeEventId: String @unique
  processed: Boolean
  processedAt: DateTime
}
```

#### 2. **Error Handling**
- Failed webhooks logged with error details
- Automatic retry via Stripe's built-in retry logic
- Manual reprocessing capability

#### 3. **Event Tracking**
- All webhook events stored permanently
- Processing status tracking
- Error logging for debugging

---

## 📄 Tax Receipt Generation System

### Receipt Architecture

**Generation**: Automatic upon payment completion
**Format**: Stripe-hosted receipts + custom receipt numbers
**Compliance**: Full 501(c)(3) tax-deductible receipt requirements

### Receipt Number Format:
```
UWR-{YEAR}-{PAYMENT_ID_LAST_8_CHARS}
Example: UWR-2025-A1B2C3D4
```

### Receipt Generation Process:

#### 1. **Automatic Generation**
```javascript
static async generateReceipt(paymentId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { user: true }
  });

  const receiptNumber = `UWR-${new Date().getFullYear()}-${payment.id.slice(-8).toUpperCase()}`;

  // Get Stripe-hosted receipt URL
  const charge = await stripe.charges.retrieve(payment.stripeChargeId);

  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      receiptUrl: charge.receipt_url,
      receiptNumber,
      receiptSent: true,
      receiptSentAt: new Date()
    }
  });
}
```

#### 2. **Receipt Content**
- **Tax-Deductible Receipts**: Include 501(c)(3) information, EIN, tax-deductible statement
- **Non-Deductible Receipts**: Standard payment receipt without tax language
- **Contact Information**: United We Rise organization details
- **Payment Details**: Amount, date, payment method, description

#### 3. **Delivery Methods**
- **Primary**: Stripe's email receipt system
- **Secondary**: API endpoint for receipt retrieval
- **Backup**: Printable format on success page

### Tax Compliance Features:

#### Annual Tax Summary Generation
```sql
-- Query for annual donations
SELECT * FROM payments
WHERE userId = ?
  AND type = 'DONATION'
  AND taxDeductible = true
  AND status = 'COMPLETED'
  AND processedAt >= '2025-01-01'
  AND processedAt < '2026-01-01'
ORDER BY processedAt ASC;
```

#### Tax-Deductible Statement:
> "United We Rise is a registered 501(c)(3) nonprofit organization. Your donations are tax-deductible to the extent allowed by law. EIN: XX-XXXXXXX"

---

## 🔒 Security & Compliance Measures

### PCI Compliance
- **Level**: PCI DSS compliant via Stripe (UWR never handles card data)
- **Card Data**: Never stored or processed on UWR servers
- **Tokenization**: All payments use Stripe's secure tokenization
- **SSL/TLS**: All communications encrypted in transit

### Data Protection

#### 1. **Customer Data Handling**
- Stripe Customer IDs linked to user accounts
- No sensitive payment data stored locally
- Customer addresses stored in JSON format (optional)
- Email addresses synchronized with user accounts

#### 2. **Payment Data Security**
```javascript
// Safe data storage - no sensitive information
Payment {
  stripePaymentIntentId: "pi_xxx",    // Safe to store
  stripeChargeId: "ch_xxx",           // Safe to store
  stripeCustomerId: "cus_xxx",        // Safe to store
  // NO card numbers, CVV, or payment method details
}
```

#### 3. **Environment Variable Security**
```env
# Production secrets (Azure Key Vault managed)
STRIPE_SECRET_KEY="sk_live_xxx"           # Live secret key
STRIPE_WEBHOOK_SECRET="whsec_xxx"         # Webhook signature verification
TAX_EIN="XX-XXXXXXX"                      # 501(c)(3) EIN
```

### Authentication & Authorization

#### 1. **API Security**
- All payment endpoints require user authentication
- Users can only access their own payment records
- Admin endpoints protected with `isAdmin` checks
- Receipt access restricted to payment owner

#### 2. **Webhook Security**
```javascript
// Stripe signature verification
const signature = req.headers['stripe-signature'];
const event = stripe.webhooks.constructEvent(
  payload,
  signature,
  process.env.STRIPE_WEBHOOK_SECRET
);
```

### Financial Security Measures

#### 1. **Fraud Prevention**
- Stripe Radar integration for fraud detection
- Recurring payment monitoring
- Suspicious activity alerts
- Payment amount limits enforced

#### 2. **Refund Security**
- Admin-only refund processing
- Full refund audit trail
- Automatic tax adjustment handling
- Stripe-level refund verification

---

## 🚀 Deployment & Environment Configuration

### Production Environment Setup

#### Stripe Configuration
```bash
# Azure Container Apps environment variables
az containerapp update \
  --name unitedwerise-backend \
  --resource-group unitedwerise-rg \
  --set-env-vars \
    "STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_SECRET_KEY" \
    "STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_PUBLISHABLE_KEY" \
    "STRIPE_WEBHOOK_SECRET=whsec_YOUR_LIVE_WEBHOOK_SECRET" \
    "TAX_EIN=XX-XXXXXXX" \
    "FRONTEND_URL=https://www.unitedwerise.org" \
    "SUCCESS_URL=https://www.unitedwerise.org/donation-success.html"
```

#### Webhook Configuration
- **Production Webhook URL**: `https://api.unitedwerise.org/api/payments/webhook`
- **Staging Webhook URL**: `https://dev-api.unitedwerise.org/api/payments/webhook`
- **Events to Subscribe**: All payment-related events
- **Signature Verification**: Required for all environments

### Environment Differences

#### Production
- **Stripe Mode**: Live mode with real payments
- **Database**: Production PostgreSQL database
- **Email Receipts**: Real email delivery
- **Webhook Processing**: Full event processing
- **Error Handling**: Production error logging

#### Staging/Development
- **Stripe Mode**: Test mode with test cards
- **Database**: Isolated development database
- **Admin Access**: Required for all protected routes
- **Testing**: Safe environment for payment testing

---

## 🛠️ Error Handling & Recovery

### Payment Failure Handling

#### 1. **Frontend Error Display**
```javascript
// User-friendly error messages
catch (error) {
  errorDiv.innerHTML = `
    <strong>Unable to process donation</strong><br>
    ${error.message}<br>
    <small>
      If you have an ad blocker enabled, please try:
      <ul>
        <li>Disabling your ad blocker for this site</li>
        <li>Using a different browser</li>
        <li>Opening in an incognito/private window</li>
      </ul>
    </small>
  `;
}
```

#### 2. **Backend Error Recovery**
```javascript
// Payment creation error handling
try {
  const result = await StripeService.createDonation(params);
  return { success: true, data: result };
} catch (error) {
  // Update payment status to failed
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: PaymentStatus.FAILED,
      failureReason: error.message
    }
  });
  throw error;
}
```

### Webhook Failure Recovery

#### 1. **Retry Logic**
- Stripe automatically retries failed webhooks
- Up to 3 days of retry attempts
- Exponential backoff timing

#### 2. **Manual Recovery**
```sql
-- Find failed webhook events
SELECT * FROM PaymentWebhook
WHERE processed = false
  AND error IS NOT NULL
ORDER BY createdAt DESC;

-- Reprocess webhook manually
UPDATE PaymentWebhook
SET processed = false, error = NULL
WHERE stripeEventId = 'evt_xxx';
```

### Database Consistency

#### 1. **Payment Status Tracking**
```sql
-- Payment status progression
PENDING → PROCESSING → COMPLETED
PENDING → FAILED
COMPLETED → REFUNDED/PARTIAL_REFUNDED
```

#### 2. **Transaction Integrity**
- Database transactions for complex operations
- Rollback on failures
- Consistent state maintenance

---

## 📊 Monitoring & Analytics

### Payment Metrics

#### Key Performance Indicators
- **Total Donations**: Sum of all completed donations
- **Average Donation Amount**: Mean donation value
- **Recurring vs One-time**: Ratio of payment types
- **Campaign Performance**: Donations per campaign
- **Payment Success Rate**: Completion vs failure ratio

#### Database Queries for Metrics
```sql
-- Total donations this year
SELECT SUM(amount) as total_donations
FROM payments
WHERE type = 'DONATION'
  AND status = 'COMPLETED'
  AND taxDeductible = true
  AND EXTRACT(year FROM processedAt) = 2025;

-- Monthly donation trends
SELECT
  DATE_TRUNC('month', processedAt) as month,
  COUNT(*) as donation_count,
  SUM(amount) as total_amount
FROM payments
WHERE type = 'DONATION'
  AND status = 'COMPLETED'
GROUP BY month
ORDER BY month DESC;

-- Campaign performance
SELECT
  dc.name,
  dc.goal,
  dc.raised,
  COUNT(p.id) as donation_count
FROM donation_campaigns dc
LEFT JOIN payments p ON p.campaignId = dc.id
WHERE dc.isActive = true
GROUP BY dc.id, dc.name, dc.goal, dc.raised;
```

### Error Monitoring

#### Payment Failures
```sql
-- Recent payment failures
SELECT
  p.id,
  p.amount,
  p.failureReason,
  p.createdAt,
  u.email
FROM payments p
JOIN users u ON u.id = p.userId
WHERE p.status = 'FAILED'
  AND p.createdAt >= NOW() - INTERVAL '7 days'
ORDER BY p.createdAt DESC;
```

#### Webhook Processing Issues
```sql
-- Failed webhook events
SELECT
  eventType,
  error,
  createdAt,
  processed
FROM payment_webhooks
WHERE processed = false
  AND error IS NOT NULL
ORDER BY createdAt DESC;
```

---

## 🔧 Maintenance & Operations

### Regular Maintenance Tasks

#### Daily
- [ ] Monitor payment processing status
- [ ] Check for failed webhook events
- [ ] Review error logs for payment issues
- [ ] Verify receipt generation working

#### Weekly
- [ ] Generate donation summary reports
- [ ] Review campaign performance metrics
- [ ] Check recurring payment health
- [ ] Update tax summary data

#### Monthly
- [ ] Reconcile Stripe dashboard with database
- [ ] Generate monthly financial reports
- [ ] Review and update payment limits
- [ ] Test payment flows end-to-end

#### Quarterly
- [ ] Update tax receipt templates
- [ ] Review and update fee structures
- [ ] Audit payment security measures
- [ ] Test disaster recovery procedures

### Troubleshooting Guide

#### Common Issues

1. **"Payment not completing after Stripe redirect"**
   - **Cause**: Webhook not processed
   - **Solution**: Check webhook logs, reprocess if needed
   - **Prevention**: Monitor webhook processing regularly

2. **"Receipt not generated"**
   - **Cause**: Missing Stripe charge ID
   - **Solution**: Manually trigger receipt generation
   - **Code**: `await StripeService.generateReceipt(paymentId)`

3. **"Recurring payment failed"**
   - **Cause**: Expired card or insufficient funds
   - **Solution**: Stripe handles retry automatically
   - **Action**: Customer notification via Stripe email

4. **"Campaign total not updating"**
   - **Cause**: Webhook processing failure
   - **Solution**: Recalculate campaign totals
   - **Query**:
   ```sql
   UPDATE donation_campaigns
   SET raised = (
     SELECT COALESCE(SUM(amount), 0)
     FROM payments
     WHERE campaignId = donation_campaigns.id
       AND status = 'COMPLETED'
   );
   ```

---

## 🎯 Performance Optimization

### Database Performance

#### Indexes
```sql
-- Critical indexes for payment queries
CREATE INDEX idx_payments_user_id ON payments(userId);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_type_tax ON payments(type, taxDeductible);
CREATE INDEX idx_payments_processed_at ON payments(processedAt);
CREATE INDEX idx_payments_campaign_id ON payments(campaignId);
CREATE INDEX idx_webhook_stripe_event ON payment_webhooks(stripeEventId);
CREATE INDEX idx_webhook_processed ON payment_webhooks(processed);
```

#### Query Optimization
- Use pagination for payment history (limit/offset)
- Pre-calculate campaign totals via triggers
- Cache annual tax summaries
- Optimize webhook event processing

### Stripe API Performance

#### Rate Limiting
- Stripe API limits: 100 requests per second
- Webhook processing: No rate limits
- Use pagination for bulk operations
- Implement retry logic for rate limit errors

#### Connection Optimization
- Reuse Stripe client instances
- Connection pooling for database
- Async processing for non-critical operations

---

## 🧪 Testing Procedures

### Payment Testing

#### Test Cards (Development)
```javascript
// Stripe test cards
const testCards = {
  success: '4242424242424242',
  declined: '4000000000000002',
  insufficient_funds: '4000000000009995',
  requires_authentication: '4000002500003155'
};
```

#### Test Scenarios

1. **Successful Donation Flow**
   - Create donation with test card
   - Verify webhook processing
   - Check receipt generation
   - Confirm database updates

2. **Failed Payment Handling**
   - Use declined test card
   - Verify error handling
   - Check payment status updates
   - Test user error messages

3. **Recurring Payment Testing**
   - Create recurring donation
   - Verify subscription creation
   - Test webhook events
   - Check cancellation flow

4. **Refund Testing**
   - Process successful payment
   - Initiate refund via Stripe dashboard
   - Verify webhook processing
   - Check database updates

### Security Testing

#### Webhook Security
```bash
# Test webhook signature verification
curl -X POST https://api.unitedwerise.org/api/payments/webhook \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: invalid_signature" \
  -d '{"type": "test.event"}'
# Should return 400 error
```

#### Authentication Testing
```bash
# Test protected endpoints
curl -X GET https://api.unitedwerise.org/api/payments/history
# Should return 401 unauthorized

curl -X GET https://api.unitedwerise.org/api/payments/history \
  -H "Authorization: Bearer valid_token"
# Should return payment data
```

---

## 📝 Development Guidelines

### Code Standards

#### Error Handling
```javascript
// Always wrap Stripe operations in try-catch
try {
  const result = await stripe.operation();
  return { success: true, data: result };
} catch (error) {
  console.error('Stripe operation failed:', error);
  throw new Error('User-friendly error message');
}
```

#### Database Operations
```javascript
// Use transactions for complex operations
const transaction = await prisma.$transaction(async (prisma) => {
  const payment = await prisma.payment.create({...});
  await prisma.donationCampaign.update({...});
  return payment;
});
```

#### Webhook Processing
```javascript
// Always check for duplicate processing
const existingWebhook = await prisma.paymentWebhook.findUnique({
  where: { stripeEventId: event.id }
});

if (existingWebhook?.processed) {
  return { success: true, message: 'Event already processed' };
}
```

### API Design Principles

1. **Consistent Response Format**
```json
{
  "success": true|false,
  "data": { ... },
  "error": "Error message if success=false"
}
```

2. **Proper HTTP Status Codes**
- 200: Success
- 400: Bad Request (validation errors)
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

3. **Input Validation**
- Use express-validator for all inputs
- Validate amounts (minimum $1.00)
- Check enum values for types
- Sanitize user inputs

---

## 📋 Production Readiness Checklist

### Pre-Launch Requirements

#### Stripe Configuration
- [ ] Switch to live Stripe API keys
- [ ] Configure production webhook endpoint
- [ ] Test live payments with real cards
- [ ] Set up Stripe monitoring and alerts
- [ ] Configure tax settings in Stripe dashboard

#### Tax Compliance
- [ ] Obtain official 501(c)(3) EIN number
- [ ] Update EIN in all systems and templates
- [ ] Verify tax-deductible receipt format
- [ ] Set up annual tax summary generation
- [ ] Configure compliance reporting

#### Security Validation
- [ ] Audit all payment endpoints
- [ ] Test webhook signature verification
- [ ] Validate PCI compliance via Stripe
- [ ] Review error handling procedures
- [ ] Test rate limiting and security headers

#### Operational Readiness
- [ ] Set up payment monitoring dashboards
- [ ] Configure error alerting system
- [ ] Document troubleshooting procedures
- [ ] Train support staff on payment issues
- [ ] Establish financial reconciliation process

#### Testing Validation
- [ ] End-to-end payment flow testing
- [ ] Multi-browser compatibility testing
- [ ] Mobile payment testing
- [ ] Error scenario testing
- [ ] Performance testing under load

### Launch Day Procedures

1. **Final Environment Switch**
   - Deploy with live Stripe keys
   - Update webhook URLs
   - Verify all integrations

2. **Initial Testing**
   - Process small test donation
   - Verify receipt generation
   - Check webhook processing
   - Confirm database updates

3. **Monitoring Setup**
   - Enable payment monitoring
   - Set up alert notifications
   - Monitor error logs
   - Track key metrics

---

## 📞 Support & Contact Information

### Internal Support Contacts
- **Technical Issues**: Development Team
- **Financial Questions**: Finance Team
- **Compliance Matters**: Legal Team
- **User Support**: Customer Success Team

### External Support Resources
- **Stripe Support**: https://support.stripe.com/
- **Stripe Dashboard**: https://dashboard.stripe.com/
- **IRS 501(c)(3) Guidelines**: https://www.irs.gov/charities-non-profits/

### Emergency Procedures
- **Payment System Down**: Contact development team immediately
- **Webhook Failures**: Check Stripe dashboard and logs
- **Financial Discrepancies**: Contact finance team for reconciliation
- **Security Issues**: Follow incident response procedures

---

**Document Version**: 1.0
**Last Review**: September 25, 2025
**Next Review**: December 25, 2025
**Maintained By**: United We Rise Development Team