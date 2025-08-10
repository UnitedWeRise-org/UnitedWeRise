# Test Files Tracker

This document tracks test files created during development to facilitate cleanup.

## Test Files Created

### Frontend Test Files
| File | Created | Purpose | Can Delete? |
|------|---------|---------|-------------|
| `test-complete-flow.html` | Aug 5 | Test complete user flow | Keep - useful for regression testing |
| ~~`test-email-verification.html`~~ | ~~Aug 9~~ | ~~Test email verification flow~~ | ✅ DELETED - testing complete |
| `OAUTH_GOOGLE_IMPLEMENTATION.md` | Aug 9 | Google OAuth implementation plan | Keep - feature documentation |
| `frontend/test.html` | Unknown | Generic test file | Review before deleting |
| `frontend/test-frontend-integration.html` | Unknown | Frontend integration tests | Keep - useful |

### Backend Test Files  
| File | Created | Purpose | Can Delete? |
|------|---------|---------|-------------|
| `backend/test-ai-system.js` | Aug 7 | Test AI/Qwen integration | Keep - feature testing |
| ~~`backend/test-api-documentation.js`~~ | ~~Aug 7~~ | ~~Test API docs generation~~ | ✅ DELETED - verification complete |
| `backend/test-candidate-messaging.js` | Aug 7 | Test candidate messaging | Keep - feature testing |
| ~~`backend/test-documentation-complete.js`~~ | ~~Aug 7~~ | ~~Test documentation completeness~~ | ✅ DELETED - no longer needed |
| `backend/test-enhanced-elections.js` | Aug 7 | Test enhanced election features | Keep - feature testing |
| `backend/test-geocodio.js` | Aug 5 | Test Geocodio API | Keep - API testing |
| `backend/test-photo-api.js` | Aug 7 | Test photo API endpoints | Keep - feature testing |
| `backend/test-photo-system.js` | Aug 7 | Test photo management system | Keep - feature testing |
| `backend/test-post-analysis.js` | Aug 7 | Test post analysis features | Keep - feature testing |
| `backend/test-qwen3-system.js` | Aug 7 | Test Qwen3 LLM integration | Keep - feature testing |
| `backend/test-security.js` | Aug 5 | Security testing | Keep - important for security |
| `backend/test-topic-analysis.js` | Aug 7 | Test topic analysis | Keep - feature testing |
| ~~`backend/test-smtp-connection.js`~~ | ~~Aug 9~~ | ~~Debug SMTP/Gmail connection~~ | ✅ DELETED - email system working |

### PowerShell Scripts (Many are deployment/setup related)
| File | Purpose | Can Delete? |
|------|---------|-------------|
| `azure-setup*.ps1` | Azure setup scripts | Keep - deployment reference |
| `deploy-*.ps1` | Deployment scripts | Keep - deployment tools |
| `fix-*.ps1` | Various fixes | Review individually |
| `run-*.ps1` | Run scripts | Review individually |
| `create-postgres*.ps1` | Database creation | Can delete if not needed |

## Cleanup Recommendations

### Immediate Cleanup (Safe to Delete) - ✅ COMPLETED
```bash
# CLEANED UP ON AUGUST 10, 2025:
✅ backend/test-documentation-complete.js - DELETED
✅ backend/test-api-documentation.js - DELETED  
✅ backend/test-smtp-connection.js - DELETED
✅ test-email-verification.html - DELETED
```

### Keep for Now (Active Development)
```bash
# Currently being used for testing
test-email-verification.html
backend/test-ai-system.js
backend/test-candidate-messaging.js
backend/test-enhanced-elections.js
backend/test-photo-*.js
backend/test-qwen3-system.js
```

### Archive Candidates
Consider moving these to a `test-archive` folder rather than deleting:
- Deployment scripts that worked
- Security test files
- API integration tests

## Best Practices Going Forward

1. **Name test files with clear purpose**: `test-[feature]-[date].ext`
2. **Add cleanup date in comments**: `// TODO: Delete after 2025-08-15`
3. **Use .gitignore**: Add `test-temp-*` pattern for truly temporary tests
4. **Regular cleanup**: Review this file weekly
5. **Document in test file**: Add comment at top explaining purpose

## Test File Template
```javascript
/**
 * Test: [Feature Name]
 * Created: [Date]
 * Author: [Name/Claude]
 * Purpose: [What this tests]
 * Cleanup: [Keep|Delete after date|Archive]
 */
```

---
*Last Updated: August 10, 2025*
*Latest Cleanup: August 10, 2025 (4 files removed)*
*Next Cleanup Review: August 17, 2025*