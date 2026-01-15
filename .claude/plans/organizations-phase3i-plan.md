# Organizations Phase 3i: Candidate Endorsement UI

**Date**: 2026-01-15
**Status**: COMPLETE
**Complexity Score**: 10 (Frontend: 4 files, Cross-module, Simple rollback, User data)
**Plan Required**: Yes (Score 9+)

---

## Context

**Plan Reference**: `.claude/plans/organizations-endorsements-plan.md`
**Last Handoff**: `.claude/handoffs/2026-01-15-organizations-phase2h.md`
**Current Branch**: development

### What's Complete
- [x] Phase 1: Backend MVP (1a-1e) - All backend endpoints working
- [x] Phase 3: Frontend (3a-3h) - Org discovery, creation, dashboard, endorsement management

### What's Missing (3i)
The plan's item #20 "Candidate endorsement display page" + candidate-side apply workflow:

1. **Candidate endorsement application flow** - Candidates finding orgs, viewing questionnaires, applying
2. **Candidate profile - org endorsements section** - Display organization endorsements
3. **Organization profile - endorsed candidates section** - Dedicated endorsements list (vs activity feed only)

---

## Implementation Strategy

### Approach
Add candidate-side endorsement UI using existing backend endpoints. The backend already supports:
- `GET /api/questionnaires/candidates/:candidateId/available` - Find questionnaires
- `POST /api/endorsements/applications` - Submit application
- `GET /api/endorsements/candidates/:candidateId` - Get endorsements
- `GET /api/endorsements/candidates/:candidateId/pending` - Pending applications
- `POST /api/endorsements/applications/:id/withdraw` - Withdraw application

Frontend needs UI to consume these endpoints.

### Change Sequence

**Step 1: Candidate Dashboard - Endorsements Tab**
Create endorsement management for candidates in their dashboard.

Files:
- `frontend/src/integrations/candidate-system-integration.js` - Add endorsements tab

Features:
- "Seek Endorsements" sub-tab: Browse available questionnaires, view org details, apply
- "My Applications" sub-tab: Track pending/submitted applications, withdraw
- "Received Endorsements" sub-tab: View published endorsements

**Step 2: Endorsement Application Modal**
Modal for completing questionnaire when applying.

Files:
- `frontend/src/integrations/candidate-system-integration.js` - Add application modal

Features:
- Display questionnaire title, description, org info
- Render questions by type (SHORT_TEXT, LONG_TEXT, MULTIPLE_CHOICE, etc.)
- Validate required fields
- Submit application

**Step 3: Candidate Profile - Org Endorsements Display**
Show organization endorsements on public candidate profile.

Files:
- `frontend/src/integrations/candidate-system-integration.js` - Add org endorsements section

Features:
- Section showing organization endorsements (separate from user endorsements)
- Org name, logo, verified badge
- Endorsement statement if provided
- Link to org profile

**Step 4: Organization Profile - Endorsed Candidates Section**
Add dedicated endorsed candidates section to org profile.

Files:
- `frontend/src/modules/features/organizations/components/org-profile.js` - Add section

Features:
- Grid/list of endorsed candidates
- Candidate name, office, election
- Link to candidate profile
- Filter by election/office

---

## Testing Plan

### Unit/Syntax
- JavaScript syntax validation for all modified files
- TypeScript build passes (no backend changes expected)

### Integration
- Candidate can see "Endorsements" tab in dashboard
- Available questionnaires load with org details
- Application form renders correct question types
- Application submits successfully
- Pending applications list shows correctly
- Withdraw application works
- Candidate profile shows org endorsements
- Org profile shows endorsed candidates list

### Manual Testing
1. Log in as candidate (or create test candidate)
2. Navigate to candidate dashboard → Endorsements
3. Browse available questionnaires
4. Click "Apply" on a questionnaire
5. Fill out and submit application
6. Verify appears in pending applications
7. View public candidate profile - verify endorsements section
8. View org profile - verify endorsed candidates section

---

## Rollback Plan

**Method**: Git revert
```bash
git revert HEAD && git push origin development
```

**Risk Level**: Low - UI-only changes, no schema/backend changes

**Estimated Rollback Time**: 5 minutes

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| candidate-system-integration.js too large | Medium | Low | Add to existing patterns, use modular functions |
| Question type rendering bugs | Medium | Medium | Reuse patterns from org-dashboard endorsement UI |
| API endpoint differences | Low | Medium | Test with actual API responses |

---

## Files to Modify

| File | Changes | Risk |
|------|---------|------|
| `frontend/src/integrations/candidate-system-integration.js` | Add endorsements tab, application modal | Medium (large file) |
| `frontend/src/modules/features/organizations/components/org-profile.js` | Add endorsed candidates section | Low |
| `frontend/src/styles/candidate-system.css` | Add endorsement-related styles | Low |
| `frontend/src/styles/org-profile.css` | Add endorsed candidates styles | Low |

---

## Implementation Phases

### Phase 3i-1: Candidate Dashboard Endorsements Tab
- Add tab navigation in candidate dashboard
- Implement available questionnaires browser
- Implement pending applications list
- Implement received endorsements display

### Phase 3i-2: Application Modal & Flow
- Application modal with questionnaire form
- Question type renderers
- Form validation and submission
- Withdraw functionality

### Phase 3i-3: Public Profile Integration
- Candidate profile org endorsements section
- Org profile endorsed candidates section

---

## DevLog Summary Needed: No
(Straightforward UI implementation following existing patterns)

---

## Verification Checklist
- [ ] Complexity score calculated: 10
- [ ] Implementation approach documented
- [ ] Change sequence determined
- [ ] Risks identified with mitigation
- [ ] Testing plan defined
- [ ] Rollback procedure ready
- [ ] Deploy step included (commit, push, verify)
- [ ] Handoff step included

---

## Dependencies

**Backend endpoints required** (all exist):
- `GET /api/questionnaires/candidates/:candidateId/available`
- `POST /api/endorsements/applications`
- `GET /api/endorsements/candidates/:candidateId`
- `GET /api/endorsements/candidates/:candidateId/pending`
- `POST /api/endorsements/applications/:applicationId/withdraw`
- `GET /api/endorsements/organizations/:organizationId`

**No backend changes needed.**

---

## Final Step: Handoff

After implementation:
1. Write handoff document to `.claude/handoffs/2026-01-[DD]-organizations-phase3i.md`
2. Update plan file status
3. Update CHANGELOG.md
4. Tell user: "Clear context and resume with: 'Continue from handoff organizations-phase3i'"
