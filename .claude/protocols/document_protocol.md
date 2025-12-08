# Document Protocol

**Phase**: 5 of 5 (Audit → Plan → Execute → Test → Document)
**Last Updated**: 2025-12-08

---

## STOP Criteria

**This phase cannot be skipped.** Documentation is required for all code changes.

The scope varies by change type:
- **Trivial changes**: Only CHANGELOG.md (if user-facing)
- **API changes**: Swagger + CHANGELOG.md + MASTER_DOCUMENTATION.md
- **Schema changes**: Prisma comments + CHANGELOG.md + MASTER_DOCUMENTATION.md
- **Behavior changes**: All relevant documentation

---

## Quick Reference

### Documentation Requirements by Change Type

| Change Type | Inline Docs | CHANGELOG | MASTER_DOCS |
|-------------|-------------|-----------|-------------|
| API endpoint added/modified | Swagger | Yes | § API Reference |
| Database schema | Prisma `///` | Yes | § Database Schema |
| UI/UX changes | JSDoc | If user-facing | § UI/UX Components |
| Bug fix | If complex | Yes | If behavior changed |
| Backend service | JSDoc | If user-facing | If architecture changed |
| Configuration | Comments | Yes | § Infrastructure |
| Security/auth | JSDoc | Yes | § Security |

### Pre-Commit Documentation Checklist

- [ ] Inline documentation added (Swagger/JSDoc/Prisma)
- [ ] CHANGELOG.md updated (if user-facing change)
- [ ] MASTER_DOCUMENTATION.md updated (if system behavior changed)
- [ ] README.md updated (if setup/config changed)

---

## Full Procedure

### Documentation Process

**Step 1: Read Implementation First**
Never guess at documentation. Read actual code to document what it DOES, not what you think it should do.

**Step 2: Find Similar Documented Code**
Search for similar patterns already documented. Use as template for consistency.

**Step 3: Write Documentation**
Follow templates below for the documentation type needed.

**Step 4: Verify Accuracy**
- Response schemas match `res.json()` calls
- Error codes match `res.status()` calls
- @throws matches actual throw statements
- Examples are valid and work

### Template 1: Swagger (API Endpoints)

```typescript
/**
 * @swagger
 * /api/resource:
 *   post:
 *     tags: [Category]
 *     summary: Brief action description
 *     description: Detailed explanation
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [field1]
 *             properties:
 *               field1:
 *                 type: string
 *                 description: Purpose of field1
 *     responses:
 *       200:
 *         description: Success response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 */
```

**Requirements:**
- Tags: Categorize endpoint (Posts, Admin, Auth)
- Summary: One-line description
- Security: Remove if public endpoint
- Request body: All properties documented
- Responses: ALL status codes actually returned

### Template 2: JSDoc (Backend Services)

```typescript
/**
 * Brief function description
 *
 * Detailed explanation of behavior and usage.
 *
 * @param paramName - Description with constraints
 * @returns Promise<Type> Description of return value
 * @throws {ErrorType} When this error occurs
 *
 * @example
 * const result = await functionName('value');
 */
```

**Requirements:**
- Brief description: One-line summary
- @param: All parameters with types/constraints
- @returns: Clear return value description
- @throws: ALL exceptions function can throw
- @example: At least one usage example

### Template 3: Prisma Schema

```prisma
/// Model description explaining business purpose
model ResourceName {
  /// Unique identifier
  id          String    @id @default(cuid())

  /// User-facing display name
  name        String

  /// Foreign key to User model
  userId      String

  /// Relationship - cascades on delete
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])  /// Index for user-based queries
}

/// Status values for resource lifecycle
enum ResourceStatus {
  ACTIVE    /// Resource is active
  INACTIVE  /// Resource deactivated
}
```

**Requirements:**
- Model comments: `///` for model description
- Field comments: `///` for each field
- Relationship comments: Cascade behavior
- Index comments: Why index exists
- Enum comments: Each value's meaning

### Template 4: Frontend JSDoc

```javascript
/**
 * @module ModuleName
 * @description Module purpose
 */

/**
 * Brief function description
 *
 * @param {string} paramName - Description
 * @param {Object} options - Configuration options
 * @param {boolean} [options.flag=false] - What flag controls
 * @returns {Promise<Object>} Return value structure
 * @throws {Error} When operation fails
 *
 * @example
 * const result = await functionName('value', { flag: true });
 */
```

### CHANGELOG.md Format

```markdown
## [YYYY-MM-DD] - Category: Brief description

### Added
- New feature description

### Changed
- Modified behavior description

### Fixed
- Bug fix description
```

**Categories:** Added, Changed, Fixed, Removed, Security, Performance

### MASTER_DOCUMENTATION.md Section Map

**Authentication/Authorization:**
→ Section 7: `## SECURITY & AUTHENTICATION`

**Database Schema:**
→ Section 6: `## DATABASE SCHEMA`

**API Endpoints:**
→ Section 4: `## API REFERENCE`

**UI/UX Components:**
→ Section 8: `## UI/UX COMPONENTS`

**ES6/JavaScript:**
→ Section 5: `## ES6 MODULE SYSTEM`
→ Section 9: `## JAVASCRIPT MODULARIZATION`

**Deployment/Infrastructure:**
→ Section 10: `## DEPLOYMENT & INFRASTRUCTURE`

**Admin Dashboard:**
→ Section 11: `## MONITORING & ADMIN`

**AI/Semantic Features:**
→ Section 12: `## AI & SEMANTIC FEATURES`

**Social Features:**
→ Section 14: `## SOCIAL FEATURES`

**Media/Photos:**
→ Section 16: `## MEDIA & PHOTOS`

**Performance:**
→ Section 17: `## PERFORMANCE OPTIMIZATIONS`

### Documentation Quality Standards

**All documentation must be:**
- **Technically precise**: Accurate details, correct syntax
- **Error scenarios included**: What errors can occur
- **Examples provided**: Real-world usage examples
- **Tested**: Verify matches actual behavior

**Common mistakes to avoid:**
- Documenting what you THINK it should do
- Copying docs without verifying accuracy
- Missing error cases code handles
- Wrong types in documentation

---

## Verification

**Document phase is complete when:**
- [ ] Inline documentation added (Swagger/JSDoc/Prisma)
- [ ] CHANGELOG.md updated (if user-facing)
- [ ] MASTER_DOCUMENTATION.md updated (if behavior changed)
- [ ] Documentation accuracy verified (matches actual code)
- [ ] Cross-references valid (links work)

**You should be able to answer:**
- Can a new developer understand this code from docs?
- Will users know what changed (CHANGELOG)?
- Is the system documentation up to date?

---

## Troubleshooting

**Don't know what to document?**
- Read the actual implementation
- If you can't understand it, ask before guessing

**Swagger docs don't show in /api-docs?**
- Check Swagger comment syntax
- Verify file imported in server.ts
- Check YAML indentation

**Documentation conflicts with code?**
- Update documentation to match code
- Unless code is wrong, then fix code

**Similar code not documented?**
- Document both new and similar code
- Improve codebase documentation as you go
