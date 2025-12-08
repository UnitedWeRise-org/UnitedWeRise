# Plan Protocol

**Phase**: 2 of 5 (Audit → Plan → Execute → Test → Document)
**Last Updated**: 2025-12-08

---

## STOP Criteria

**SKIP detailed planning if ALL of these are true:**
- Complexity score is 0-8 (see scoring below)
- NOT an auto-escalate category (payment, auth, schema changes, etc.)
- Similar pattern exists in codebase to follow
- Rollback would be instant (simple git revert)

**ALWAYS do detailed planning if ANY of these are true:**
- Complexity score is 9+
- Involves: payment, auth, data deletion, schema changes, secrets
- First-time pattern (no existing examples)
- Spans frontend + backend + database
- Previous implementation attempts failed

---

## Quick Reference

### Complexity Scoring (0-12 points)

| Criterion | 0 | 1 | 2 | 3 |
|-----------|---|---|---|---|
| **Files** | 1-2 | 3-5 | 6-10 | 11+ |
| **Systems** | Single | Same module | Cross-module | Cross-service |
| **Rollback** | Instant | Simple | Complex | Data recovery |
| **Security** | None | Display | User data | Admin/payment |

**Score → Action:**
- **0-8**: Implement directly (mental checklist only)
- **9-15**: Create plan document, break into phases
- **16+**: Multi-agent coordination, staged implementation

### Auto-Escalate Categories

Always treat as high complexity:
- Payment/billing systems
- Authentication/authorization
- Data deletion or migration
- Database schema changes
- Production secrets
- WebSocket/real-time
- File upload/storage
- CORS/security headers

---

## Full Procedure

### Framework 1: Complexity Assessment

Calculate score using the table above. Add points from all four criteria.

**For Score 0-8** - Mental checklist:
- What pattern am I following?
- What's different about my use case?
- What could go wrong?
- How will I test this?

**For Score 9-15** - Create `.claude/scratchpads/[FEATURE]-PLAN.md`:

```markdown
## Implementation Strategy

### Approach
[Why this approach was chosen]

### Change Sequence
1. **Database** - Schema, migrations, risk
2. **Backend** - APIs, logic, risk
3. **Frontend** - UI, state, risk

### Testing Plan
- Unit tests: [what]
- Integration: [what]
- Manual: [what]

### Rollback Plan
- How to revert
- Data recovery (if needed)
- Estimated time: [X minutes]
```

**For Score 16+** - Full documentation:
- Architecture analysis
- Phased implementation plan
- Risk matrix (probability × impact)
- Detailed rollback procedures
- Per-phase testing strategy
- Post-deployment monitoring plan

### Framework 2: Risk Assessment

| Risk Level | Probability | Impact | Action |
|------------|-------------|--------|--------|
| Critical | High | High | User approval required, staged rollout |
| High | Medium-High | High | Document mitigation, rollback ready |
| Medium | Medium | Medium | Standard testing, monitor post-deploy |
| Low | Low | Low-Medium | Standard workflow |

**Common Risks:**
- **Data Loss**: Schema changes without migration, cascade deletes
- **Breaking Changes**: API contract changes, format changes
- **Security**: Exposing sensitive data, weakening auth
- **Performance**: Missing indexes, N+1 queries
- **Integration**: External API changes, CORS issues

### Framework 3: Change Sequencing

**Standard (Bottom-Up):** Database → Backend → Frontend
- Each layer depends on layer below
- Test each layer before building next

**Top-Down:** Use when prototyping UI or backend already supports

**Parallel:** Use when changes are independent

### Framework 4: Rollback Protocol

**Rollback immediately if:**
- Auth/authorization broken
- Payment processing failing
- Data corruption detected
- Health checks fail
- Security vulnerability found

**Fix forward if:**
- Minor UI glitch
- Non-critical feature issue
- Single user reporting (investigate first)

**Rollback Decision:**
```
Broken? → Affects users? → Fix < 15 min? → Fix forward
                        → Fix > 15 min? → ROLLBACK
```

**Rollback Methods:**
```bash
# Git revert (preferred)
git revert HEAD && git push origin main

# Container revision (Azure)
az containerapp revision activate --revision <previous>

# Database (if migration caused issue)
npx prisma migrate resolve --rolled-back <migration-name>
```

### Framework 5: Approval Requirements

**Always ask user before:**
- Deploying to production
- Database schema changes
- Authentication logic changes
- Payment flow modifications
- Data deletion
- First-time patterns

**Use multi-agent for:**
- Score 16+ tasks
- Frontend + backend + database spans
- Emergency production issues
- Complex debugging

---

## Verification

**Planning is complete when you have:**
- [ ] Complexity score calculated
- [ ] Implementation approach documented (if score 9+)
- [ ] Change sequence determined
- [ ] Risks identified with mitigation
- [ ] Testing plan defined
- [ ] Rollback procedure ready
- [ ] User approval obtained (if required)

**You should be able to:**
- Explain the plan clearly
- Identify what could go wrong
- Estimate implementation time
- Execute rollback if needed

---

## Testing Time by Complexity

| Score | Time | Testing Scope |
|-------|------|---------------|
| 0-8 | 5-10 min | Happy path, one error case, smoke test |
| 9-15 | 15-30 min | All flows, edge cases, staging |
| 16+ | 1-2 hours | Unit, integration, load, security, staging |
