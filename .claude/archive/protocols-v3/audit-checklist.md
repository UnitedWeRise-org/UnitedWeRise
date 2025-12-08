# Audit Checklist Protocol

**Protection Status**: Standard
**Created**: 2025-11-03
**Last Updated**: 2025-11-03

---

## 🎯 When to Use This Protocol

**USE THIS PROTOCOL** when executing the Audit phase of Systematic Development Methodology.

Called automatically from CLAUDE.md when you begin development work.

---

## Overview

**Core Principle**: Understand BEFORE changing. Complete system understanding prevents "2 steps forward, 3 steps back" cycles.

This protocol provides comprehensive checklists for auditing all aspects of the system before making changes. It ensures you understand:
- Data layer (database schema, relationships, constraints)
- API contracts (endpoints, request/response, validation)
- Business logic (where rules live, transformations)
- Auth/permissions (authentication flow, authorization checks)
- Client state (what's stored where)
- External dependencies (Azure, APIs, third-party services)
- Error flows (catching, logging, displaying)
- Async behavior (promises, race conditions, loading states)
- Environment config (dev vs staging vs production differences)

---

## Investigation Commands

### Frontend Investigation

```bash
# Find relevant UI components
rg -l "keyword" frontend/src/

# Check event handlers and user interactions
rg "addEventListener|onclick|data-action" frontend/src/

# Identify API calls
rg "fetch|apiCall|axios" frontend/src/

# Check for existing functionality
rg "function.*FeatureName" frontend/src/

# Find state management
rg "useState|useEffect|window\.|localStorage" frontend/src/

# Check error handling
rg "try.*catch|\.catch\(|error" frontend/src/
```

### Backend Investigation

```bash
# Find API endpoints
rg -l "router\.(get|post|put|delete)" backend/src/routes/

# Check business logic
rg "class.*Service|export.*function" backend/src/

# Identify middleware and auth
rg "requireAuth|middleware" backend/src/

# Check error handling
rg "try.*catch|\.catch\(" backend/src/

# Find environment-specific code
rg "process\.env|NODE_ENV" backend/src/
```

### Database Investigation

```bash
# Check schema
cat backend/prisma/schema.prisma | grep -A 20 "model FeatureName"

# Check migrations
ls backend/prisma/migrations/

# Identify relationships
rg "@relation" backend/prisma/schema.prisma

# Check indexes
rg "@@index|@@unique" backend/prisma/schema.prisma
```

---

## Complete System Audit Checklist

### 1. Data Layer Audit

**Checklist**:
- [ ] Identify all relevant models/tables
- [ ] Map all relationships (foreign keys, cascades)
- [ ] Note all indexes (performance implications)
- [ ] Check for unique constraints
- [ ] Identify required vs optional fields
- [ ] Review default values
- [ ] Check for soft deletes vs hard deletes
- [ ] Identify any migrations needed

**Questions to Answer**:
- What data needs to be stored/retrieved?
- How is data related to other models?
- What constraints exist on the data?
- What happens if related data is deleted?

---

### 2. API Contract Audit

**Checklist**:
- [ ] List all endpoints involved
- [ ] Document exact request shape (body, query params, headers)
- [ ] Document exact response shape (success and error cases)
- [ ] Identify all validation rules
- [ ] Note all possible status codes
- [ ] Check authentication requirements
- [ ] Check authorization requirements (role/permission checks)
- [ ] Review rate limiting
- [ ] Check CORS requirements

**Questions to Answer**:
- What API endpoints are called?
- What data flows in and out?
- How are errors communicated?
- What middleware processes the request?

---

### 3. Business Logic Audit

**Checklist**:
- [ ] Locate where business rules are enforced
- [ ] Identify all data transformations
- [ ] Determine if logic is in controller, service, or model layer
- [ ] Check for duplicate implementations
- [ ] Review edge case handling
- [ ] Identify side effects (notifications, logging, etc.)
- [ ] Check for transaction requirements

**Questions to Answer**:
- Where do business rules live?
- What transformations happen to data?
- What side effects occur?
- Is there existing functionality I can reuse?

---

### 4. Auth/Permissions Audit

**Checklist**:
- [ ] Identify authentication mechanism (JWT, OAuth, session)
- [ ] List all middleware in request flow
- [ ] Check role-based access control
- [ ] Verify environment-aware auth (staging admin-only)
- [ ] Review token validation
- [ ] Check session management
- [ ] Identify CSRF protection requirements
- [ ] Review password/credential handling

**Questions to Answer**:
- What authentication is required?
- What permissions are checked?
- How is auth different in dev/staging/production?
- How are sessions managed?

---

### 5. Client State Audit

**Checklist**:
- [ ] Identify what's cached in memory
- [ ] Check localStorage usage
- [ ] Check sessionStorage usage
- [ ] Review cookie usage (httpOnly, secure)
- [ ] Check URL state management (query params)
- [ ] Identify when state gets cleared/refreshed
- [ ] Review state synchronization across components
- [ ] Check for race conditions in state updates

**Questions to Answer**:
- What state is persisted vs transient?
- When does state get initialized?
- When does state get cleared?
- How is state shared across components?

---

### 6. External Dependencies Audit

**Checklist**:
- [ ] Azure Blob Storage (uploads/downloads/URLs)
- [ ] Azure OpenAI API calls
- [ ] Google OAuth flow
- [ ] Stripe payment processing
- [ ] External candidate API
- [ ] Geocoding services
- [ ] Email service (SendGrid/similar)
- [ ] Third-party reliability/fallbacks

**Questions to Answer**:
- What external services are called?
- What happens if external service fails?
- Are there timeouts/retries configured?
- Are credentials securely stored?

---

### 7. Error Flow Audit

**Checklist**:
- [ ] Identify all try/catch blocks
- [ ] Check .catch() on promises
- [ ] Review error logging strategy
- [ ] Check user-facing error messages
- [ ] Verify sensitive data not exposed in errors
- [ ] Review environment-specific error handling
- [ ] Check error recovery mechanisms
- [ ] Identify error tracking (Application Insights, etc.)

**Questions to Answer**:
- How are errors caught and handled?
- Where are errors logged?
- How are errors shown to users?
- Are errors handled differently in dev vs production?

---

### 8. Async Behavior Audit

**Checklist**:
- [ ] Map all promise chains
- [ ] Identify potential race conditions
- [ ] Review loading state management
- [ ] Check timeout handling
- [ ] Verify error propagation in async code
- [ ] Check for Promise.all usage (parallel vs sequential)
- [ ] Review debouncing/throttling
- [ ] Check for memory leaks (event listeners, intervals)

**Questions to Answer**:
- What async operations occur?
- Can operations complete in wrong order?
- How are loading states communicated?
- What happens on timeout?

---

### 9. Environment Config Audit

**Checklist**:
- [ ] Identify URLs that differ (API endpoints, frontend URLs)
- [ ] Check environment-specific keys/secrets
- [ ] Review behavior differences (admin-only in staging)
- [ ] Verify environment detection logic
- [ ] Check database URLs (production vs staging)
- [ ] Review feature flags
- [ ] Check debug mode differences
- [ ] Verify CORS configuration per environment

**Questions to Answer**:
- What differs between dev/staging/production?
- How is environment detected?
- Are all environment variables documented?
- Are production secrets secure?

---

### 10. Cross-System Impact Audit

**Checklist**:
- [ ] Identify if change affects user-side AND admin dashboard
- [ ] Check if change affects mobile UI
- [ ] Verify impact on existing API consumers
- [ ] Review impact on database performance
- [ ] Check if change affects background jobs
- [ ] Identify notification system impact
- [ ] Check WebSocket/real-time feature impact
- [ ] Review caching layer impact

**Questions to Answer**:
- Does this affect multiple user interfaces?
- How do changes ripple through the stack?
- Who/what depends on this functionality?
- What breaks if this changes?

---

## Integration Audit Patterns

### Full-Stack Feature Audit (e.g., WebSocket Messaging)

**Frontend → Backend → Database Flow**:
1. **Frontend**: Find where connection is initiated
2. **Frontend**: Identify event handlers (send/receive)
3. **Backend**: Locate WebSocket server initialization
4. **Backend**: Find authentication middleware
5. **Backend**: Map event handlers to database operations
6. **Database**: Identify relevant models and relationships

### API Integration Audit (e.g., MOTD Dismiss)

**Client → API → Service → Database Flow**:
1. **Frontend**: Find button click handler
2. **Frontend**: Trace API call (endpoint, method, payload)
3. **Backend**: Find route handler
4. **Backend**: Check middleware (auth, CSRF)
5. **Backend**: Trace service layer logic
6. **Database**: Identify query/mutation

### Authentication Flow Audit

**Login → Token → Session → Refresh Flow**:
1. **Frontend**: Login form submission
2. **Backend**: Credential validation
3. **Backend**: Token generation (JWT)
4. **Backend**: httpOnly cookie setting
5. **Frontend**: Token storage/usage
6. **Frontend**: Token refresh logic
7. **Backend**: Token blacklist checking

---

## Audit Deliverables

Create audit document in `.claude/scratchpads/[FEATURE]-AUDIT.md`:

```markdown
## Current State Analysis

### Frontend Components
- **Files**: [list all relevant files with paths]
- **Functions**: [list all relevant functions with line numbers]
- **Event Handlers**: [list all user interaction points]
- **API Calls**: [list all backend calls with endpoints]
- **State Management**: [describe state storage and updates]

### Backend Implementation
- **Routes**: [list all endpoints with methods]
- **Services**: [list all business logic with locations]
- **Middleware**: [list all middleware in request flow]
- **Database Queries**: [list all data access operations]
- **Auth/Permissions**: [describe auth checks]

### Database Schema
- **Models**: [list relevant models with key fields]
- **Relationships**: [describe connections and cascades]
- **Indexes**: [note any performance optimizations]
- **Migrations Needed**: [list required schema changes]

### External Dependencies
- **Services**: [list all external API calls]
- **Configuration**: [note environment variables needed]
- **Fallbacks**: [describe error handling for external failures]

### Cross-System Dependencies
- **Affected Systems**: [list other systems impacted]
- **Integration Points**: [describe how systems connect]
- **Data Flow**: [map complete data journey]

### Identified Issues
- **Problem**: [describe what's wrong or what's needed]
- **Root Cause**: [explain why issue exists]
- **Impact**: [who/what is affected]
- **Scope**: [how widespread is the issue]

### Risk Assessment
- **High Risk**: [changes that could break multiple things]
- **Medium Risk**: [changes that could cause edge case issues]
- **Low Risk**: [isolated changes]
```

---

## Special Case Audits

### Bug Fix Audit

**Additional checklist**:
- [ ] Reproduce the bug exactly (document steps)
- [ ] Understand WHY it happens (not just THAT it happens)
- [ ] Check if bug exists in multiple places
- [ ] Verify it's not a symptom of deeper issue
- [ ] Check git history for when bug was introduced
- [ ] Review if bug affects multiple environments

### New Feature Audit

**Additional checklist**:
- [ ] Search for similar existing functionality
- [ ] Verify no duplicate implementations exist
- [ ] Check if feature exists but is incomplete
- [ ] Review if similar feature was removed (git history)
- [ ] Identify code patterns to follow
- [ ] Check if infrastructure supports feature

### Refactoring Audit

**Additional checklist**:
- [ ] Map all current usages of code to refactor
- [ ] Identify all dependencies
- [ ] Check if code is tested
- [ ] Review performance implications
- [ ] Verify backward compatibility requirements
- [ ] Check if deprecation strategy needed

---

## Troubleshooting

**Issue**: Audit phase taking too long
**Solution**: It's supposed to. Rushing audit causes problems later. Take the time to understand completely.

**Issue**: Can't find where functionality lives
**Solution**: Use multi-agent coordination. Task/Explore agents are designed for this.

**Issue**: Uncertain if audit is complete
**Solution**: Can you explain the full data flow to someone else? If not, keep auditing.

**Issue**: Found too many issues during audit
**Solution**: Good! This is exactly why we audit first. Create plan to address systematically.

---

## Success Criteria

✅ **Audit is complete when you can answer**:
- Where does the data come from?
- Where does the data go?
- What transforms the data along the way?
- Who/what has access to this data/functionality?
- What happens if this fails?
- What else depends on this?
- How does this differ across environments?

✅ **You should be able to**:
- Trace complete data flow from UI → API → Database → Back
- Explain what each layer does and why
- Identify all error cases and how they're handled
- Describe all authentication/authorization checks
- List all external dependencies and fallbacks

---

## Related Protocols

- `.claude/protocols/risk-assessment-framework.md` - Use after audit to assess complexity
- `.claude/protocols/testing-checklist.md` - Testing informed by audit findings
- `.claude/protocols/documentation-requirements.md` - Document what you discovered
- `CLAUDE.md` - Systematic Development Methodology

---

## Quick Reference

**Remember**:
- Understanding takes time, but prevents larger problems
- Every bug fixed without full audit risks introducing two more
- "I think I know what's happening" ≠ "I audited and understand"
- Multi-agent coordination is your friend for complex audits
