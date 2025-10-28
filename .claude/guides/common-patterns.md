# Common Code Patterns

**Last Updated**: 2025-10-28
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

## Component Auth State Subscription Pattern

**Use when**: Component needs to respond to authentication state changes (login, logout, token refresh)

**Gold Standard**: Subscribe to `unifiedAuthManager` with cached state

```javascript
class MyComponent {
    constructor() {
        this._isAuthenticated = false;
        this.interval = null;
        this.init();
    }

    async init() {
        // Primary: Subscribe to unified auth manager
        if (window.unifiedAuthManager?.subscribe) {
            window.unifiedAuthManager.subscribe(async (authState) => {
                const wasAuthenticated = this._isAuthenticated;
                this._isAuthenticated = authState.isAuthenticated;

                if (authState.isAuthenticated && authState.user) {
                    if (!wasAuthenticated) {
                        await this.startTracking();
                    }
                } else {
                    if (wasAuthenticated) {
                        this.stopTracking();
                    }
                }
            });
        } else {
            // Fallback: Legacy events
            window.addEventListener('userLoggedIn', () => {
                this._isAuthenticated = true;
                this.startTracking();
            });
            window.addEventListener('logout', () => {
                this._isAuthenticated = false;
                this.stopTracking();
            });
        }

        // If already authenticated, start immediately
        if (window.currentUser) {
            this._isAuthenticated = true;
            await this.startTracking();
        }
    }

    async startTracking() {
        // Clear existing interval
        if (this.interval) {
            clearInterval(this.interval);
        }

        // Load initial data
        await this.loadData();

        // Set up interval with auth re-check
        this.interval = setInterval(() => {
            if (this._isAuthenticated && window.currentUser) {
                this.loadData();
            } else {
                this.stopTracking();
            }
        }, 5 * 60 * 1000);
    }

    stopTracking() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this._isAuthenticated = false;
        // Clear component state
    }

    async loadData() {
        if (!this._isAuthenticated || !window.currentUser) {
            return;
        }

        try {
            const response = await apiCall('/endpoint');
            // Handle response
        } catch (error) {
            // Handle auth errors by stopping tracking
            if (error.status === 401 || error.status === 403) {
                this.stopTracking();
                return;
            }
            // Handle other errors
        }
    }
}
```

**Key elements:**
- Subscribe to `unifiedAuthManager` (not just static checks)
- Cache auth state (`_isAuthenticated`) to avoid stale `window.currentUser`
- Separate `startTracking()` / `stopTracking()` lifecycle methods
- Re-check auth on every interval tick
- Stop tracking on 401/403 errors
- Fallback to legacy events if unified manager unavailable
- Clear intervals properly to prevent memory leaks

**Example**: See `frontend/src/components/QuestProgressTracker.js` for reference implementation

---

## Network Retry Logic Pattern

**Use when**: API calls should retry on transient network errors

**Pattern**: Exponential backoff with smart error detection

```javascript
async function callWithRetry(url, options = {}) {
    const maxRetries = 3;
    const retryDelays = [1000, 2000, 4000]; // Exponential backoff
    let lastError = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const response = await fetch(url, options);

            // Success - exit retry loop
            if (response.ok) {
                return response;
            }

            // Don't retry 4xx client errors (except as needed)
            if (response.status >= 400 && response.status < 500) {
                return response; // Client error - don't retry
            }

            // Retry 5xx server errors
            if (response.status >= 500) {
                lastError = new Error(`Server error: ${response.status}`);
                if (attempt < maxRetries - 1) {
                    await new Promise(resolve =>
                        setTimeout(resolve, retryDelays[attempt])
                    );
                    continue;
                }
            }

            return response;

        } catch (error) {
            // Network error (ERR_INTERNET_DISCONNECTED, etc.)
            lastError = error;

            // If last attempt, throw error
            if (attempt >= maxRetries - 1) {
                break;
            }

            // Wait before retry
            await new Promise(resolve =>
                setTimeout(resolve, retryDelays[attempt])
            );
        }
    }

    // All retries exhausted
    throw lastError;
}
```

**Key elements:**
- 3 retry attempts with exponential backoff (1s, 2s, 4s)
- Retry network errors (`Failed to fetch`, `ERR_INTERNET_DISCONNECTED`)
- Retry 5xx server errors
- Do NOT retry 4xx client errors (they won't succeed on retry)
- Silent retries - only error after all attempts fail
- Total retry window ~7 seconds (catches most sleep/wake recovery)

**Example**: See `frontend/src/modules/admin/api/AdminAPI.js` for reference implementation

---

## Related Documentation

- **API Implementation**: `docs/MASTER_DOCUMENTATION.md` section 4
- **Frontend Architecture**: `docs/MASTER_DOCUMENTATION.md` section 8
- **Database Schema**: `docs/DATABASE_SCHEMA.md`
- **API Patterns Slash Command**: `/api-patterns` for more detailed examples
