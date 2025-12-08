# Execute Protocol

**Phase**: 3 of 5 (Audit → Plan → Execute → Test → Document)
**Last Updated**: 2025-12-08

---

## STOP Criteria

This protocol always applies during code changes. The scope varies by complexity:
- **Simple changes**: Follow Quick Reference checklist
- **Complex changes**: Follow Full Procedure with tracking

---

## Quick Reference

### Pre-Implementation Checklist

Before writing code:
- [ ] Search for existing patterns (never create new when pattern exists)
- [ ] Check if dependencies already exist
- [ ] Understand the established patterns exactly
- [ ] Identify any code that might be duplicated

### During Implementation

- [ ] Make smallest possible change first
- [ ] Test each change before proceeding
- [ ] Follow established patterns exactly
- [ ] Document rationale for non-obvious decisions

### Pre-Commit Checklist

Must pass before committing:
- [ ] Build compiles without errors (`npm run build`)
- [ ] TypeScript passes (`npx tsc --noEmit`)
- [ ] Error handling on all external calls
- [ ] No debug code or console.logs
- [ ] No commented-out code blocks
- [ ] Single responsibility per function
- [ ] Schema changes have migration created

---

## Full Procedure

### Execution Standards

**Always:**
- Make smallest possible change first
- Test each change before proceeding
- Check for existing solutions before creating new code
- Follow established patterns in codebase
- Document rationale for each change
- Use TodoWrite to track multi-step tasks

**Never:**
- Skip testing between changes
- Make changes in wrong order (frontend before backend exists)
- Create duplicate functionality
- Assume change worked without verification
- Rush through steps to save time

### Code Quality Requirements

**All code must include:**
- Error handling on all external calls (API, file I/O, database)
- Input validation at system boundaries
- Success and failure paths considered
- Assumption that all external dependencies can fail

**All code must avoid:**
- Hardcoded values (URLs, credentials, configuration)
- Debug code/console.logs in commits
- Bypassing framework patterns when they exist

### Security Requirements

**Always:**
- Validate inputs at system boundaries
- Use existing authentication middleware (never roll your own)
- Encrypt sensitive data in transit and at rest
- Principle of least privilege for permissions
- Log security events (login attempts, permission changes)
- Consider attack vectors (injection, XSS, CSRF)

**Never:**
- Bypass authentication/authorization checks
- Store secrets/credentials in code or version control
- Trust user input without validation
- Expose sensitive data in logs or error messages

### Change Sequencing

**Standard order (bottom-up):**
1. **Database** - Schema changes, migrations
2. **Backend** - API endpoints, business logic
3. **Frontend** - UI components, API integration

**Each layer should be testable before building next.**

### Multi-Step Task Tracking

For complex implementations, use TodoWrite:

```javascript
TodoWrite([
  { content: "Create database migration", status: "in_progress", activeForm: "Creating migration" },
  { content: "Implement backend endpoint", status: "pending", activeForm: "Implementing endpoint" },
  { content: "Build frontend component", status: "pending", activeForm: "Building component" }
]);
```

**Rules:**
- Exactly ONE task in_progress at any time
- Mark completed immediately after finishing
- Add new tasks as discovered during implementation

### Commit Granularity

- **One logical change per commit** (feature, bugfix, refactor)
- **Commit when code reaches working state**, not mid-implementation
- **If work spans multiple sessions**, commit at session end with "WIP:" prefix
- **Never commit broken/non-compiling code** unless explicitly directed

---

## Verification

**Execution phase is complete when:**
- [ ] All planned changes implemented
- [ ] Each change tested individually
- [ ] Build compiles without errors
- [ ] No console errors in browser
- [ ] Pre-commit checklist passes
- [ ] Changes saved to files (verify with `git diff`)
- [ ] Only intended files modified

---

## Troubleshooting

**Build fails after changes?**
- Check TypeScript errors (`npx tsc --noEmit`)
- Verify imports are correct
- Check for missing dependencies

**Pattern not found in codebase?**
- Use Task/Explore agents to search
- Check similar features for patterns
- Ask user before creating new pattern

**Changes not taking effect?**
- Verify file saved
- Check if build process needed
- Clear browser cache
- Restart development server

**Accidentally modified wrong file?**
- Use `git diff` to see all changes
- Use `git checkout -- <file>` to revert specific file
