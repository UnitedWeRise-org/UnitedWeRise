# Environment-Aware Authentication Guide

**Protection Status**: Standard
**Created**: 2025-10-31
**Last Updated**: 2025-10-31

---

## 🎯 When to Use This Protocol

**USE THIS PROTOCOL when**:
- Implementing new admin dashboard features
- Creating endpoints that should be admin-only in staging
- Adding content moderation features
- Building analytics or statistics endpoints
- Implementing user management features
- Working with authentication middleware
- Uncertain which auth middleware to use

**SKIP THIS PROTOCOL if**:
- Implementing user-facing features (posts, comments, profiles)
- Working on public content (no authentication required)
- Implementing features with clear existing auth pattern to follow

**UNCERTAIN?** Ask yourself:
- Is this an admin feature that regular users shouldn't access in staging?
- Should this endpoint have different access rules in production vs staging?
- Am I implementing something that requires authentication?

---

## Overview

The UnitedWeRise backend implements **environment-aware authentication** to enforce different access policies based on deployment environment. This protects unstable code in staging while allowing normal user access in production.

**Environment Policies:**
- **Production** (`NODE_ENV=production`): Regular authenticated users can access features
- **Staging** (`NODE_ENV=staging`): Admin-only access to protect unstable/unreleased code
- **Local Dev** (`NODE_ENV=development` or undefined): Admin-only access during active development

**Three middleware patterns available:**
1. `requireAuth` - Basic authentication (all environments allow authenticated users)
2. `requireStagingAuth` - Environment-aware (staging=admin-only, production=regular users)
3. `requireAuth + requireAdmin` - Always admin-only (all environments)

---

## Prerequisites

- Understanding of Express.js middleware
- Familiarity with project authentication system
- Access to `backend/src/middleware/auth.ts` file
- Understanding of TypeScript types (`AuthRequest`, `Response`, `NextFunction`)

---

## Procedure

### Step 1: Choose Correct Middleware Pattern

Use this decision tree to select the appropriate middleware:

```
Is this feature admin-only even in production?
├─ YES → Use: requireAuth + requireAdmin (Pattern 3)
└─ NO
   └─ Is this an admin/management feature that should be protected in staging?
      ├─ YES → Use: requireStagingAuth + requireAdmin (Pattern 2)
      └─ NO → Use: requireAuth (Pattern 1)
```

### Step 2: Import Required Middleware

**Pattern 1** (Basic Auth):
```typescript
import { requireAuth } from '../middleware/auth.js';
import type { AuthRequest } from '../types/index.js';
```

**Pattern 2** (Environment-Aware):
```typescript
import { requireStagingAuth, requireAdmin } from '../middleware/auth.js';
import type { AuthRequest } from '../types/index.js';
```

**Pattern 3** (Always Admin):
```typescript
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import type { AuthRequest } from '../types/index.js';
```

### Step 3: Apply Middleware to Route

**Pattern 1: Basic Authentication**

Use for user-facing features that any authenticated user can access.

```typescript
/**
 * @swagger
 * /api/posts:
 *   post:
 *     tags: [Posts]
 *     summary: Create a new post
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Post created successfully
 *       401:
 *         description: Not authenticated
 */
router.post('/posts', requireAuth, async (req: AuthRequest, res) => {
  // Any authenticated user can create posts in all environments
  const userId = req.user!.id;
  // ... implementation
});
```

**Pattern 2: Environment-Aware (Staging = Admin-Only)**

Use for admin/management features that should be restricted in staging but available to appropriate users in production.

```typescript
/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: Get all users (admin feature)
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (staging requires admin)
 */
router.get('/admin/users', requireStagingAuth, requireAdmin, async (req: AuthRequest, res) => {
  // Production: Regular authenticated users can access (if also have requireAdmin, only admins)
  // Staging/Dev: Admin-only
  // ... implementation
});
```

**Pattern 3: Always Admin-Only**

Use for security-critical operations that should always require admin access regardless of environment.

```typescript
/**
 * @swagger
 * /api/admin/users/:id/promote:
 *   post:
 *     tags: [Admin]
 *     summary: Promote user to admin (always admin-only)
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User promoted successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (admin-only)
 */
router.post('/admin/users/:id/promote', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  // Admin-only in ALL environments (production, staging, dev)
  // ... implementation
});
```

### Step 4: Document Endpoint Behavior

Always document which auth pattern is used and why:

```typescript
/**
 * Get user statistics
 *
 * Auth: requireStagingAuth + requireAdmin
 * - Production: Available to regular authenticated users
 * - Staging: Admin-only (protects analytics from regular test users)
 *
 * @returns User statistics object
 * @throws {401} Not authenticated
 * @throws {403} Not authorized in staging environment
 */
```

---

## Implementation Details

### How `requireStagingAuth` Works

Located in `backend/src/middleware/auth.ts` (lines 287-309):

```typescript
export const requireStagingAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  // Production: proceed with normal auth (regular users allowed)
  if (!isDevelopment()) {
    return requireAuth(req, res, next);
  }

  // Staging/Dev: require admin access
  await requireAuth(req, res, async (authError?: any) => {
    if (authError) return next(authError);

    if (!req.user?.isAdmin) {
      return res.status(403).json({
        error: 'This is a staging environment - admin access required.',
        environment: 'staging'
      });
    }
    next();
  });
};
```

**Key behaviors:**
1. Checks if environment is production (`!isDevelopment()`)
2. If production: Uses normal `requireAuth` (allows any authenticated user)
3. If staging/dev: Requires both authentication AND admin status
4. Returns 403 with helpful message if non-admin tries to access in staging

---

## Usage Guidelines

### Use `requireStagingAuth + requireAdmin` for:

**Admin Dashboard Features:**
- User management interfaces
- Content moderation tools
- System configuration pages
- Admin analytics dashboards

**Management Endpoints:**
- Badge/quest management
- MOTD (Message of the Day) management
- Analytics and statistics endpoints
- Content moderation endpoints

**Why**: These features should be fully functional in production but restricted to admins in staging to prevent test users from accessing incomplete features.

---

### Use `requireAuth + requireAdmin` for:

**Security-Critical Operations:**
- User promotion/demotion to admin
- Changing system security settings
- Accessing/modifying sensitive data
- Database migrations (if exposed via API)

**System Configuration:**
- Changing application configuration
- Managing API keys or secrets
- Modifying payment/billing settings

**Why**: These operations are so sensitive that they should ALWAYS require admin access, even in production.

---

### Use `requireAuth` only for:

**User-Facing Features:**
- Creating/editing/deleting posts
- Adding comments
- Reacting to content
- Following other users

**Personal Data Access:**
- Viewing own profile
- Editing own settings
- Accessing own notifications
- Managing own saved content

**Public Content Browsing:**
- Viewing public posts
- Browsing user profiles
- Searching content

**Why**: These are normal user features that should be accessible to all authenticated users in all environments.

---

## Verification

### Testing Checklist

When implementing new endpoints with authentication:

**Before deployment:**
- [ ] Chose correct middleware pattern based on guidelines
- [ ] Imported required middleware functions
- [ ] Applied middleware to route correctly
- [ ] Documented endpoint behavior in Swagger/JSDoc
- [ ] Added inline comment explaining auth choice

**After deploying to staging:**
- [ ] Test with admin user: Should have full access
- [ ] Test with non-admin user:
  - `requireAuth`: Should have access
  - `requireStagingAuth + requireAdmin`: Should get 403
  - `requireAuth + requireAdmin`: Should get 403
- [ ] Check error messages are helpful
- [ ] Verify response codes correct (401 for not authenticated, 403 for not authorized)

**After deploying to production:**
- [ ] Test with admin user: Should have full access
- [ ] Test with regular user:
  - `requireAuth`: Should have access
  - `requireStagingAuth`: Should have access (if endpoint allows)
  - `requireAuth + requireAdmin`: Should get 403
- [ ] Verify no degradation of user experience

---

## Troubleshooting

**Issue**: Non-admin users getting 403 in production
**Solution**:
- Check if using `requireAdmin` in production
- If endpoint should be available to regular users, use `requireStagingAuth` instead of `requireAuth + requireAdmin`
- Verify `NODE_ENV=production` is set correctly

**Issue**: Regular users accessing admin features in staging
**Solution**:
- Endpoint missing authentication middleware
- Using `requireAuth` instead of `requireStagingAuth`
- Check middleware is imported correctly

**Issue**: "This is a staging environment - admin access required" in production
**Solution**:
- Backend environment misconfigured
- `NODE_ENV` not set to `production`
- Check environment variables in Azure Container App

**Issue**: Cannot test admin features in staging as regular user
**Solution**:
- This is expected behavior
- Use admin account for testing in staging
- Or temporarily use `requireAuth` for testing (revert before deploying to production)

---

## Examples

### Example 1: Admin Dashboard Endpoint

```typescript
import { requireStagingAuth, requireAdmin } from '../middleware/auth.js';
import type { AuthRequest } from '../types/index.js';

/**
 * @swagger
 * /api/admin/dashboard/stats:
 *   get:
 *     tags: [Admin]
 *     summary: Get dashboard statistics
 *     description: Admin dashboard statistics (staging=admin-only, production=available)
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved
 *       403:
 *         description: Admin access required (staging environment)
 */
router.get('/admin/dashboard/stats', requireStagingAuth, requireAdmin, async (req: AuthRequest, res) => {
  // Implementation
  const stats = await getDashboardStats();
  res.json({ success: true, stats });
});
```

**Behavior:**
- Staging: Only admins can access
- Production: Available to appropriate users

---

### Example 2: Security-Critical Endpoint

```typescript
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import type { AuthRequest } from '../types/index.js';

/**
 * @swagger
 * /api/admin/users/:id/role:
 *   put:
 *     tags: [Admin]
 *     summary: Change user role (always admin-only)
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Role updated
 *       403:
 *         description: Admin access required
 */
router.put('/admin/users/:id/role', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  // ALWAYS admin-only (production, staging, dev)
  const { role } = req.body;
  await updateUserRole(req.params.id, role);
  res.json({ success: true });
});
```

**Behavior:**
- All environments: Admin-only

---

### Example 3: User-Facing Endpoint

```typescript
import { requireAuth } from '../middleware/auth.js';
import type { AuthRequest } from '../types/index.js';

/**
 * @swagger
 * /api/posts:
 *   post:
 *     tags: [Posts]
 *     summary: Create a post (any authenticated user)
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Post created
 *       401:
 *         description: Not authenticated
 */
router.post('/posts', requireAuth, async (req: AuthRequest, res) => {
  // Any authenticated user in all environments
  const userId = req.user!.id;
  const post = await createPost(userId, req.body);
  res.json({ success: true, post });
});
```

**Behavior:**
- All environments: Any authenticated user

---

## Related Resources

- `backend/src/middleware/auth.ts` - Authentication middleware implementation
- `backend/src/utils/isDevelopment.ts` - Environment detection utility
- `.claude/protocols/documentation-requirements.md` - Comprehensive documentation guidance and templates
- `CLAUDE.md` - Core authentication principles and environment configuration
