# 🚀 API Quick Reference Guide

**Last Updated**: September 20, 2025
**Purpose**: Rapid lookup for essential API endpoints
**Complete Details**: See MASTER_DOCUMENTATION.md {#api-reference}

---

## 🔑 Authentication Endpoints

| Endpoint | Method | Purpose | Auth Required | Response |
|----------|--------|---------|---------------|----------|
| `/api/auth/login` | POST | User login | No | `{ok: true, user: {...}}` |
| `/api/auth/logout` | POST | User logout | Yes | `{ok: true}` |
| `/api/auth/register` | POST | User registration | No | `{ok: true, user: {...}}` |
| `/api/auth/me` | GET | Current user info | Yes | `{ok: true, user: {...}}` |
| `/api/totp/setup` | POST | Setup 2FA | Yes | `{ok: true, qrCode: "..."}` |
| `/api/totp/verify` | POST | Verify 2FA token | Yes | `{ok: true, verified: true}` |

**Key Parameters**:
- Login: `{email, password, totpToken?}`
- Register: `{firstName, lastName, email, password, address}`

---

## 📱 Core Social Features

| Endpoint | Method | Purpose | Auth Required | Response |
|----------|--------|---------|---------------|----------|
| `/api/feed` | GET | My Feed posts | Yes | `{ok: true, posts: [...]}` |
| `/api/posts` | POST | Create post | Yes | `{ok: true, post: {...}}` |
| `/api/posts/:id` | GET | Single post | Optional | `{ok: true, post: {...}}` |
| `/api/comments` | POST | Create comment | Yes | `{ok: true, comment: {...}}` |
| `/api/posts/:id/like` | POST | Like/unlike post | Yes | `{ok: true, liked: true}` |
| `/api/posts/:id/comments` | GET | Post comments | Optional | `{ok: true, comments: [...]}` |

**Key Parameters**:
- Create Post: `{content, mediaUrls?, tags?, privacy?}`
- Create Comment: `{postId, content, parentCommentId?}`
- Feed: `?offset=0&limit=15` for pagination

---

## 🔍 Search & Discovery

| Endpoint | Method | Purpose | Auth Required | Response |
|----------|--------|---------|---------------|----------|
| `/api/search/unified` | GET | Search everything | Optional | `{ok: true, users: [...], posts: [...]}` |
| `/api/users/:userId/complete` | GET | Complete user profile | Optional | `{ok: true, user: {...}, posts: [...]}` |
| `/api/trending/topics` | GET | Trending topics | No | `{ok: true, topics: [...]}` |
| `/api/officials` | GET | Political officials | No | `{ok: true, officials: [...]}` |

**Key Parameters**:
- Search: `?query=term&types=users,posts&limit=10`
- Officials: `?address=location` for geo-filtering

---

## 👥 User Relationships

| Endpoint | Method | Purpose | Auth Required | Response |
|----------|--------|---------|---------------|----------|
| `/api/relationships/follow` | POST | Follow user | Yes | `{ok: true, following: true}` |
| `/api/relationships/unfollow` | POST | Unfollow user | Yes | `{ok: true, following: false}` |
| `/api/users/:id/followers` | GET | User followers | Optional | `{ok: true, followers: [...]}` |
| `/api/users/:id/following` | GET | User following | Optional | `{ok: true, following: [...]}` |
| `/api/notifications` | GET | User notifications | Yes | `{ok: true, notifications: [...]}` |

**Key Parameters**:
- Follow/Unfollow: `{targetUserId}`
- Notifications: `?unreadOnly=true&limit=20`

---

## 🗳️ Candidate & Political Features

| Endpoint | Method | Purpose | Auth Required | Response |
|----------|--------|---------|---------------|----------|
| `/api/candidate-registrations` | POST | Register as candidate | Yes | `{ok: true, registration: {...}}` |
| `/api/candidates/search` | GET | Find candidates | No | `{ok: true, candidates: [...]}` |
| `/api/elections` | GET | Election information | No | `{ok: true, elections: [...]}` |
| `/api/external-candidates` | GET | Google Civic candidates | No | `{ok: true, candidates: [...]}` |

**Key Parameters**:
- Registration: `{personalInfo, officeDetails, campaignInfo}`
- Candidate Search: `?address=location&office=type`

---

## 💳 Payment & Donations

| Endpoint | Method | Purpose | Auth Required | Response |
|----------|--------|---------|---------------|----------|
| `/api/payments/donation` | POST | Create donation | No | `{ok: true, paymentUrl: "..."}` |
| `/api/payments/fee` | POST | Pay candidate fee | Yes | `{ok: true, paymentUrl: "..."}` |
| `/api/payments/receipt/:id` | GET | Payment receipt | Yes | `{ok: true, receipt: {...}}` |

**Key Parameters**:
- Donation: `{amount, recurring?, donorInfo?}`
- Fee Payment: `{amount, registrationId, officeLevel}`

---

## 🛠️ Admin & Management

| Endpoint | Method | Purpose | Auth Required | Response |
|----------|--------|---------|---------------|----------|
| `/api/admin/dashboard` | GET | Admin dashboard data | Admin + TOTP | `{ok: true, stats: {...}}` |
| `/api/admin/candidates` | GET | Candidate registrations | Admin + TOTP | `{ok: true, candidates: [...]}` |
| `/api/admin/candidates/:id/approve` | POST | Approve candidate | Admin + TOTP | `{ok: true, approved: true}` |
| `/api/admin/users` | GET | User management | Admin + TOTP | `{ok: true, users: [...]}` |
| `/api/admin/motd` | GET/POST/PUT/DELETE | MOTD management | Admin + TOTP | `{ok: true, motd: {...}}` |
| `/api/admin/accounts/merge` | POST | Account merging | Admin + TOTP | `{ok: true, merged: true}` |
| `/api/admin/moderation/reports` | GET | Moderation reports | Admin + TOTP | `{ok: true, reports: [...]}` |
| `/api/admin/system/metrics` | GET | System performance | Admin + TOTP | `{ok: true, metrics: {...}}` |

**Key Parameters**:
- Candidate Approval: `{approvalNotes?, createProfile: true}`
- User Management: `?role=admin&status=active`
- MOTD Operations: `{title, content, isActive, priority?}`
- Account Merge: `{primaryUserId, duplicateUserId, mergeStrategy}`

---

## 📊 System & Health

| Endpoint | Method | Purpose | Auth Required | Response |
|----------|--------|---------|---------------|----------|
| `/health` | GET | System health | No | `{status: "healthy", uptime: 123}` |
| `/api/version` | GET | Release information | No | `{version: "...", releaseSha: "..."}` |
| `/api/security-metrics` | GET | Security monitoring | Admin | `{authFailures: 0, threats: [...]}` |

---

## 🔧 Common Response Patterns

### Success Response Format
```javascript
{
  ok: true,
  status: 200,
  data: {
    // Actual response data here
  }
}
```

### Error Response Format
```javascript
{
  ok: false,
  status: 400,
  error: "Error message",
  details?: "Additional error context"
}
```

### API Call Wrapper (Frontend)
```javascript
// All frontend calls use this wrapper
const response = await apiCall('/api/endpoint', {
  method: 'POST',
  data: { key: 'value' }
});

// Access data: response.data.user (not response.user)
if (response.ok) {
  console.log('Success:', response.data);
} else {
  console.error('Error:', response.error);
}
```

---

## 🚨 Authentication Notes

### Cookie-Based Authentication
- Uses httpOnly cookies (not localStorage)
- Automatic inclusion with `credentials: 'include'`
- TOTP required for admin functions
- 24-hour TOTP sessions for admins

### Permission Levels
- **Public**: No authentication required
- **User**: Any logged-in user
- **Admin**: Admin role required
- **Admin + TOTP**: Admin with recent TOTP verification

---

## 📝 Quick Development Tips

### Testing APIs
```bash
# Health check
curl https://api.unitedwerise.org/health

# Authenticated request (replace TOKEN)
curl -H "Authorization: Bearer TOKEN" \
     https://api.unitedwerise.org/api/auth/me
```

### Common Debugging
```javascript
// Check auth status
await apiCall('/api/auth/me');

// Test endpoint with debug
const result = await apiCall('/api/endpoint', {
  method: 'POST',
  data: payload
});
console.log('Result:', result);
```

### Environment Endpoints
- **Production**: https://api.unitedwerise.org
- **Staging**: https://dev-api.unitedwerise.org

---

**For complete API documentation with examples, error codes, and implementation details, see MASTER_DOCUMENTATION.md {#api-reference}**