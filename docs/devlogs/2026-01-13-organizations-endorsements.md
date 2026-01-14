# Organizations & Endorsements Feature Implementation
**Date:** 2026-01-13

## User Intent
Build a comprehensive organization system enabling civic groups to form, manage membership with delegable roles, define geographic jurisdictions, and provide official endorsements to candidates seeking their support.

## What Changed
- Created 15+ new database models for organizations, membership, roles, endorsements, and discussions
- Implemented capability-based authorization system with 28 predefined capabilities
- Built endorsement workflow: questionnaires, applications, org-defined voting thresholds, publication
- Added H3 geospatial jurisdiction management for endorsement eligibility
- Extended CivicEvent to support organization-hosted events
- Created internal discussion system with visibility levels

## Technical Decisions
- **H3 Resolution 7** (~5km hexagons) chosen for jurisdiction boundaries - balances precision with storage
- **Capability-based auth** over role-based: more flexible, orgs define their own roles mapping to capabilities
- **Org-defined voting thresholds** rather than platform-wide: each org decides SIMPLE_MAJORITY vs TWO_THIRDS etc.
- **One-head-per-user rule**: prevents spam orgs, ensures accountability
- **Questionnaire model separate from questions**: allows reusing questionnaire structure, versioning

## Files Modified
- `backend/prisma/schema.prisma` (15+ new models)
- `backend/src/middleware/orgAuth.ts` (new)
- `backend/src/services/organizationService.ts` (new)
- `backend/src/services/jurisdictionService.ts` (new)
- `backend/src/services/questionnaireService.ts` (new)
- `backend/src/services/endorsementService.ts` (new)
- `backend/src/services/discussionService.ts` (new)
- `backend/src/routes/organizations.ts` (new)
- `backend/src/routes/questionnaires.ts` (new)
- `backend/src/routes/endorsements.ts` (new)
- `backend/src/routes/discussions.ts` (new)
- `backend/src/routes/civic.ts` (modified)
- `backend/src/server.ts` (modified)
