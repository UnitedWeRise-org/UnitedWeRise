# Audit Protocol

**Phase**: 1 of 5 (Audit → Plan → Execute → Test → Document)
**Last Updated**: 2025-12-08

---

## STOP Criteria

**SKIP detailed audit if ALL of these are true:**
- Single file change with no cross-system impact
- Exact solution is already known and verified
- Change follows an established pattern with zero variations
- No database, API, or auth changes involved

**ALWAYS do full audit if ANY of these are true:**
- Bug fix (need to understand root cause, not just symptom)
- Change spans frontend + backend + database
- Involves authentication, authorization, or security
- Touches payment, user data, or external APIs
- Previous fix attempts have failed
- Uncertain about current system state

---

## Quick Reference

**For trivial changes**, verify you can answer:
- [ ] What file(s) am I changing?
- [ ] What's the current behavior?
- [ ] What's the expected behavior after?
- [ ] Does this affect anything else?

If you can't answer all four → do full audit.

---

## Full Procedure

### Core Principle
**Understand BEFORE changing.** Complete system understanding prevents "2 steps forward, 3 steps back" cycles.

### Investigation Commands

**Frontend:**
```bash
rg -l "keyword" frontend/src/           # Find UI components
rg "fetch|apiCall" frontend/src/        # Find API calls
rg "addEventListener|onclick" frontend/src/  # Find event handlers
```

**Backend:**
```bash
rg -l "router\.(get|post|put|delete)" backend/src/routes/  # Find endpoints
rg "requireAuth|middleware" backend/src/                    # Find auth
rg "process\.env|NODE_ENV" backend/src/                     # Find env config
```

**Database:**
```bash
cat backend/prisma/schema.prisma | grep -A 20 "model Name"  # Check schema
rg "@relation" backend/prisma/schema.prisma                  # Check relationships
```

### System Audit Checklist

Complete the relevant sections based on your change:

#### 1. Data Layer
- [ ] Identify relevant models/tables
- [ ] Map relationships (foreign keys, cascades)
- [ ] Note indexes and constraints
- [ ] Identify migrations needed

#### 2. API Contracts
- [ ] List endpoints involved
- [ ] Document request/response shapes
- [ ] Identify validation rules
- [ ] Check auth requirements

#### 3. Business Logic
- [ ] Locate where rules are enforced
- [ ] Identify data transformations
- [ ] Check for duplicate implementations
- [ ] Identify side effects

#### 4. Auth/Permissions
- [ ] Identify authentication mechanism
- [ ] Check role-based access
- [ ] Verify environment-aware auth (staging admin-only)

#### 5. Client State
- [ ] Check localStorage/sessionStorage usage
- [ ] Review cookie usage
- [ ] Identify state sync issues

#### 6. External Dependencies
- [ ] Azure Blob Storage
- [ ] Azure OpenAI
- [ ] Google OAuth
- [ ] Stripe payments
- [ ] What happens if service fails?

#### 7. Error Handling
- [ ] Map try/catch blocks
- [ ] Check user-facing error messages
- [ ] Verify sensitive data not exposed

#### 8. Async Behavior
- [ ] Identify race conditions
- [ ] Check loading states
- [ ] Review timeout handling

#### 9. Environment Config
- [ ] URLs that differ per environment
- [ ] Environment detection logic
- [ ] Debug mode differences

#### 10. Cross-System Impact
- [ ] User-side AND admin dashboard affected?
- [ ] API consumers impacted?
- [ ] Caching affected?

### Special Case Audits

**Bug Fix:** Reproduce exactly. Understand WHY, not just THAT it happens.

**New Feature:** Search for existing similar functionality first. Never create duplicates.

**Refactoring:** Map all usages. Check if code is tested. Verify backward compatibility.

---

## Verification

**Audit is complete when you can answer:**

1. Where does the data come from?
2. Where does the data go?
3. What transforms the data?
4. Who/what has access?
5. What happens if this fails?
6. What else depends on this?
7. How does this differ across environments?

**You should be able to:**
- Trace complete data flow: UI → API → Database → Back
- Explain what each layer does and why
- Identify all error cases
- List all external dependencies

---

## Audit Deliverables

For complex changes, create `.claude/scratchpads/[FEATURE]-AUDIT.md`:

```markdown
## Current State Analysis

### Frontend Components
- Files: [paths]
- Functions: [with line numbers]
- API Calls: [endpoints]

### Backend Implementation
- Routes: [endpoints with methods]
- Services: [business logic locations]
- Middleware: [auth flow]

### Database Schema
- Models: [relevant models]
- Relationships: [connections]
- Migrations Needed: [if any]

### Identified Issues
- Problem: [what's wrong]
- Root Cause: [why]
- Impact: [scope]

### Risk Assessment
- High/Medium/Low risk items
```

---

## Troubleshooting

**Audit taking too long?** → It's supposed to. Rushing causes bigger problems later.

**Can't find where functionality lives?** → Use Task/Explore agents for codebase search.

**Uncertain if audit is complete?** → Can you explain the full data flow? If not, keep auditing.

**Found too many issues?** → Good! This is why we audit first. Create plan to address.
