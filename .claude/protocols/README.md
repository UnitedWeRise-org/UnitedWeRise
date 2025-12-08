# Claude Code Protocol Library

**Version 4.0 - Phase-Based Protocol System**
**Last Updated**: 2025-12-08

---

## Overview

This directory contains detailed step-by-step procedures for development work. Protocols are organized into two categories:

1. **Phase Protocols** (5) - Triggered automatically for all code changes
2. **Special Protocols** (4) - Triggered by specific keywords/situations

**Philosophy**: CLAUDE.md contains WHAT/WHY/WHEN (principles, triggers). Protocol files contain HOW (procedures, checklists). Each protocol has internal STOP criteria for when detailed procedures can be skipped.

---

## Phase Protocols

All code changes follow these 5 phases. Each protocol has STOP criteria for when its detailed procedures aren't needed.

| Phase | Protocol | Purpose |
|-------|----------|---------|
| 1. Audit | `audit_protocol.md` | Understand before changing |
| 2. Plan | `plan_protocol.md` | Complexity scoring, approach design |
| 3. Execute | `execute_protocol.md` | Code quality, execution standards |
| 4. Test | `test_protocol.md` | Verification, testing matrix |
| 5. Document | `document_protocol.md` | Required documentation |

### audit_protocol.md
- **Phase**: 1 of 5
- **Purpose**: System investigation before code changes
- **Contains**: Investigation commands, 10-point audit checklist, special case audits
- **STOP Criteria**: Single file change, exact solution known, no cross-system impact

### plan_protocol.md
- **Phase**: 2 of 5
- **Purpose**: Complexity scoring, risk assessment, approach design
- **Contains**: Complexity scoring (0-12 points), auto-escalate categories, risk matrix, rollback protocol
- **STOP Criteria**: Complexity score 0-8, not auto-escalate category, simple pattern exists

### execute_protocol.md
- **Phase**: 3 of 5
- **Purpose**: Code quality standards, execution standards
- **Contains**: Pre-implementation checklist, code quality requirements, security requirements, change sequencing
- **STOP Criteria**: Always applies (no skip)

### test_protocol.md
- **Phase**: 4 of 5
- **Purpose**: Testing matrix, verification requirements
- **Contains**: Testing matrix by task type, testing workflow, comprehensive checklists
- **STOP Criteria**: Single file, no integration points, build passes, smoke test passes

### document_protocol.md
- **Phase**: 5 of 5
- **Purpose**: Documentation requirements and templates
- **Contains**: Documentation templates (Swagger, JSDoc, Prisma), CHANGELOG format, MASTER_DOCUMENTATION section map
- **STOP Criteria**: Cannot skip (scope varies by change type)

---

## Special Protocols

Trigger by keyword or situation. Read "When to Use" section as lightweight check.

### deployment_protocol.md (🔒 PROTECTED)
- **Keywords**: deploy, push to production, merge to main, staging deployment
- **Purpose**: Complete deployment procedures including validation, execution, verification
- **Contains**: Automated + manual deployment, database migration safety, rollback procedures

### deployment_troubleshooting_protocol.md
- **Keywords**: deployment stuck, wrong SHA, changes not visible, health check fails
- **Purpose**: 9-step diagnostic protocol for deployment problems
- **Contains**: Step-by-step troubleshooting from commits to nuclear option

### es6_protocol.md (🔒 PROTECTED)
- **Keywords**: `<script>`, inline code, ES6, module, modularize, non-module script
- **Purpose**: 6-phase procedure to prevent incomplete migrations
- **Contains**: Detection, analysis, creation, testing, cleanup, documentation phases

### auth_protocol.md
- **Keywords**: admin endpoint, auth middleware, requireAuth, requireStagingAuth
- **Purpose**: Environment-aware authentication middleware patterns
- **Contains**: Middleware selection guide, testing checklist, implementation examples

---

## How to Use

### Phase Protocols (Automatic)
1. All code changes trigger the 5-phase system
2. Read each protocol when entering that phase
3. Follow STOP criteria to determine if detailed procedures needed

### Special Protocols (By Keyword)
1. Identify trigger keywords from protocol descriptions
2. Read "When to Use" section (lightweight check)
3. If relevant, load and follow complete protocol

---

## Protected Protocols 🔒

Some protocols are PROTECTED. These contain critical procedures developed through real incidents.

**Protected protocols**:
- `deployment_protocol.md` - Critical deployment safety
- `es6_protocol.md` - Prevents incomplete migrations

**Protection rules**:
- Cannot be reworded, consolidated, or modified without explicit approval
- Can be enhanced with additional context if it doesn't change core procedure

---

## Quick Reference

| Protocol | Type | Protected |
|----------|------|-----------|
| audit_protocol.md | Phase 1 | No |
| plan_protocol.md | Phase 2 | No |
| execute_protocol.md | Phase 3 | No |
| test_protocol.md | Phase 4 | No |
| document_protocol.md | Phase 5 | No |
| deployment_protocol.md | Special | 🔒 Yes |
| deployment_troubleshooting_protocol.md | Special | No |
| es6_protocol.md | Special | 🔒 Yes |
| auth_protocol.md | Special | No |

**Total Protocols**: 9 (2 protected)

---

## Archived Protocols

Previous protocol versions are archived in `.claude/archive/protocols-v3/`:
- audit-checklist.md → merged into audit_protocol.md
- decision-frameworks.md → merged into plan_protocol.md
- risk-assessment-framework.md → merged into plan_protocol.md
- testing-checklist.md → merged into test_protocol.md
- verification-checklists.md → merged into test_protocol.md
- documentation-requirements.md → merged into document_protocol.md
- documentation-templates.md → merged into document_protocol.md
- deployment-procedures.md → renamed to deployment_protocol.md
- deployment-troubleshooting.md → renamed to deployment_troubleshooting_protocol.md
- es6-modularization.md → renamed to es6_protocol.md
- environment-auth-guide.md → renamed to auth_protocol.md
