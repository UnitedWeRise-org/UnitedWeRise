# Photo Upload Rebuild - Multi-Agent Coordination Plan

**Created:** 2025-10-02
**Status:** Active
**Objective:** Rebuild photo upload from scratch with minimal, proven, incremental approach

---

## Agent Responsibilities

### Assessment Agent (Terminal 1)
**Purpose:** Complete inventory of current implementation

**Tasks:**
- Inventory all photo upload code (backend routes, middleware, helpers)
- Map data flow from request → storage → database → response
- Identify all Azure Blob Storage integration points
- Document all logging/debugging code added during failed attempts
- List all environment variables and configurations used
- Catalog all related database schema (photos table, relationships)
- Identify frontend components making photo upload requests

**Deliverable:** Complete inventory in `PHOTO-UPLOAD-ASSESSMENT.md`

**Signals completion with:** "ASSESSMENT COMPLETE - Inventory documented"

---

### Architecture Agent (Terminal 2)
**Purpose:** Design minimal, correct architecture

**Tasks:**
- Design minimal photo upload endpoint (POST /photos)
- Define exact request/response contract
- Specify error handling strategy (what errors, what status codes)
- Design storage strategy (Blob Storage container, naming, metadata)
- Design database schema (what columns, what indexes)
- Define authentication/authorization requirements
- Document architecture decisions and rationale

**Deliverable:** Architecture design in `PHOTO-UPLOAD-ARCHITECTURE-REBUILD.md`

**Signals completion with:** "ARCHITECTURE COMPLETE - Design ready for implementation"

---

### Pipeline Agent (Terminal 3)
**Purpose:** Design layered pipeline architecture

**Tasks:**
- Design Layer 1: Request validation (multipart parsing, file type, size)
- Design Layer 2: Authentication/authorization
- Design Layer 3: Storage upload (Azure Blob)
- Design Layer 4: Database persistence
- Design Layer 5: AI analysis integration (if applicable)
- Design Layer 6: Response formatting
- Define clear interfaces between layers
- Specify error handling at each layer

**Deliverable:** Pipeline design in `PHOTO-UPLOAD-PIPELINE-DESIGN.md`

**Signals completion with:** "PIPELINE DESIGN COMPLETE - Layer architecture ready"

---

### Removal Agent (Terminal 4)
**Purpose:** Remove all existing photo upload code

**Waits for:** Assessment Agent completion

**Tasks:**
- Remove backend/src/routes/photos.ts (entire file)
- Remove all photo upload middleware
- Remove all photo upload helper functions
- Remove all debugging/logging code from failed attempts
- Clean up environment variables no longer needed
- Remove frontend photo upload components (temporarily)
- Document what was removed in DEVELOPMENT-LOG.md

**Deliverable:** Clean slate, documented removals

**Signals completion with:** "REMOVAL COMPLETE - Clean slate achieved"

---

### Backend Build Agent (Terminal 5)
**Purpose:** Implement minimal backend, then incremental layers

**Waits for:**
- Removal Agent completion
- Architecture Agent design ready

**Phase 1 - Minimal Build:**
- Create bare-bones POST /photos endpoint
- Accept multipart/form-data
- Save to Azure Blob Storage (hardcoded container)
- Return blob URL (no database yet)
- Zero error handling (fail fast and loud)
- Document in BACKEND-BUILD-LOG.md

**Signals Phase 1 with:** "MINIMAL BUILD COMPLETE - Basic upload working"

**Phase 2 - Incremental Layers (waits for Minimal success):**
- Layer 1: Add request validation
- Layer 2: Add authentication check
- Layer 3: Add database persistence
- Layer 4: Add error handling
- Layer 5: Add AI analysis (if applicable)
- One layer at a time, test after each

**Signals Phase 2 with:** "INCREMENTAL BUILD COMPLETE - All layers working"

**Phase 3 - Pipeline Refactor (waits for Pipeline design):**
- Refactor into clean pipeline architecture
- Implement interfaces between layers
- Add comprehensive error handling
- Add logging (minimal, strategic)
- Document final architecture

**Signals Phase 3 with:** "BACKEND COMPLETE - Production-ready implementation"

---

### Frontend Agent (Terminal 6)
**Purpose:** Build frontend integration

**Waits for:** Backend Build Agent Phase 2 completion (API stable)

**Tasks:**
- Build photo upload component (file picker, preview, progress)
- Implement multipart/form-data request
- Handle response (display uploaded photo)
- Handle errors (user-friendly messages)
- Add loading states
- Test on staging environment

**Deliverable:** Working frontend integration

**Signals completion with:** "FRONTEND COMPLETE - UI integrated with backend"

---

### Testing Agent (Terminal 7)
**Purpose:** Continuous verification at every phase

**Ongoing tasks:**
- Test minimal build (Phase 0)
- Test each incremental layer (Phase 1)
- Test pipeline refactor (Phase 2)
- Test frontend integration (Phase 3)
- Document results in TESTING-RESULTS.md
- Report failures immediately to relevant agent

**Test scenarios:**
- Happy path: Upload valid image
- Invalid file type (not image)
- File too large
- Unauthenticated request
- Network failure during upload
- Blob Storage unavailable
- Database unavailable

**Signals issues with:** "BLOCKER: [Agent name] - [specific issue]"

**Signals success with:** "TESTING COMPLETE - All scenarios passing"

---

## Execution Sequence

### Phase 0: Assessment & Design (Parallel)
**Duration:** 15-30 minutes

**Active agents:**
- Assessment Agent: Inventories current code
- Architecture Agent: Designs minimal approach
- Pipeline Agent: Designs layered architecture

**Completion criteria:**
- Assessment inventory complete
- Architecture design ready
- Pipeline design ready

**Handoff:** → Phase 1

---

### Phase 1: Removal
**Duration:** 10-15 minutes

**Active agents:**
- Removal Agent: Deletes all existing code

**Waits for:** Assessment complete (knows what to remove)

**Completion criteria:**
- All photo upload code removed
- Clean git status (changes committed)
- Removal documented

**Handoff:** → Phase 2

---

### Phase 2: Minimal Build
**Duration:** 20-30 minutes

**Active agents:**
- Backend Build Agent: Implements bare minimum
- Testing Agent: Verifies minimal upload works

**Waits for:**
- Removal complete
- Architecture design ready

**Completion criteria:**
- Single endpoint accepts file
- File saved to Blob Storage
- Blob URL returned
- Testing Agent confirms: "curl works"

**Handoff:** → Phase 3

---

### Phase 3: Incremental Layers
**Duration:** 1-2 hours

**Active agents:**
- Backend Build Agent: Adds layers one at a time
- Testing Agent: Tests after each layer

**Waits for:** Minimal build proven working

**Completion criteria:**
- Validation layer working
- Auth layer working
- Database layer working
- Error handling working
- Testing Agent confirms: "All layers passing"

**Handoff:** → Phase 4

---

### Phase 4: Pipeline Refactor
**Duration:** 30-45 minutes

**Active agents:**
- Backend Build Agent: Refactors into clean pipeline
- Testing Agent: Verifies refactor didn't break anything

**Waits for:**
- All layers working
- Pipeline design ready

**Completion criteria:**
- Code matches pipeline design
- All tests still passing
- Code is maintainable and documented

**Handoff:** → Phase 5

---

### Phase 5: Frontend Integration
**Duration:** 1-2 hours

**Active agents:**
- Frontend Agent: Builds UI components
- Testing Agent: Tests UI workflows

**Waits for:** Backend API stable (Phase 3 complete)

**Completion criteria:**
- User can select and upload photo
- User sees upload progress
- User sees success/error messages
- Testing Agent confirms: "UI workflows working"

**Handoff:** → Phase 6

---

### Phase 6: Deployment
**Duration:** 30 minutes

**Active agents:**
- Backend Build Agent: Deploys to staging
- Testing Agent: Verifies staging deployment
- Frontend Agent: Verifies frontend deployment

**Completion criteria:**
- Backend deployed to staging
- Frontend deployed to staging
- End-to-end test passing on staging
- Testing Agent confirms: "Staging deployment verified"

**Handoff:** → Production (user approval required)

---

## Communication Protocol

### Progress Updates
**Location:** `.claude/scratchpads/PHOTO-UPLOAD-REBUILD-STATUS.md`

**Format:**
```markdown
## [Agent Name] - [Timestamp]
**Status:** In Progress / Blocked / Complete
**Current task:** [specific task]
**Progress:** [what's done]
**Blockers:** [if any]
**Next:** [what's next]
```

### Completion Signals
**Location:** Same status file, use standard format from Agent Responsibilities section

**Examples:**
- "ASSESSMENT COMPLETE - Inventory documented"
- "MINIMAL BUILD COMPLETE - Basic upload working"
- "BLOCKER: Backend Build - Azure Blob Storage connection failing"

### Blocker Protocol
**When blocked:**
1. Document blocker in status file
2. Tag which agent is blocked and why
3. Identify which agent can unblock
4. Pause work until unblocked
5. Update status when unblocked

**Example:**
```markdown
## Backend Build Agent - 2025-10-02 14:30
**Status:** BLOCKED
**Blocker:** Architecture design not ready - need database schema spec
**Waiting for:** Architecture Agent
**Can proceed with:** Blob Storage integration (doesn't need schema)
```

### Handoff Documentation
**Location:** Each agent's deliverable file + status update

**Required info:**
- What was completed
- What next agent needs to know
- Any issues/gotchas discovered
- Link to relevant code/files

---

## Rollback Strategy

### Phase 0 (Assessment/Design)
**Risk:** Low (no code changes)

**Rollback:** N/A (documents only)

---

### Phase 1 (Removal)
**Risk:** Medium (deleting code)

**Rollback plan:**
```bash
# All removals in single commit
git log --oneline -1  # Verify it's the removal commit
git revert HEAD
git push origin main
```

**Checkpoint:** Commit removal as single atomic change with message:
```
"refactor: Remove all existing photo upload code for rebuild"
```

---

### Phase 2 (Minimal Build)
**Risk:** Low (new code, doesn't affect existing features)

**Rollback plan:**
```bash
# Remove minimal build commit
git revert HEAD
git push origin main
```

**Checkpoint:** Commit minimal build as single change:
```
"feat: Add minimal photo upload endpoint (blob storage only)"
```

**Validation before proceeding:**
- Testing Agent confirms: Single photo upload works
- No errors in logs
- Blob Storage shows uploaded file

---

### Phase 3 (Incremental Layers)
**Risk:** Medium (adding complexity)

**Rollback plan:**
Each layer is separate commit:
```bash
# Rollback to last known good layer
git log --oneline -5  # Find which layer broke
git revert <bad-commit-sha>
git push origin main
```

**Checkpoints:** One commit per layer:
- "feat: Add request validation layer to photo upload"
- "feat: Add authentication layer to photo upload"
- "feat: Add database persistence layer to photo upload"
- "feat: Add error handling layer to photo upload"

**Validation before each layer:**
- Testing Agent confirms: Previous layers still work + new layer works
- Specific test for new layer passes

---

### Phase 4 (Pipeline Refactor)
**Risk:** High (changing working code)

**Rollback plan:**
```bash
# Single refactor commit, easy to revert
git revert HEAD
git push origin main
# Falls back to Phase 3 working code
```

**Checkpoint:** Single refactor commit:
```
"refactor: Reorganize photo upload into pipeline architecture"
```

**Validation before proceeding:**
- All Phase 3 tests still passing
- Code is cleaner/more maintainable
- No new functionality (pure refactor)

---

### Phase 5 (Frontend Integration)
**Risk:** Medium (user-facing changes)

**Rollback plan:**
```bash
# Frontend changes in separate commit
git revert HEAD
git push origin main
# Backend still works, just no UI
```

**Checkpoint:** Single frontend commit:
```
"feat: Add photo upload UI component"
```

**Validation before proceeding:**
- Testing Agent confirms: All UI workflows work
- Error states display correctly
- Backend API unchanged

---

### Phase 6 (Deployment)
**Risk:** High (affects staging/production)

**Rollback plan - Staging:**
```bash
# Redeploy previous working commit
PREVIOUS_SHA=$(git rev-parse HEAD~1)
# Follow standard deployment procedure with $PREVIOUS_SHA
```

**Rollback plan - Production:**
```bash
# Emergency rollback (if deployed to production)
git revert HEAD
git push origin main
# Trigger production deployment of revert commit
```

**Validation before staging:**
- All local tests passing
- Frontend builds successfully
- Backend compiles without errors

**Validation before production:**
- Staging deployment verified working
- End-to-end tests passing on staging
- User explicit approval for production deployment

---

## Emergency Procedures

### If entire rebuild fails
**Fallback:** Revert all commits back to pre-removal state

```bash
# Find commit before removal started
git log --oneline --all -20
# Identify last good commit before removal

# Hard reset to that commit (DANGEROUS)
git reset --hard <last-good-commit-sha>
git push origin main --force

# Or safer: revert all commits in reverse order
git revert <commit-1> <commit-2> <commit-3>
git push origin main
```

### If specific agent gets stuck
**Protocol:**
1. Document blockage in status file
2. Pause that agent's work
3. Other agents continue if not dependent
4. User intervention to unblock
5. Resume when unblocked

### If testing reveals critical issue
**Protocol:**
1. Testing Agent immediately signals: "CRITICAL: [issue]"
2. All agents pause
3. Relevant agent fixes issue
4. Testing Agent re-verifies
5. Resume when fixed

---

## Success Criteria

### Phase 0
- [ ] Assessment inventory complete and reviewed
- [ ] Architecture design complete and reviewed
- [ ] Pipeline design complete and reviewed

### Phase 1
- [ ] All old photo upload code removed
- [ ] Removal committed and pushed
- [ ] No photo upload functionality remains

### Phase 2
- [ ] Minimal endpoint accepts file
- [ ] File saved to Blob Storage
- [ ] Blob URL returned
- [ ] Testing Agent confirms: curl upload works

### Phase 3
- [ ] Request validation working
- [ ] Authentication working
- [ ] Database persistence working
- [ ] Error handling working
- [ ] Testing Agent confirms: all layers passing

### Phase 4
- [ ] Code refactored into pipeline architecture
- [ ] All tests still passing
- [ ] Code matches pipeline design
- [ ] Code is maintainable

### Phase 5
- [ ] Frontend upload component working
- [ ] Error states display correctly
- [ ] Testing Agent confirms: UI workflows passing

### Phase 6
- [ ] Deployed to staging
- [ ] End-to-end test passing on staging
- [ ] Ready for production (pending user approval)

---

## Timeline Estimate

**Total estimated duration:** 4-6 hours

**Breakdown:**
- Phase 0 (Assessment/Design): 15-30 min
- Phase 1 (Removal): 10-15 min
- Phase 2 (Minimal Build): 20-30 min
- Phase 3 (Incremental Layers): 1-2 hours
- Phase 4 (Pipeline Refactor): 30-45 min
- Phase 5 (Frontend Integration): 1-2 hours
- Phase 6 (Deployment): 30 min

**Critical path:**
Assessment → Removal → Minimal → Incremental → Refactor → Frontend → Deploy

**Parallel opportunities:**
- Phase 0: Assessment, Architecture, Pipeline (all parallel)
- Phase 3-4: Frontend agent can start planning while backend builds layers

---

## Notes

- This is a **complete rebuild**, not a fix
- Every phase must prove working before next phase
- No skipping phases or rushing
- If a phase fails, rollback and reassess
- Testing Agent is continuous throughout all phases
- User approval required before production deployment
- Document everything as we go
- Clean commits at every checkpoint for easy rollback
