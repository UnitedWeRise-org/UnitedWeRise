# Admin Dashboard TODO Features Specification

## User Management Features (UsersController)

### 1. Suspend User Functionality
**Location:** UsersController.js line 853
**Status:** Stubbed, needs implementation

**Requirements:**
- Add backend endpoint: POST /api/admin/users/:userId/suspend
- Database: Add `suspended` boolean and `suspensionReason` text to User model
- Frontend: Modal to collect suspension reason
- Effect: Suspended users cannot login (show message "Account suspended")
- Admin action log: Record who suspended and why

**Estimated Effort:** 4-6 hours

### 2. Unsuspend User Functionality
**Location:** UsersController.js line 861
**Status:** Stubbed, needs implementation

**Requirements:**
- Add backend endpoint: POST /api/admin/users/:userId/unsuspend
- Clear suspended flag and reason
- Admin action log: Record who unsuspended
- Email notification to user (optional)

**Estimated Effort:** 2-3 hours

### 3. Reset Password Functionality
**Location:** UsersController.js line 869
**Status:** Stubbed, needs implementation

**Requirements:**
- Add backend endpoint: POST /api/admin/users/:userId/reset-password
- Generate temporary password or reset link
- Email to user with instructions
- Admin action log: Record who initiated reset
- Security: Require TOTP confirmation for this admin action

**Estimated Effort:** 4-6 hours

## Civic Engagement Features (CivicEngagementController)

### 4. Quest Editing Functionality
**Location:** CivicEngagementController.js line 800
**Status:** Stubbed, needs implementation

**Requirements:**
- Reuse quest creation modal (populate with existing data)
- Add backend endpoint: PUT /api/admin/quests/:questId
- Allow editing: title, description, points, timeframe, requirements
- Validation: Cannot change quest type if users have started it
- Admin action log: Record changes made

**Estimated Effort:** 6-8 hours

### 5. Badge Editing Functionality
**Location:** CivicEngagementController.js line 828
**Status:** Stubbed, needs implementation

**Requirements:**
- Reuse badge creation modal (populate with existing data)
- Add backend endpoint: PUT /api/admin/badges/:badgeId
- Allow editing: name, description, icon, criteria
- Validation: Cannot change criteria if already awarded to users
- Admin action log: Record changes made

**Estimated Effort:** 6-8 hours

---

## Total Estimated Effort
- User Management: 10-15 hours
- Civic Engagement: 12-16 hours
- **Total: 22-31 hours (3-4 days)**

## Recommended Implementation Order
1. Reset Password (most commonly needed)
2. Suspend/Unsuspend User (paired feature)
3. Quest Editing (more complex)
4. Badge Editing (similar to quest editing)
