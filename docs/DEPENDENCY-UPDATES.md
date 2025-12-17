# Dependency Update History

This document tracks all dependency updates, their rationale, and any issues encountered. Use this for debugging dependency-related issues and planning future updates.

---

## Update Sessions

### 2025-12-17: Major Dependency Update Session

**Commit Range**: `8e902b0..53dd40b` (development branch)
**PRs Merged**: #26, #27, #28, #29, #30, #38 (combined)

#### Summary

Comprehensive update of all major version dependencies:

| Package | Previous | Updated | Type | Notes |
|---------|----------|---------|------|-------|
| typescript | 5.9.2 | 5.9.3 | Patch | Dev dependency |
| actions/checkout | 3 | 6 | Major | GitHub Actions |
| actions/setup-node | 4 | 6 | Major | GitHub Actions |
| github/codeql-action | 3 | 4 | Major | GitHub Actions |
| dependabot/fetch-metadata | 1 | 2 | Major | GitHub Actions |
| twilio | 4.23.0 | 5.10.5 | Major | SMS service |
| helmet | 7.2.0 | 8.1.0 | Major | Security middleware |
| express-rate-limit | 7.5.1 | 8.2.1 | Major | Rate limiting |
| uuid | 11.1.0 | 13.0.0 | Major | UUID generation |
| swagger-ui-express | 4.6.3 | 5.0.1 | Major | API docs |
| @faker-js/faker | 9.9.0 | 10.1.0 | Major | Test data (dev) |
| openai | 5.12.2 | 6.9.1 | Major | Azure OpenAI SDK |
| stripe | 18.4.0 | 20.0.0 | Major | Payment processing |
| zod | 3.23.8 | 4.1.12 | Major | Validation |

#### Code Changes

**Prisma Singleton Pattern Fixes** (in same commit):
- `src/routes/unifiedMessages.ts` - Use singleton
- `src/routes/candidatePolicyPlatform.ts` - Use singleton
- `src/services/visitorAnalytics.ts` - Use singleton
- `src/scripts/generate-test-users.ts` - Use singleton
- `src/scripts/check-database.ts` - Use singleton
- `src/services/moderationService.ts` - Cleanup import
- `src/services/reputationService.ts` - Cleanup import

#### Issues Encountered

1. **Zod 4.x + OpenAI 5.x conflict**
   - Zod 4 has peer dependency conflict with OpenAI 5
   - Solution: Update both together

2. **Package-lock.json merge conflicts**
   - Sequential PRs caused lock file conflicts
   - Solution: Combined remaining updates into single PR #38

#### NOT Updated (Blocked)

| Package | Target Version | Blocker |
|---------|---------------|---------|
| @prisma/client | 7.0.1 | Major breaking change - requires configuration migration |
| prisma | 7.0.1 | Same as above |

**Prisma 7.x Blocking Issue:**
- `datasource.url` no longer supported in schema.prisma
- Requires `prisma.config.ts` and PrismaClient constructor changes
- Separate migration task required

#### Verification

- Staging deployment: SUCCESS
- Health check: `https://dev-api.unitedwerise.org/health` - healthy
- Database: connected
- Release SHA: `53dd40b`

---

## Pending Updates

### High Priority

| Package | Current | Available | Risk | Blocker |
|---------|---------|-----------|------|---------|
| @prisma/client | 6.13.0 | 7.0.1 | HIGH | Config migration required |
| prisma | 6.13.0 | 7.0.1 | HIGH | Config migration required |

### Low Priority (Dependabot PRs)

Original Dependabot PRs that were superseded by our manual updates:
- #9, #10, #11, #12, #13, #14, #15, #16, #17, #18, #19 - Can be closed
- #22 - Prisma client - Do NOT merge (requires migration)
- #24 - Production dependencies group - Review individually

---

## Known Compatibility Notes

### OpenAI SDK (v6.x)
- Azure OpenAI configuration unchanged
- Response structure compatible
- O-series model parameters still work
- File: `src/services/azureOpenAIService.ts`

### Stripe SDK (v20.x)
- Payment Link API compatible
- Checkout session API compatible
- Webhook handling unchanged
- File: `src/services/stripeService.ts`

### Twilio SDK (v5.x)
- Client initialization unchanged
- Message API compatible
- File: `src/services/smsService.ts`

### Zod (v4.x)
- `.safeParse()` API compatible
- `.error.issues` structure compatible
- Only used in `src/routes/candidates.ts`

---

## Troubleshooting Guide

### If AI Features Break (OpenAI)
1. Check `AZURE_OPENAI_ENDPOINT` and `AZURE_OPENAI_API_KEY`
2. Verify model deployments exist
3. Check `azureOpenAIService.ts` for API changes
4. Rollback: `npm install openai@5.12.2`

### If Payments Break (Stripe)
1. Check `STRIPE_SECRET_KEY` environment variable
2. Verify webhook endpoint signatures
3. Test in Stripe dashboard test mode
4. Rollback: `npm install stripe@18.4.0`

### If SMS Breaks (Twilio)
1. Check `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN`
2. Verify phone number configuration
3. Test with Twilio console
4. Rollback: `npm install twilio@4.23.0`

### If Validation Breaks (Zod)
1. Check `src/routes/candidates.ts` for schema issues
2. Verify error response structure
3. Rollback: `npm install zod@3.23.8`

---

## Update Checklist Template

For future update sessions, copy this checklist:

```markdown
## [Date]: [Update Description]

### Pre-Update
- [ ] Read changelogs/release notes
- [ ] Identify breaking changes
- [ ] Check peer dependencies
- [ ] Create feature branch

### Update Process
- [ ] Install packages
- [ ] Build passes
- [ ] No TypeScript errors
- [ ] Commit and push

### Validation
- [ ] PR created
- [ ] CI checks pass
- [ ] Merged to development
- [ ] Staging deployment successful
- [ ] Health check passes

### Documentation
- [ ] Added to this file
- [ ] CHANGELOG updated (if significant)
- [ ] Any code changes documented
```
