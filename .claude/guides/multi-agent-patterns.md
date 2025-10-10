# Multi-Agent Coordination Patterns

**Last Updated**: 2025-10-09
**Purpose**: Detailed workflows for multi-agent implementation

---

## When to Use Multi-Agent

**Default: Use multiple agents for all non-trivial work**

Single agent exception (ALL must be true):
- Single file modification
- < 15 minutes implementation
- Zero risk (not auth, payments, data, security)
- Trivial: typo, CSS-only, comment update

**Benefits of multi-agent:**
- Parallel processing (faster completion)
- Specialization (each agent focuses deeply)
- Better testing (dedicated testing agent)
- Fewer errors (multiple perspectives catch issues)
- Better documentation (research agent documents architecture)

---

## 2-Agent Pattern (Most Common)

**Use for**: Simple features, bug fixes, small refactoring

**Agent 1: Implementation**
- Read relevant documentation
- Implement feature/fix
- Write unit tests
- Verify TypeScript compiles
- Signal ready: "Implementation complete"

**Agent 2: Testing/Verification**
- Wait for implementation complete
- Deploy to staging
- Test success and failure scenarios
- Verify responsive UI (if applicable)
- Signal ready: "Verified on staging"

---

## 3-Agent Pattern (Features)

**Use for**: Features spanning frontend + backend

**Agent 1: Backend/API**
- Read API documentation
- Implement API endpoints
- Add input validation (Zod)
- Add error handling
- Update API documentation
- Signal ready: "Backend complete"

**Agent 2: Frontend/UI**
- Wait for backend complete
- Implement UI components
- Follow ES6 module architecture
- Handle loading/error states
- Use adminDebugLog for debugging
- Signal ready: "Frontend complete"

**Agent 3: Testing/Integration**
- Wait for backend + frontend complete
- Test end-to-end flow
- Test error scenarios
- Verify on mobile and desktop
- Signal ready: "Integration verified"

---

## 4-Agent Pattern (Complex Features)

**Use for**: Major features requiring architecture decisions

**Agent 1: Research/Architecture**
- Read MASTER_DOCUMENTATION.md for patterns
- Follow AI Documentation Reference Protocol
- Design system architecture
- Document approach in `.claude/scratchpads/FEATURE-ARCHITECTURE.md`
- Identify affected systems
- Signal ready: "Architecture plan complete"

**Agent 2: Backend Implementation**
- Wait for architecture plan
- Implement API endpoints
- Database schema changes (prisma migrate dev)
- Document in `.claude/scratchpads/API-CHANGES.md`
- Run `npm run build` to verify
- Signal ready: "Backend implementation complete"

**Agent 3: Frontend Implementation**
- Wait for API documentation
- Implement UI components
- No inline scripts (ES6 modules only)
- Log progress in `.claude/scratchpads/FRONTEND-PROGRESS.md`
- Signal ready: "Frontend implementation complete"

**Agent 4: Testing/Verification**
- Wait for backend + frontend complete
- Deploy to staging
- Test all scenarios including errors
- Document in `.claude/scratchpads/TESTING-STATUS.md`
- Signal ready: "Testing complete, ready for production"

---

## Emergency Response Pattern

**Use for**: Production outages, critical bugs, security incidents

**Agent 1: Analysis**
- Check production logs
- Reproduce issue
- Identify root cause
- Assess impact
- Document in `.claude/scratchpads/EMERGENCY-STATUS.md`
- Identify minimum viable fix
- Signal ready: "Root cause identified"

**Agent 2: Hotfix**
- Wait for root cause
- Implement minimum viable fix
- Skip staging if critical (with user approval)
- Deploy and monitor
- Signal ready: "Hotfix deployed"

**Agent 3: Verification (Optional)**
- Verify fix in production
- Check error logs are clean
- Confirm user functionality restored
- Schedule proper fix if hotfix was temporary

---

## Coordination Scratchpads

Use these files for agent-to-agent communication:

```
.claude/scratchpads/DEVELOPMENT-LOG.md       # General progress log
.claude/scratchpads/API-CHANGES.md           # API endpoint documentation
.claude/scratchpads/FRONTEND-PROGRESS.md     # Frontend implementation log
.claude/scratchpads/TESTING-STATUS.md        # Test results and verification
.claude/scratchpads/REVIEW-LOG.md            # Code review notes
.claude/scratchpads/EMERGENCY-STATUS.md      # Emergency incident log
.claude/scratchpads/FEATURE-ARCHITECTURE.md  # Architecture decisions
```

---

## Tips for Effective Multi-Agent Work

1. **Signal clearly** - Each agent should explicitly signal when ready
2. **Document as you go** - Use scratchpads for agent-to-agent communication
3. **Wait for dependencies** - Don't start until prerequisite agents signal ready
4. **Test thoroughly** - Dedicated testing agent catches issues early
5. **Stay focused** - Each agent handles ONE aspect of the work
6. **Communicate blockers** - If stuck, document in scratchpad immediately

---

## Related Documentation

- **Global CLAUDE.md**: Multi-agent decision criteria
- **Project CLAUDE.md**: Project-specific patterns
