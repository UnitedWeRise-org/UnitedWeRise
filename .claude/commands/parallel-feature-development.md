# Multi-Agent Feature Development Workflow

## Overview
Coordinate multiple Claude instances to develop features in parallel, maximizing efficiency and ensuring comprehensive review.

**Estimated Time Savings:** 40-60% compared to sequential development

### Coordinator Pattern Structure
```
Main Claude (You) ↔ Coordinator Claude
                        ├── Research Agent (Architecture & Analysis)
                        ├── Backend Agent (API Development)
                        ├── Frontend Agent (UI/UX Implementation)
                        └── Testing Agent (Quality Assurance)
```

**Coordinator Responsibilities:**
- Task analysis and agent assignment decisions
- Progress monitoring via coordination files
- Integration of sub-agent results
- Final quality review and deployment approval
- Conflict resolution between agents

**Sub-Agent Communication:**
- All agents read from and write to shared `.claude/scratchpads/` files
- Handoff points clearly defined with completion criteria
- Status updates logged for coordinator oversight
- Fallback to single-agent mode if coordination fails

---

## Setup Commands

### Terminal 1 - Research & Architecture Agent
```bash
claude --dangerously-skip-permissions -p "You are the Research Agent for United We Rise. Your role:

1. Research the feature requirements in MASTER_DOCUMENTATION.md
2. Identify integration points with existing systems
3. Create detailed architectural plan in .claude/scratchpads/FEATURE-ARCHITECTURE.md
4. Document security considerations and dependencies
5. Provide implementation guidance for other agents

Focus Areas:
- Existing system patterns and conventions
- Database schema requirements
- API endpoint design
- Security and authentication needs
- Frontend integration requirements

Update FEATURE-ARCHITECTURE.md with your findings and recommendations."
```

### Terminal 2 - Backend Development Agent
```bash
claude --dangerously-skip-permissions -p "You are the Backend Developer for United We Rise. Your role:

1. Read architectural plan from .claude/scratchpads/FEATURE-ARCHITECTURE.md
2. Implement API endpoints on development branch ONLY
3. Follow existing authentication and security patterns
4. Log all changes to .claude/scratchpads/DEVELOPMENT-LOG.md
5. Update .claude/scratchpads/API-CHANGES.md with new endpoints

Requirements:
- Work ONLY on development branch
- Use admin-only debugging functions (no console.log)
- Follow TypeScript compilation requirements
- Implement proper error handling
- Test on staging environment first

Monitor REVIEW-LOG.md for security feedback and implement changes."
```

### Terminal 3 - Frontend Development Agent
```bash
claude --dangerously-skip-permissions -p "You are the Frontend Developer for United We Rise. Your role:

1. Monitor .claude/scratchpads/DEVELOPMENT-LOG.md for API completion
2. Build UI components using existing design patterns
3. Initially use mocked API data, then integrate real endpoints
4. Update .claude/scratchpads/FRONTEND-PROGRESS.md with status
5. Ensure responsive design and mobile compatibility

Requirements:
- Follow existing component patterns
- Use responsive positioning (vh, vw, %, rem)
- Implement proper error handling and loading states
- Test on staging environment: https://dev.unitedwerise.org
- Maintain admin-only access for staging testing

Monitor API-CHANGES.md for endpoint availability."
```

### Terminal 4 - Testing & Quality Assurance Agent
```bash
claude --dangerously-skip-permissions -p "You are the QA Testing Agent for United We Rise. Your role:

1. Watch .claude/scratchpads/DEVELOPMENT-LOG.md and FRONTEND-PROGRESS.md
2. Test completed components on staging environment
3. Verify admin authentication and access controls
4. Report results to .claude/scratchpads/TESTING-STATUS.md
5. Coordinate with security reviewer for comprehensive testing

Testing Focus:
- Staging environment: https://dev.unitedwerise.org
- Backend API: https://dev-api.unitedwerise.org
- Admin-only access verification
- Cross-browser compatibility
- Mobile responsiveness
- Error handling scenarios

Only approve for production deployment after comprehensive testing."
```

---

## Coordination Protocols

### Communication Flow
```
Research Agent → Architecture Plan → Backend Agent
                                   ↓
Backend Agent → API Changes → Frontend Agent
                            ↓
Frontend Agent → UI Components → Testing Agent
                               ↓
Testing Agent → Verification → Deployment Approval
```

### Handoff Points
1. **Research → Backend**: FEATURE-ARCHITECTURE.md complete
2. **Backend → Frontend**: API endpoints documented in API-CHANGES.md
3. **Frontend → Testing**: Components ready in FRONTEND-PROGRESS.md
4. **Testing → Deployment**: All tests pass in TESTING-STATUS.md

### Conflict Resolution
- Security concerns: Development pauses until resolved
- Performance issues: Testing agent escalates to performance optimizer
- Architecture conflicts: Research agent mediates discussion

---

## Monitoring & Status Tracking

### Key Files to Monitor
- `.claude/scratchpads/FEATURE-ARCHITECTURE.md` - Overall plan
- `.claude/scratchpads/DEVELOPMENT-LOG.md` - Backend progress
- `.claude/scratchpads/API-CHANGES.md` - Endpoint documentation
- `.claude/scratchpads/FRONTEND-PROGRESS.md` - UI development status
- `.claude/scratchpads/TESTING-STATUS.md` - Quality assurance results

### Progress Indicators
- ✅ Research complete: Architecture plan finalized
- ✅ Backend complete: API endpoints tested on staging
- ✅ Frontend complete: UI components integrated and responsive
- ✅ Testing complete: All scenarios verified on staging
- ✅ Ready for production: User approval obtained

---

## Success Criteria

### Technical Requirements
- [ ] All TypeScript compilation successful
- [ ] Staging deployment verified
- [ ] Admin-only access patterns maintained
- [ ] Security review approved
- [ ] Performance impact acceptable
- [ ] Mobile responsiveness verified

### Documentation Requirements
- [ ] MASTER_DOCUMENTATION.md updated
- [ ] API endpoints documented with examples
- [ ] Security considerations documented
- [ ] Testing procedures documented
- [ ] Deployment instructions updated

---

## Example Usage

```bash
# Start feature development for "Discussion Forums"
# Terminal 1: Research existing post/comment system
# Terminal 2: Implement forum API endpoints
# Terminal 3: Build forum UI components
# Terminal 4: Test forum functionality end-to-end

# Result: Complete forum feature developed in ~25 minutes
# vs. ~50+ minutes sequential development
```

---

## United We Rise Specific Considerations

### Civic Platform Features
- Election system integration requirements
- Candidate registration workflow impact
- Voting record system connections
- Political content moderation needs

### Social Platform Features
- My Feed integration patterns
- User relationship system impact
- Notification system updates
- Reputation system considerations

### Deployment Requirements
- Development branch workflow mandatory
- Staging environment admin-only testing
- Production deployment requires user approval
- Azure deployment pipeline considerations