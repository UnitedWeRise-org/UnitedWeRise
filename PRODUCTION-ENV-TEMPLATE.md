# Production Environment Variables for Stripe

## ⚠️ IMPORTANT: Switch to Live Stripe Keys

```env
# Stripe Configuration (LIVE - Production Only!)
STRIPE_SECRET_KEY="sk_live_YOUR_LIVE_SECRET_KEY"
STRIPE_PUBLISHABLE_KEY="pk_live_YOUR_LIVE_PUBLISHABLE_KEY" 
STRIPE_WEBHOOK_SECRET="whsec_YOUR_LIVE_WEBHOOK_SECRET"

# United We Rise 501(c)(3) EIN (get actual EIN)
TAX_EIN="99-2862201"  # United We Rise 501(c)(3) EIN

# Frontend URLs (update for production)
FRONTEND_URL="https://www.unitedwerise.org"
ALLOWED_ORIGINS="https://www.unitedwerise.org"
```

## 🔧 Azure Container Apps Environment Variables

Add these to your production container app:

```bash
# Set production Stripe keys in Azure
az containerapp update \
  -n unitedwerise-backend \
  -g unitedwerise-rg \
  --set-env-vars \
    "STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_KEY" \
    "STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_KEY" \
    "STRIPE_WEBHOOK_SECRET=whsec_YOUR_LIVE_WEBHOOK_SECRET" \
    "TAX_EIN=99-2862201"
```

## 📋 Production Checklist

### Before Going Live:
- [ ] Get live Stripe keys from dashboard
- [ ] Create production webhook endpoint
- [x] Update EIN with actual 501(c)(3) number (99-2862201)
- [ ] Test with small real donation
- [ ] Verify receipt generation works
- [ ] Test tax summary reports
- [ ] Confirm webhook processing
- [ ] Set up Stripe monitoring/alerts

### Stripe Dashboard Setup (Live Mode):
1. Toggle to "Live mode" 
2. Go to Developers → API keys → Get live keys
3. Create new webhook: https://www.unitedwerise.org/api/payments/webhook
4. Select same events: checkout.session.completed, payment_intent.succeeded, payment_intent.payment_failed
5. Copy webhook secret

### Frontend Changes Needed:
- Update Stripe publishable key in frontend
- Point donation forms to production backend
- Update success/cancel URLs
- Test payment flow end-to-end

## 🔒 Security Notes

- NEVER commit live keys to git
- Use Azure Key Vault for production secrets (optional)
- Monitor Stripe logs for unusual activity
- Set up alerts for failed payments
- Keep webhook endpoint secure