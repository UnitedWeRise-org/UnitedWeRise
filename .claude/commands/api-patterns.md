# API Implementation Patterns Reference

You are assisting with API endpoint implementation for UnitedWeRise. This command provides quick access to established patterns, conventions, and best practices for creating consistent, secure, and maintainable API endpoints.

## Core API Patterns

### Pattern 1: Standard REST Endpoint (with Authentication)

**File:** `backend/src/routes/<resource>.ts`

```typescript
import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { prisma } from '../utils/prisma';

const router = express.Router();

// GET /<resource> - List resources for authenticated user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const resources = await prisma.resource.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50, // Pagination limit
      include: {
        // Include related data if needed
        user: {
          select: { id: true, email: true } // Never expose passwords
        }
      }
    });

    return res.status(200).json({
      success: true,
      data: resources
    });

  } catch (error) {
    console.error('Error fetching resources:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch resources'
    });
  }
});

export default router;
```

**Key Elements:**
- Import authMiddleware for JWT authentication
- Extract userId from `req.user` (set by authMiddleware)
- Use try/catch for error handling
- Return consistent response format: `{ success, data/error }`
- Use Prisma for database queries
- Include related data selectively (avoid N+1 queries)
- Log errors to console (server logs)
- Never expose sensitive data (passwords, tokens)

### Pattern 2: POST Endpoint with Input Validation

```typescript
import { z } from 'zod';

// Define input schema using Zod
const createResourceSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(5000),
  tags: z.array(z.string()).optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE', 'FRIENDS']).default('PUBLIC')
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    // Validate input
    const validatedData = createResourceSchema.parse(req.body);

    const userId = req.user.id;

    // Create resource
    const resource = await prisma.resource.create({
      data: {
        ...validatedData,
        userId,
        createdAt: new Date()
      }
    });

    return res.status(201).json({
      success: true,
      data: resource
    });

  } catch (error) {
    // Zod validation error
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: error.errors
      });
    }

    console.error('Error creating resource:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create resource'
    });
  }
});
```

**Key Elements:**
- Use Zod for input validation (type-safe)
- Return 400 Bad Request for validation errors
- Return 201 Created for successful resource creation
- Provide error details for debugging (in development)
- Never trust user input - always validate

### Pattern 3: Admin-Only Endpoint

```typescript
router.delete('/:resourceId', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { resourceId } = req.params;

    // Check admin permission
    if (userRole !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    // Verify resource exists
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId }
    });

    if (!resource) {
      return res.status(404).json({
        success: false,
        error: 'Resource not found'
      });
    }

    // Delete resource
    await prisma.resource.delete({
      where: { id: resourceId }
    });

    return res.status(200).json({
      success: true,
      message: 'Resource deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting resource:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete resource'
    });
  }
});
```

**Key Elements:**
- Check `req.user.role === 'ADMIN'` before allowing action
- Return 403 Forbidden for unauthorized access
- Return 404 Not Found if resource doesn't exist
- Verify resource exists before deleting (avoid silent failures)
- Log admin actions for audit trail

### Pattern 4: User-Owned Resource Authorization

```typescript
router.put('/:resourceId', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { resourceId } = req.params;

    // Validate input
    const validatedData = updateResourceSchema.parse(req.body);

    // Fetch resource and verify ownership
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId }
    });

    if (!resource) {
      return res.status(404).json({
        success: false,
        error: 'Resource not found'
      });
    }

    // Authorization check: user owns resource OR is admin
    if (resource.userId !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to edit this resource'
      });
    }

    // Update resource
    const updatedResource = await prisma.resource.update({
      where: { id: resourceId },
      data: {
        ...validatedData,
        updatedAt: new Date()
      }
    });

    return res.status(200).json({
      success: true,
      data: updatedResource
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: error.errors
      });
    }

    console.error('Error updating resource:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update resource'
    });
  }
});
```

**Key Elements:**
- Always verify resource ownership before allowing edits
- Allow admin bypass for moderation purposes
- Return 403 Forbidden if user doesn't own resource
- Update `updatedAt` timestamp on edits
- Use Prisma `update` method (throws if not found)

### Pattern 5: Pagination with Cursor-Based Navigation

```typescript
router.get('/feed', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { cursor, limit = '20' } = req.query;

    const take = Math.min(parseInt(limit as string), 100); // Max 100 per page

    // Cursor-based pagination (more efficient than offset)
    const resources = await prisma.resource.findMany({
      where: {
        visibility: 'PUBLIC',
        // Optionally filter by user's interests
      },
      orderBy: { createdAt: 'desc' },
      take: take + 1, // Fetch one extra to determine if there's a next page
      ...(cursor && {
        cursor: { id: cursor as string },
        skip: 1 // Skip the cursor itself
      }),
      include: {
        user: {
          select: { id: true, email: true, profilePhotoUrl: true }
        }
      }
    });

    // Check if there's a next page
    const hasMore = resources.length > take;
    const items = hasMore ? resources.slice(0, -1) : resources;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return res.status(200).json({
      success: true,
      data: {
        items,
        nextCursor,
        hasMore
      }
    });

  } catch (error) {
    console.error('Error fetching feed:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch feed'
    });
  }
});
```

**Key Elements:**
- Use cursor-based pagination (better performance than OFFSET)
- Fetch one extra item to determine if there's more
- Return `nextCursor` for client to fetch next page
- Limit max items per page (prevent abuse)
- Include related data efficiently

### Pattern 6: File Upload with Multer

```typescript
import multer from 'multer';

// Configure Multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

router.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    // req.file.buffer contains file data
    const fileBuffer = req.file.buffer;

    // Process file (upload to Azure Blob, etc.)
    const fileUrl = await uploadToAzureBlob(fileBuffer, req.file.mimetype);

    // Save file record to database
    const fileRecord = await prisma.file.create({
      data: {
        userId,
        url: fileUrl,
        mimetype: req.file.mimetype,
        size: req.file.size,
        uploadedAt: new Date()
      }
    });

    return res.status(201).json({
      success: true,
      data: fileRecord
    });

  } catch (error) {
    console.error('Error uploading file:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to upload file'
    });
  }
});
```

**Key Elements:**
- Use Multer for multipart/form-data handling
- Validate file type in fileFilter
- Limit file size to prevent abuse
- Store file in memory (for cloud upload)
- Upload to cloud storage (Azure Blob)
- Save file metadata to database

### Pattern 7: Database Transaction (Multiple Operations)

```typescript
router.post('/complex-action', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const validatedData = complexActionSchema.parse(req.body);

    // Use Prisma transaction for atomic operations
    const result = await prisma.$transaction(async (tx) => {
      // Operation 1: Create resource
      const resource = await tx.resource.create({
        data: {
          userId,
          title: validatedData.title,
          content: validatedData.content
        }
      });

      // Operation 2: Update user stats
      await tx.user.update({
        where: { id: userId },
        data: {
          resourceCount: { increment: 1 }
        }
      });

      // Operation 3: Create notification
      await tx.notification.create({
        data: {
          userId,
          type: 'RESOURCE_CREATED',
          message: `You created: ${resource.title}`
        }
      });

      return resource;
    });

    return res.status(201).json({
      success: true,
      data: result
    });

  } catch (error) {
    // Transaction automatically rolls back on error
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: error.errors
      });
    }

    console.error('Error performing complex action:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to perform action'
    });
  }
});
```

**Key Elements:**
- Use `prisma.$transaction()` for atomic operations
- All operations succeed together or all fail (rollback)
- Return meaningful error messages
- Use transactions for multi-step operations that must be consistent

## Response Format Standards

### Success Response (200-299)
```typescript
{
  success: true,
  data: <resource or array of resources>
}
```

### Error Response (400-599)
```typescript
{
  success: false,
  error: "User-friendly error message",
  details?: <validation errors or debug info> // Optional, for development
}
```

### HTTP Status Codes
- **200 OK** - Successful GET, PUT, DELETE
- **201 Created** - Successful POST (resource created)
- **400 Bad Request** - Invalid input (validation failed)
- **401 Unauthorized** - Authentication required (no token)
- **403 Forbidden** - Authentication valid but insufficient permissions
- **404 Not Found** - Resource doesn't exist
- **500 Internal Server Error** - Server error (catch-all)

## Middleware Patterns

### Authentication Middleware

**File:** `backend/src/middleware/authMiddleware.ts`

```typescript
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';

export const authMiddleware = async (req, res, next) => {
  try {
    // Extract JWT from httpOnly cookie
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or inactive account'
      });
    }

    // Attach user to request
    req.user = user;
    next();

  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};
```

### Admin Authorization Middleware

```typescript
export const adminMiddleware = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
  }
  next();
};

// Usage: Chain after authMiddleware
router.delete('/admin-action', authMiddleware, adminMiddleware, async (req, res) => {
  // Only admins reach this point
});
```

## Error Handling Best Practices

1. **Always use try/catch** in async route handlers
2. **Differentiate error types** (validation vs server errors)
3. **Log errors server-side** but return user-friendly messages
4. **Never expose sensitive info** in error responses (stack traces, DB errors)
5. **Use specific status codes** (400 for client errors, 500 for server errors)

## Security Checklist

**Before deploying any API endpoint:**
- [ ] Authentication required? Add `authMiddleware`
- [ ] Admin-only? Check `req.user.role === 'ADMIN'`
- [ ] User-owned resource? Verify `resource.userId === req.user.id`
- [ ] Input validated? Use Zod schemas
- [ ] SQL injection safe? Use Prisma (parameterized queries)
- [ ] Sensitive data excluded? Use `select` to whitelist fields
- [ ] Rate limiting? Consider for public endpoints
- [ ] CORS configured? Check `backend/src/server.ts`

## Testing API Endpoints

### Using curl
```bash
# GET with auth
curl -H "Cookie: token=YOUR_JWT" \
  https://dev-api.unitedwerise.org/api/resource

# POST with JSON body
curl -X POST \
  -H "Cookie: token=YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","content":"Test content"}' \
  https://dev-api.unitedwerise.org/api/resource

# Upload file
curl -X POST \
  -H "Cookie: token=YOUR_JWT" \
  -F "file=@/path/to/file.jpg" \
  https://dev-api.unitedwerise.org/api/upload
```

### Using Postman
1. Set environment to `staging` or `production`
2. Set cookie: `token=YOUR_JWT` (get from browser DevTools)
3. Set `Content-Type: application/json` for JSON payloads
4. Use `form-data` for file uploads

## Related Documentation

- **Complete API Reference:** docs/MASTER_DOCUMENTATION.md section 4
- **Quest/Badge APIs:** docs/API_QUESTS_BADGES.md
- **Photo/Gallery APIs:** docs/API_SAVED_POSTS_GALLERY.md
- **Database Schema:** docs/DATABASE_SCHEMA.md
- **Authentication:** docs/MASTER_DOCUMENTATION.md section 7

## Next Steps

When implementing a new API endpoint:
1. Find similar endpoint in codebase (grep for pattern)
2. Copy pattern and adapt to your use case
3. Follow established conventions (naming, response format)
4. Add input validation with Zod
5. Add authentication/authorization
6. Test on development environment
7. Document in relevant docs file

---

**Last Updated:** October 2025
**Conventions:** Follow existing patterns for consistency
