# Pino Logging Migration Guide - Week 4 Batch B Remaining Files

## Status: PARTIAL (1 of 10 files complete)

### Completed
- ✅ **candidates.ts** (21 calls) - Committed in `2018fc1`

### Remaining Files (89 console calls)

#### Priority 1 - High Call Count
1. **candidatePolicyPlatform.ts** (16 calls)
2. **civic.ts** (13 calls)
3. **onboarding.ts** (11 calls)

#### Priority 2 - Medium Call Count
4. **motd.ts** (10 calls)
5. **legislative.ts** (10 calls)

#### Priority 3 - Lower Call Count
6. **moderation.ts** (9 calls)
7. **elections.ts** (9 calls)
8. **crowdsourcing.ts** (9 calls)
9. **notifications.ts** (1 call - partial, line 16 console.warn)

---

## Migration Pattern (Follow This for Each File)

### Step 1: Add Logger Import
```typescript
// Add after other imports
import { logger } from '../services/logger';
```

### Step 2: Replace Console Calls with Structured Logging

#### Error Pattern
```typescript
// BEFORE:
console.error('Error message:', error);

// AFTER:
logger.error({ error, relevantId: value }, 'Error message');
```

#### Info Pattern
```typescript
// BEFORE:
console.log('Message');

// AFTER:
logger.info('Message');
```

#### With Context Pattern
```typescript
// BEFORE:
console.log(`Processing ${id} for user ${userId}`);

// AFTER:
logger.info({ id, userId }, 'Processing request');
```

### Step 3: Add Relevant Context to Each Log

**Error Logs Should Include:**
- `error` - The error object
- `userId` - When user is authenticated (from `req.user?.id`)
- Resource IDs - Any ID from params/body being operated on
- Request context - Relevant query params or body fields

**Info Logs Should Include:**
- Key identifiers (IDs, counts, etc.)
- Operational context (state, flags, etc.)

### Step 4: Verify Build
```bash
cd backend && npm run build
```

---

## File-Specific Notes

### candidatePolicyPlatform.ts (16 calls)
**Pattern:** Policy platform operations with candidateId context
```typescript
logger.error({ error, candidateId, userId }, 'Policy platform operation failed');
logger.info({ candidateId, policyCount }, 'Loading policy platform');
```

### civic.ts (13 calls)
**Pattern:** Civic API operations with location/state context
```typescript
logger.error({ error, state, zipCode }, 'Civic API operation failed');
logger.info({ state, requestType }, 'Civic data request');
```

### onboarding.ts (11 calls)
**Pattern:** User onboarding steps with userId and step context
```typescript
logger.error({ error, userId, step }, 'Onboarding step failed');
logger.info({ userId, step, completed }, 'Onboarding progress');
```

### motd.ts (10 calls)
**Pattern:** Message of the Day operations with motdId context
```typescript
logger.error({ error, motdId, userId }, 'MOTD operation failed');
logger.info({ motdId, action }, 'MOTD updated');
```

### legislative.ts (10 calls)
**Pattern:** Legislative data operations with bioguideId/state context
```typescript
logger.error({ error, bioguideId, state }, 'Legislative data operation failed');
logger.info({ bioguideId, recordCount }, 'Fetching voting records');
```

### moderation.ts (9 calls)
**Pattern:** Moderation operations with reportId/moderatorId context
```typescript
logger.error({ error, reportId, moderatorId }, 'Moderation action failed');
logger.info({ reportId, action }, 'Report processed');
```

### elections.ts (9 calls)
**Pattern:** Election operations with electionId/state context
```typescript
logger.error({ error, electionId, state }, 'Election operation failed');
logger.info({ state, electionCount, source }, 'Election data retrieved');
```

### crowdsourcing.ts (9 calls)
**Pattern:** Crowdsourcing operations with districtId/officeId context
```typescript
logger.error({ error, districtId, userId }, 'Crowdsourcing operation failed');
logger.info({ districtId, contributionType }, 'Contribution submitted');
```

### notifications.ts (1 call - line 16)
**Pattern:** WebSocket initialization warning
```typescript
// BEFORE (line 16):
console.warn('WebSocket service not available:', error);

// AFTER:
logger.warn({ error }, 'WebSocket service not available');
```

---

## Verification Checklist

For each file migrated:
- [ ] Import `logger` from `../services/logger`
- [ ] Replace ALL `console.log` → `logger.info`
- [ ] Replace ALL `console.error` → `logger.error`
- [ ] Replace ALL `console.warn` → `logger.warn`
- [ ] Add structured context objects (IDs, request data)
- [ ] Run `npm run build` - must succeed
- [ ] Grep for remaining console calls: `grep -n "console\." <file>`
- [ ] Commit with descriptive message

---

## Commit Message Template

```
feat: Week 4 Batch B - Migrate <filename> to Pino logging (N calls)

Migrated all N console calls in <filename> to structured Pino logging:

**Error Logging (X calls):**
- <Operation> → logger.error with <context>
- <Operation> → logger.error with <context>

**Info Logging (Y calls):**
- <Operation> → logger.info with <context>

**Structured Context Added:**
All logs include relevant IDs (<list>) for better debugging and tracing.

**Build Status:** ✅ Verified - TypeScript compilation successful

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Overall Progress Tracking

**Total Console Calls in Batch:** ~110
- ✅ Migrated: 21 (candidates.ts)
- ⏳ Remaining: 89
- 📊 Progress: 19% complete

**Next Actions:**
1. Migrate candidatePolicyPlatform.ts (16 calls)
2. Migrate civic.ts (13 calls)
3. Migrate onboarding.ts (11 calls)
4. Continue with remaining 7 files
5. Final verification grep across all route files
6. Update CHANGELOG.md with migration completion

---

## Common Patterns Reference

### Route Handler Errors
```typescript
} catch (error) {
  logger.error({
    error,
    userId: req.user?.id,
    resourceId: req.params.id,
    operation: 'operationName'
  }, 'Operation failed');
  res.status(500).json({ error: 'User-facing message' });
}
```

### Service Call Logging
```typescript
logger.info({
  userId,
  resourceId,
  parameters: { key: value }
}, 'Calling external service');
```

### Validation Errors
```typescript
logger.warn({
  userId: req.user?.id,
  validation: { field, reason }
}, 'Validation failed');
```

### Admin Operations
```typescript
logger.info({
  adminId: req.user?.id,
  action,
  targetId
}, 'Admin operation performed');
```

---

**Last Updated:** 2025-11-14
**Commit:** 2018fc1
**Branch:** development
