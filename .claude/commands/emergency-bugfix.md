# Emergency Production Bug Response Protocol

## Overview
Rapid multi-agent response for critical production issues affecting United We Rise platform users.

**Target Resolution Time:** 10-15 minutes vs 25+ minutes sequential approach

---

## Rapid Response Setup

### Terminal 1 - Incident Analysis Agent
```bash
claude --dangerously-skip-permissions -p "You are the Incident Analysis Agent for United We Rise emergency response. Your role:

1. Immediately analyze production error logs and user reports
2. Check health endpoints: https://api.unitedwerise.org/health
3. Review recent deployments and changes in git history
4. Document root cause analysis in .claude/scratchpads/INCIDENT-REPORT.md
5. Identify affected systems and impact scope

Critical Analysis Areas:
- Authentication system status
- Database connectivity and performance
- API endpoint availability
- Frontend application status
- Payment system functionality

Timeline: Complete analysis within 2-3 minutes
Escalation: Critical issues affecting >10% of users require immediate user notification"
```

### Terminal 2 - Hotfix Development Agent
```bash
claude --dangerously-skip-permissions -p "You are the Hotfix Developer for United We Rise emergency response. Your role:

1. Read incident analysis from .claude/scratchpads/INCIDENT-REPORT.md
2. Create targeted fix on development branch (emergency exception: main branch allowed)
3. Log all changes to .claude/scratchpads/HOTFIX-LOG.md
4. Implement minimal viable fix - no scope creep
5. Prepare for immediate staging deployment

Emergency Protocols:
- Development branch first (unless critical production issue)
- Minimal code changes only
- No refactoring or improvements
- Document exact changes and rationale
- Prepare rollback plan

Timeline: Implement fix within 5-8 minutes
Priority: Fix the specific issue only - no additional changes"
```

### Terminal 3 - Verification Testing Agent
```bash
claude --dangerously-skip-permissions -p "You are the Verification Testing Agent for United We Rise emergency response. Your role:

1. Monitor .claude/scratchpads/HOTFIX-LOG.md for fix completion
2. Test fix on staging environment immediately after deployment
3. Verify no regressions in critical user flows
4. Document test results in .claude/scratchpads/VERIFICATION-STATUS.md
5. Approve or block production deployment

Critical Test Areas:
- User authentication and login
- My Feed loading and functionality
- Payment processing (if applicable)
- Admin dashboard access
- Core user actions (posting, commenting)

Timeline: Complete verification within 3-5 minutes
Approval: Only approve if fix works AND no regressions detected"
```

### Terminal 4 - Communication & Monitoring Agent
```bash
claude --dangerously-skip-permissions -p "You are the Communication Agent for United We Rise emergency response. Your role:

1. Monitor incident progress from all agent logs
2. Prepare user communication updates
3. Track resolution timeline and effectiveness
4. Document incident for post-mortem analysis
5. Coordinate with user for production deployment approval

Communication Responsibilities:
- Status updates every 5 minutes
- User impact assessment
- Resolution confirmation
- Post-incident documentation

Timeline: Continuous monitoring and communication"
```

---

## Critical Timeline

### Phase 1: Rapid Analysis (0-3 minutes)
- Incident analysis starts immediately
- Communication agent prepares status updates
- Root cause identification
- Impact scope assessment

### Phase 2: Targeted Fix (3-10 minutes)
- Hotfix development begins
- Testing agent prepares verification plan
- Minimal viable solution implementation
- Staging deployment preparation

### Phase 3: Verification (10-15 minutes)
- Staging environment testing
- Regression verification
- Production deployment approval
- User communication updates

---

## Escalation Triggers

### Immediate Escalation (Critical)
- Authentication system completely down
- Payment processing failures
- Database connectivity lost
- Security breach detected

### High Priority Escalation
- >10% of users affected
- Core functionality broken
- Data integrity concerns
- Performance degradation >300%

### Standard Emergency Response
- Feature-specific issues
- UI/UX problems
- Non-critical API failures
- Performance issues <200%

---

## Emergency Deployment Protocol

### Development Branch Emergency Process
```bash
# Standard emergency process
git checkout development
git pull origin development
# Implement fix
git add .
git commit -m "hotfix: Emergency fix for [issue]"
git push origin development
# Deploy to staging and verify
```

### Critical Production Override (RARE)
```bash
# Only for authentication/payment/security emergencies
git checkout main
git pull origin main
# Implement minimal fix
git add .
git commit -m "critical-hotfix: [issue] - emergency production fix"
git push origin main
# Immediate production deployment
```

---

## Verification Checklist

### Staging Verification
- [ ] Hotfix resolves reported issue
- [ ] User authentication still works
- [ ] My Feed loading functional
- [ ] Admin dashboard accessible
- [ ] No new errors in logs
- [ ] Performance acceptable

### Production Readiness
- [ ] Staging verification complete
- [ ] Rollback plan prepared
- [ ] User communication ready
- [ ] Monitoring alerts configured
- [ ] Team notification sent

---

## Communication Templates

### User Status Update
```
URGENT UPDATE: We've identified the issue affecting [functionality].
Our team is implementing a fix now.
Expected resolution: [time estimate].
We'll update you as soon as the issue is resolved.
```

### Resolution Confirmation
```
RESOLVED: The issue affecting [functionality] has been fixed.
All systems are now operating normally.
We apologize for the inconvenience.
```

---

## Post-Incident Requirements

### Immediate Actions
- [ ] Verify all systems operational
- [ ] Document timeline and resolution
- [ ] Update monitoring to prevent recurrence
- [ ] Schedule post-mortem meeting

### Documentation Updates
- [ ] MASTER_DOCUMENTATION.md incident log
- [ ] Troubleshooting guide updates
- [ ] Monitoring alert improvements
- [ ] Prevention strategy implementation

---

## Emergency Contact Protocol

### User Notification Required For:
- Authentication system issues
- Payment processing problems
- Data loss or corruption
- Security incidents
- Extended downtime (>15 minutes)

### Internal Escalation For:
- Multiple system failures
- Unknown root cause after 5 minutes
- Fix attempts unsuccessful
- Potential security breach