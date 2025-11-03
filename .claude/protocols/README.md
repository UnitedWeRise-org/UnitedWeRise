# Claude Code Protocol Library

**Purpose**: This directory contains detailed step-by-step procedures extracted from CLAUDE.md files to reduce context bloat while maintaining comprehensive guidance.

**Philosophy**: CLAUDE.md contains WHAT/WHY/WHEN (principles, triggers). Protocol files contain HOW (procedures, checklists).

---

## Protocol Index

### Core Protocols (Apply to Most Development Work)

**[systematic-development-protocol.md](./systematic-development-protocol.md)**
- **When**: ALL complex development (bug fixes, features, refactoring, architectural changes)
- **Purpose**: Audit → Plan → Execute → Test → Document methodology to prevent "2 steps forward, 3 steps back"
- **Triggers**: non-trivial bugs, new features, uncertain about current code, changes impact multiple systems, previous attempts failed
- **Philosophy**: Understand before changing. Full system understanding (frontend + backend + database + middleware + timing) required before coding.

---

### Global Protocols

**[verification-checklists.md](./verification-checklists.md)**
- **When**: After deployment or code changes
- **Purpose**: Detailed verification steps to ensure changes are properly deployed and working
- **Triggers**: completion of deployment, code changes, verification needed

**[decision-frameworks.md](./decision-frameworks.md)**
- **When**: Complex tasks, architectural changes, risk assessment needed
- **Purpose**: Frameworks for complexity scoring, documentation, testing, rollback planning
- **Triggers**: architectural change, complex refactor, security-critical work, uncertain task scope

**[es6-modularization.md](./es6-modularization.md)** 🔒 PROTECTED
- **When**: Migrating non-module JavaScript to ES6 modules
- **Purpose**: 6-phase procedure to prevent incomplete migrations that cause bugs
- **Triggers**: `<script>` tags, inline code, module migration, non-module scripts
- **Protection**: This protocol is PROTECTED and must not be modified without explicit approval

---

### Project Protocols

**[documentation-templates.md](./documentation-templates.md)**
- **When**: Creating/updating endpoints, services, schemas
- **Purpose**: Standard templates for Swagger, JSDoc, Prisma documentation
- **Triggers**: new endpoints, API changes, schema changes, service functions

**[environment-auth-guide.md](./environment-auth-guide.md)**
- **When**: Implementing authentication-protected features
- **Purpose**: Middleware patterns and usage guidelines for environment-aware authentication
- **Triggers**: admin endpoints, auth middleware, `requireAuth`, `requireStagingAuth`, environment-aware auth

**[deployment-procedures.md](./deployment-procedures.md)** 🔒 PROTECTED
- **When**: Deploying to staging or production
- **Purpose**: Complete deployment procedures including validation, execution, verification
- **Triggers**: deploy, push to production, merge to main, staging deployment
- **Protection**: This protocol is PROTECTED and must not be modified without explicit approval

**[deployment-troubleshooting.md](./deployment-troubleshooting.md)**
- **When**: Deployment issues or verification failures
- **Purpose**: 9-step diagnostic protocol for deployment problems
- **Triggers**: deployment stuck, wrong SHA, changes not visible, health check fails

---

## How to Use Protocols

### 1. Check for Relevance (Lightweight)
When you encounter trigger keywords or situations, check the protocol's "When to Use" section first.

### 2. Load If Relevant
If the "When to Use" section indicates relevance, read and follow the complete protocol.

### 3. Follow Systematically
Protocols are designed to be followed step-by-step. Don't skip phases unless explicitly indicated.

---

## Protocol File Structure

All protocol files follow this standard structure:

```markdown
# Protocol Name

**Protection Status**: [🔒 PROTECTED | Standard]
**Created**: [Date]
**Last Updated**: [Date]

## 🎯 When to Use This Protocol

**USE THIS PROTOCOL if**:
- [Specific conditions]

**SKIP THIS PROTOCOL if**:
- [Exclusions]

**UNCERTAIN?** Ask yourself:
- [Relevance questions]

## Overview
[Summary]

## Prerequisites
[Required before starting]

## Procedure
[Detailed steps by phase]

## Verification
[Checklist]

## Troubleshooting
[Common issues]

## Examples
[Real-world scenarios]

## Related Resources
[Cross-references]
```

---

## Protected Protocols 🔒

Some protocols are marked as PROTECTED. These contain critical procedures developed through real incidents and must not be modified without explicit user approval.

**Protected protocols**:
- `es6-modularization.md` - Prevents incomplete migrations
- `deployment-procedures.md` - Critical deployment safety

**Protection rules**:
- Cannot be reworded, consolidated, or modified without explicit approval
- Can be enhanced with additional context if it doesn't change core procedure
- Protection status is inherited from CLAUDE.md sections

---

## Maintenance

**Adding new protocols**:
1. Create protocol file following standard structure
2. Add entry to this README.md index
3. Add trigger keywords to CLAUDE.md Protocol Reference System
4. Update related protocols' "Related Resources" sections

**Updating existing protocols**:
1. Check protection status first
2. Update "Last Updated" date
3. Maintain backward compatibility where possible
4. Update CHANGELOG.md if significant changes

**Archiving obsolete protocols**:
1. Move to `.claude/protocols/archive/`
2. Update index to note archived status
3. Remove trigger references from CLAUDE.md
4. Document reason for archival

---

## Quick Reference

| Protocol | Protected | Lines | Use Case |
|----------|-----------|-------|----------|
| **systematic-development-protocol** | **No** | **~607** | **CORE: All complex development work** |
| verification-checklists | No | ~448 | Post-deployment/change verification |
| decision-frameworks | No | ~419 | Complex task planning |
| es6-modularization | 🔒 Yes | ~313 | JavaScript module migration |
| documentation-templates | No | ~532 | API/code documentation |
| environment-auth-guide | No | ~459 | Authentication implementation |
| deployment-procedures | 🔒 Yes | ~611 | Staging/production deployment |
| deployment-troubleshooting | No | ~611 | Deployment issue diagnosis |

---

**Last Updated**: 2025-10-31
**Total Protocols**: 8 (2 protected)
**Context Saved**: Significant - protocols loaded on-demand instead of always in context
