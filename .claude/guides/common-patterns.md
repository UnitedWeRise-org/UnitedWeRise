# Common Code Patterns

**Last Updated**: 2025-10-09
**Purpose**: Reference implementations for consistent code patterns across the project

---

## API Endpoint Pattern

**Use when**: Creating new REST API endpoint

```typescript
try {
  const validated = validateInput(req.body);
  const result = await businessLogic(validated);
  return res.json({ success: true, data: result });
} catch (error) {
  logger.error('Endpoint failed:', error);
  return res.status(500).json({
    success: false,
    error: 'User-facing message'
  });
}
```

**Key elements:**
- Input validation
- Try/catch error handling
- Consistent response format: `{ success, data/error }`
- User-friendly error messages
- Server-side error logging

---

## Frontend Component Pattern

**Use when**: Implementing frontend component with async data

```javascript
if (loading) return <LoadingSpinner />;
if (error) return <ErrorMessage error={error} />;
if (!data?.length) return <EmptyState />;
return <ComponentContent data={data} />;
```

**Key elements:**
- Loading state handled first
- Error state with user-friendly message
- Empty state when no data
- Actual content last
- Optional chaining for safety

---

## Database Transaction Pattern

**Use when**: Multiple database operations must succeed together or all fail

```typescript
const transaction = await db.transaction();
try {
  const result = await operation(transaction);
  await transaction.commit();
  return result;
} catch (error) {
  await transaction.rollback();
  throw error;
}
```

**Key elements:**
- Transaction created before operations
- All operations use transaction object
- Commit on success
- Rollback on any error
- Error propagated after rollback

---

## Related Documentation

- **API Implementation**: `docs/MASTER_DOCUMENTATION.md` section 4
- **Frontend Architecture**: `docs/MASTER_DOCUMENTATION.md` section 8
- **Database Schema**: `docs/DATABASE_SCHEMA.md`
- **API Patterns Slash Command**: `/api-patterns` for more detailed examples
