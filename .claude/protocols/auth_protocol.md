# Authentication Protocol

**Type**: Special
**Last Updated**: 2025-12-08

---

## When to Use

**USE THIS PROTOCOL when**:
- Implementing new admin dashboard features
- Creating endpoints that should be admin-only in staging
- Adding content moderation features
- Building analytics or statistics endpoints
- Working with authentication middleware
- Uncertain which auth middleware to use

**SKIP if**:
- Implementing user-facing features (posts, comments, profiles)
- Working on public content (no auth required)
- Clear existing auth pattern to follow

---

## Overview

The UnitedWeRise backend implements **environment-aware authentication**:

| Environment | Policy |
|-------------|--------|
| Production | Regular authenticated users allowed |
| Staging | Admin-only access |
| Local Dev | Admin-only access |

**Three middleware patterns:**

1. `requireAuth` - Basic auth (all environments allow authenticated users)
2. `requireStagingAuth` - Environment-aware (staging=admin-only, production=regular)
3. `requireAuth + requireAdmin` - Always admin-only

---

## Middleware Selection

```
Is this admin-only even in production?
├─ YES → Use: requireAuth + requireAdmin
└─ NO
   └─ Is this an admin feature to protect in staging?
      ├─ YES → Use: requireStagingAuth + requireAdmin
      └─ NO → Use: requireAuth
```

---

## Pattern 1: Basic Authentication

**Use for:** User-facing features any authenticated user can access.

```typescript
import { requireAuth } from '../middleware/auth.js';

router.post('/posts', requireAuth, async (req: AuthRequest, res) => {
  // Any authenticated user in all environments
});
```

**Examples:** Creating posts, adding comments, viewing profiles, following users

---

## Pattern 2: Environment-Aware

**Use for:** Admin features protected in staging but available in production.

```typescript
import { requireStagingAuth, requireAdmin } from '../middleware/auth.js';

router.get('/admin/stats', requireStagingAuth, requireAdmin, async (req: AuthRequest, res) => {
  // Production: Available to admins
  // Staging: Admin-only
});
```

**Examples:** User management, content moderation, analytics dashboards

---

## Pattern 3: Always Admin-Only

**Use for:** Security-critical operations requiring admin in all environments.

```typescript
import { requireAuth, requireAdmin } from '../middleware/auth.js';

router.post('/admin/users/:id/promote', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  // Admin-only in ALL environments
});
```

**Examples:** User promotion, security settings, payment configuration

---

## How requireStagingAuth Works

```typescript
export const requireStagingAuth = async (req, res, next) => {
  // Production: proceed with normal auth
  if (!isDevelopment()) {
    return requireAuth(req, res, next);
  }

  // Staging/Dev: require admin
  await requireAuth(req, res, async (authError) => {
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

---

## Testing Checklist

**After deploying to staging:**
- [ ] Admin user: Full access
- [ ] Non-admin with `requireAuth`: Has access
- [ ] Non-admin with `requireStagingAuth`: Gets 403
- [ ] Non-admin with `requireAdmin`: Gets 403

**After deploying to production:**
- [ ] Admin user: Full access
- [ ] Regular user with `requireAuth`: Has access
- [ ] Regular user with `requireStagingAuth`: Has access
- [ ] Regular user with `requireAdmin`: Gets 403

---

## Troubleshooting

**Non-admin getting 403 in production:**
- Using `requireAdmin` when shouldn't
- Use `requireStagingAuth` instead
- Check `NODE_ENV=production` is set

**Regular users accessing admin features in staging:**
- Missing auth middleware
- Using `requireAuth` instead of `requireStagingAuth`

**"Staging environment - admin access required" in production:**
- `NODE_ENV` not set to `production`
- Check Azure Container App environment variables

---

## Swagger Documentation

```typescript
/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     tags: [Admin]
 *     summary: Get statistics
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Admin access required (staging)
 */
```
