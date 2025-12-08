# Project Protocol Library

**Version 4.0 - Phase-Based Protocol System**
**Last Updated**: 2025-12-08

---

## Overview

This directory contains **project-specific** protocols for UnitedWeRise.

**Global protocols** (phase protocols + ES6) are in `~/.claude/protocols/` and shared across all projects.

---

## Protocol Structure

### Global Protocols (in ~/.claude/protocols/)

Phase protocols trigger automatically for all code changes:

| Phase | Protocol | Purpose |
|-------|----------|---------|
| 1. Audit | `audit_protocol.md` | Understand before changing |
| 2. Plan | `plan_protocol.md` | Complexity scoring, approach design |
| 3. Execute | `execute_protocol.md` | Code quality, execution standards |
| 4. Test | `test_protocol.md` | Verification, testing matrix |
| 5. Document | `document_protocol.md` | Required documentation |

Plus: `es6_protocol.md` (🔒 PROTECTED) - ES6 module migration

### Project-Specific Protocols (this directory)

| Protocol | Protected | Purpose |
|----------|-----------|---------|
| `deployment_protocol.md` | 🔒 Yes | Azure deployment procedures |
| `deployment_troubleshooting_protocol.md` | No | Deployment failure diagnosis |
| `auth_protocol.md` | No | Environment-aware auth patterns |

---

## How to Use

### Phase Protocols (Automatic)
1. All code changes trigger the 5-phase system
2. Read each protocol from `~/.claude/protocols/` when entering that phase
3. Follow STOP criteria to determine if detailed procedures needed

### Project Protocols (By Keyword)
1. Identify trigger keywords from protocol descriptions
2. Read "When to Use" section (lightweight check)
3. If relevant, load and follow complete protocol

---

## Protocol Descriptions

### deployment_protocol.md (🔒 PROTECTED)
- **Keywords**: deploy, push to production, merge to main, staging deployment
- **Purpose**: Azure Container Apps deployment with GitHub Actions
- **Contains**: Automated deployment, manual fallback, migration safety, rollback

### deployment_troubleshooting_protocol.md
- **Keywords**: deployment stuck, wrong SHA, changes not visible, health check fails
- **Purpose**: 9-step diagnostic for deployment problems
- **Contains**: Step-by-step troubleshooting from commits to nuclear option

### auth_protocol.md
- **Keywords**: admin endpoint, auth middleware, requireAuth, requireStagingAuth
- **Purpose**: UnitedWeRise environment-aware authentication
- **Contains**: Middleware selection, testing checklist, implementation examples

---

## Archived Protocols

Previous protocol versions are in `.claude/archive/protocols-v3/`.
