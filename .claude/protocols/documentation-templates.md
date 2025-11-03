# Documentation Templates

**Protection Status**: Standard
**Created**: 2025-10-31
**Last Updated**: 2025-10-31

---

## 🎯 When to Use This Protocol

**USE THIS PROTOCOL when**:
- Creating new API endpoints
- Adding new backend services or functions
- Creating or modifying Prisma schema models
- Writing frontend modules or components
- Documenting existing undocumented code
- Need templates for Swagger, JSDoc, or Prisma comments

**SKIP THIS PROTOCOL if**:
- Code already properly documented (just follow existing pattern)
- Writing throwaway/experimental code (local only)
- Documentation templates are already clear from context

**UNCERTAIN?** Ask yourself:
- Am I creating something that other developers will use?
- Will this code be committed to the repository?
- Does this need to be maintained long-term?

---

## Overview

**PROJECT POLICY**: ALL code requires inline documentation. Code without docs is INCOMPLETE.

This protocol provides standard templates for all documentation types used in the UnitedWeRise project. Following these templates ensures consistency and completeness across the codebase.

**Documentation types covered:**
1. **Swagger/OpenAPI** - REST API endpoint documentation
2. **JSDoc** - Backend services and functions
3. **Prisma Schema** - Database models and fields
4. **Frontend JSDoc** - Frontend modules and functions

**Process**: READ implementation → FIND similar documented code → VERIFY match → CHECK consistency

---

## Prerequisites

- Code implementation completed (never guess at documentation)
- Understanding of what the code actually does
- Access to similar documented code for pattern matching
- Verification that documentation matches actual behavior

---

## Templates

### Template 1: Swagger (Backend Routes)

Use for all backend API endpoints.

```typescript
/**
 * @swagger
 * /api/resource:
 *   post:
 *     tags: [Category]
 *     summary: Brief action description
 *     description: Detailed explanation of what this endpoint does
 *     security:
 *       - cookieAuth: []  # Remove if public endpoint
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [field1, field2]
 *             properties:
 *               field1:
 *                 type: string
 *                 description: Purpose and constraints of field1
 *               field2:
 *                 type: number
 *                 description: Purpose and constraints of field2
 *     responses:
 *       200:
 *         description: Success response description
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   description: The returned data structure
 *       400:
 *         description: Validation error - invalid input
 *       401:
 *         description: Unauthorized - not authenticated
 *       403:
 *         description: Forbidden - not authorized
 *       404:
 *         description: Not found - resource doesn't exist
 *       500:
 *         description: Server error
 */
router.post('/resource', requireAuth, async (req: AuthRequest, res: Response) => {
  // Implementation
});
```

**Key requirements:**
- **Tags**: Categorize endpoint (e.g., [Posts], [Admin], [Auth])
- **Summary**: One-line description of what it does
- **Description**: Detailed explanation
- **Security**: Remove security block if public endpoint
- **Request body**: Complete schema with all properties, required fields, and descriptions
- **Responses**: Document ALL possible response codes endpoint actually returns

**CRITICAL**: Read actual `res.json()` and `res.status()` calls in implementation. Document what it ACTUALLY returns, not what you think it should return.

---

### Template 2: JSDoc (Services/Functions)

Use for all backend service functions and utility functions.

```typescript
/**
 * Brief one-line function description
 *
 * More detailed explanation of what this function does,
 * when to use it, and any important behavioral notes.
 *
 * @param paramName - Description of parameter with constraints (e.g., "User ID - must be valid cuid")
 * @param optionalParam - Optional parameter description (include defaults if applicable)
 * @returns Promise<Type> Description of what is returned and when
 * @throws {ValidationError} When validation of input fails
 * @throws {NotFoundError} When resource is not found
 * @throws {DatabaseError} When database operation fails
 *
 * @example
 * // Example showing typical usage
 * const result = await functionName('user_123', { optional: true });
 * console.log(result); // { id: '123', name: 'John' }
 *
 * @example
 * // Example showing error case
 * try {
 *   await functionName('invalid', {});
 * } catch (error) {
 *   console.error('Validation failed:', error);
 * }
 */
export async function functionName(
  paramName: string,
  optionalParam?: { optional?: boolean }
): Promise<ReturnType> {
  // Implementation
}
```

**Key requirements:**
- **Brief description**: One-line summary
- **Detailed description**: When needed, add multi-line explanation
- **@param**: All parameters documented with types and constraints
- **@returns**: Clear description of return value
- **@throws**: ALL exceptions that function can throw
- **@example**: At least one example showing typical usage

**CRITICAL**: Verify @throws matches actual throw statements in code.

---

### Template 3: Prisma Schema

Use for all Prisma models, fields, and enums.

```prisma
/// Brief model description explaining business purpose
/// @description Detailed explanation of model's role in system
model ResourceName {
  /// Unique identifier for the resource
  id          String    @id @default(cuid())

  /// User-facing display name
  name        String

  /// Optional description with constraints
  /// @example "This is a sample description"
  description String?   @db.Text

  /// Foreign key to User model
  userId      String

  /// Relationship with cascade delete
  /// When user is deleted, all their resources are also deleted
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  /// Timestamps for auditing
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([userId])  /// Index for efficient user-based queries
  @@index([createdAt])  /// Index for sorting by creation date
}

/// Status values for resource lifecycle
/// @description Tracks the current state of a resource
enum ResourceStatus {
  ACTIVE    /// Resource is currently active and available
  INACTIVE  /// Resource has been deactivated by user or admin
  PENDING   /// Resource awaiting approval or processing
  ARCHIVED  /// Resource has been archived for historical reference
}
```

**Key requirements:**
- **Model comments**: Use `///` for model-level description
- **Field comments**: Use `///` for each field explaining purpose
- **Relationship comments**: Explain what happens on cascade (delete, set null, etc.)
- **Index comments**: Why index exists (performance for what queries)
- **Enum comments**: Describe each enum value's meaning
- **@description**: Add detailed descriptions where helpful
- **@example**: Add examples for complex fields

**CRITICAL**: Describe actual business purpose, not just technical type.

---

### Template 4: Frontend JSDoc

Use for frontend modules, components, and utility functions.

```javascript
/**
 * @module ModuleName
 * @description What this module does and when to use it
 */

/**
 * Brief function description explaining what it does
 *
 * Detailed explanation of function behavior, when to use it,
 * and any important notes about usage or side effects.
 *
 * @param {string} paramName - Parameter description with type and constraints
 * @param {Object} options - Configuration options object
 * @param {boolean} [options.flag=false] - What this flag controls (optional with default)
 * @param {number} [options.timeout=5000] - Timeout in milliseconds
 * @returns {Promise<Object>} Description of return value structure
 * @returns {Promise<Object>} result - The result object
 * @returns {Promise<string>} result.id - The resource ID
 * @returns {Promise<string>} result.status - The operation status
 *
 * @throws {Error} When network request fails
 * @throws {ValidationError} When input validation fails
 *
 * @example
 * // Basic usage
 * const result = await functionName('value', { flag: true });
 * console.log(result.status); // 'success'
 *
 * @example
 * // With error handling
 * try {
 *   const result = await functionName('value', { timeout: 3000 });
 * } catch (error) {
 *   console.error('Operation failed:', error.message);
 * }
 */
export async function functionName(paramName, options = {}) {
  const { flag = false, timeout = 5000 } = options;
  // Implementation
}
```

**Key requirements:**
- **@module**: At top of file describing module purpose
- **Brief description**: One-line summary of function
- **@param**: Type hints with descriptions (use JSDoc type syntax)
- **@param for objects**: Document object properties individually
- **Optional params**: Use `[param=default]` syntax
- **@returns**: Describe return value structure
- **@throws**: Document possible errors
- **@example**: At least one practical example

---

## Procedure

### Step 1: Read Implementation First

**NEVER guess at documentation. Always read the actual code first.**

```typescript
// Example: Read this implementation
router.get('/user/:id', requireAuth, async (req, res) => {
  const userId = req.params.id;

  if (!userId) {
    return res.status(400).json({ error: 'User ID required' });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ success: true, user });
});
```

**Extract from code:**
- Returns: `{success: true, user: object}` on 200
- Returns: `{error: string}` on 400 and 404
- Status codes: 200, 400, 404
- Requires authentication

---

### Step 2: Find Similar Documented Code

Search for similar endpoint or function that's already documented:

```bash
# Find similar auth endpoints
grep -r "@swagger" backend/src/routes/auth.ts

# Find similar GET endpoints
grep -r "router.get" backend/src/routes/
```

Use documented code as template to ensure consistency.

---

### Step 3: Verify Docs Match Behavior

**Checklist:**
- [ ] Response schemas match `res.json()` calls
- [ ] Error codes match `res.status()` calls
- [ ] @throws matches actual throw statements
- [ ] @param types match function signature
- [ ] @returns matches actual return value
- [ ] Examples are valid and would actually work

**Common mistakes:**
- ❌ Documenting what you think it should do
- ❌ Copying docs from similar function without verifying
- ❌ Missing error cases that code actually handles
- ❌ Wrong types in documentation

---

### Step 4: Check Pattern Consistency

Compare your documentation to similar endpoints:

```bash
# Check consistency of similar endpoints
grep -A 20 "POST /api/posts" backend/src/routes/posts.ts
grep -A 20 "POST /api/comments" backend/src/routes/comments.ts
```

Ensure:
- Same tag structure
- Same error code documentation style
- Similar detail level
- Consistent terminology

---

## Verification

### Documentation Completeness Checklist

**Before committing:**
- [ ] Read implementation before documenting
- [ ] Found similar documented code as template
- [ ] Response schemas match res.json() calls
- [ ] Error codes match res.status() calls
- [ ] @throws matches throw statements
- [ ] Similar endpoints follow same pattern
- [ ] No invented/guessed documentation
- [ ] Examples are tested and work
- [ ] All parameters documented
- [ ] All return values documented

**For Swagger specifically:**
- [ ] All request body fields documented
- [ ] All response codes documented
- [ ] Security requirements specified
- [ ] Tags categorize correctly

**For Prisma specifically:**
- [ ] All models have /// comments
- [ ] All fields have /// comments
- [ ] All enums have descriptions
- [ ] Relationship behavior documented (cascade, etc.)

---

## Troubleshooting

**Issue**: Don't know what to write for documentation
**Solution**: Read the actual implementation. If you can't understand what it does from code, ask user or investigate more.

**Issue**: Similar code not documented
**Solution**: Document both the new code and the similar code you found.

**Issue**: Swagger docs don't show up in /api-docs
**Solution**:
- Check Swagger comment syntax is correct
- Verify file is imported in server.ts
- Check for YAML indentation errors

**Issue**: Documentation says one thing, code does another
**Solution**: Update documentation to match code (unless code is wrong, then fix code).

---

## Examples

### Example 1: Complete Swagger Documentation

```typescript
/**
 * @swagger
 * /api/posts/{id}:
 *   get:
 *     tags: [Posts]
 *     summary: Get post by ID
 *     description: Retrieves a single post with all its details, reactions, and comment count
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The post ID (cuid format)
 *     responses:
 *       200:
 *         description: Post retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 post:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     content:
 *                       type: string
 *                     authorId:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: Post not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Post not found"
 */
router.get('/posts/:id', requireAuth, async (req: AuthRequest, res) => {
  // Implementation matches documentation
});
```

---

### Example 2: Complete JSDoc for Service Function

```typescript
/**
 * Creates a new user account with the provided information
 *
 * Validates email uniqueness, hashes password, and creates user record
 * in database. Sends welcome email if email service is configured.
 *
 * @param email - User's email address - must be unique and valid format
 * @param password - Plain text password - will be hashed before storage
 * @param name - User's display name - must be 2-50 characters
 * @returns Promise<User> The created user object (without password hash)
 * @throws {ValidationError} When email format invalid or name too short/long
 * @throws {ConflictError} When email already exists in database
 * @throws {DatabaseError} When database operation fails
 *
 * @example
 * // Create new user
 * const user = await createUser(
 *   'user@example.com',
 *   'secure-password',
 *   'John Doe'
 * );
 * console.log(user.id); // 'cuid...'
 */
export async function createUser(
  email: string,
  password: string,
  name: string
): Promise<User> {
  // Implementation
}
```

---

## Related Resources

- `backend/src/routes/auth.ts` - Example of well-documented endpoints
- `CLAUDE.md` - Inline Documentation Requirements section
- `.claude/protocols/environment-auth-guide.md` - Auth middleware documentation patterns
- Swagger UI: http://localhost:3000/api-docs (local) or https://dev-api.unitedwerise.org/api-docs (staging)
