# UnitedWeRise Development Logs

This directory contains development logs documenting significant technical decisions and architectural changes to the UnitedWeRise platform.

## Purpose

DevLogs serve two purposes:
1. **Recruitment** - Demonstrate technical sophistication to potential contributors
2. **History** - Document the reasoning behind architectural decisions

## Entry Index

| Date | Topic | Summary |
|------|-------|---------|
| 2025-12-19 | [Authentication Architecture Refactor](./2025-12-19-auth-refactor.md) | Single source of truth pattern for auth state |

## Platform Stats

- **427 API endpoints** across 20+ route modules
- **Enterprise security**: httpOnly cookies, CSRF protection, TOTP 2FA, CSP headers
- **Modern stack**: TypeScript, Prisma ORM, ES6 modules, Azure cloud-native
- **Full CI/CD**: Automated migrations, staging/production isolation

## Want to Contribute?

See the [volunteer page](https://www.unitedwerise.org) or reach out directly.

---

*DevLogs are auto-generated during development sessions per the [DevLog Protocol](../../CLAUDE.md#devlog-generation).*
