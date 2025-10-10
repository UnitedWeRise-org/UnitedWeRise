# Badge System - Admin Guide

**Version:** 1.0.0
**Last Updated:** 2025-10-10
**Maintainer:** UnitedWeRise Development Team

---

## Table of Contents

1. [Overview](#overview)
2. [Badge Image Requirements](#badge-image-requirements)
3. [Creating Badges](#creating-badges)
4. [Badge Qualification Criteria](#badge-qualification-criteria)
5. [Manual Badge Awarding](#manual-badge-awarding)
6. [Auto-Award Qualification Checks](#auto-award-qualification-checks)
7. [Badge Display](#badge-display)
8. [Troubleshooting](#troubleshooting)
9. [API Reference](#api-reference)

---

## Overview

The UnitedWeRise Badge System allows administrators to create, manage, and award digital badges to users based on their civic engagement activities. Badges can be awarded:

- **Automatically** - Based on predefined criteria (quests completed, civic actions, social metrics, etc.)
- **Manually** - By admins directly awarding badges to specific users

### Key Features

- ✅ 5 types of qualification criteria
- ✅ 64x64px badge images displayed at 32x32px for Retina displays
- ✅ Manual badge awarding with user search
- ✅ Automated qualification checks for all users
- ✅ Real-time badge count updates
- ✅ Badge display next to user posts and in badge gallery

---

## Badge Image Requirements

### Recommended Specifications

| Attribute | Value |
|-----------|-------|
| **Image Size** | 64x64 pixels (source) |
| **Display Size** | 32x32 pixels (rendered) |
| **Format** | PNG (preferred), JPG, or SVG |
| **File Size** | < 50KB |
| **Background** | Transparent (PNG) or solid color |
| **Design Style** | Circular or square with rounded corners |

### Why 64x64px?

- **Retina Display Support:** 64x64px source ensures crisp display on high-DPI screens
- **Scaled Down:** Displayed at 32x32px in posts, scales beautifully
- **Gallery Display:** Can be shown larger (64x64px) in badge vault/gallery
- **Future-Proof:** Allows for larger display sizes if needed

### Design Guidelines

1. **Keep it simple:** Badge should be recognizable at 32x32px
2. **High contrast:** Ensure badge stands out against light and dark backgrounds
3. **Clear iconography:** Use clear, simple icons that represent the achievement
4. **Consistent style:** Maintain visual consistency across all badges
5. **Accessible:** Consider colorblind users (don't rely solely on color)

---

## Creating Badges

### Step-by-Step Guide

#### 1. Access Badge Management

1. Log in to Admin Dashboard: `https://www.unitedwerise.org/admin-dashboard.html`
2. Navigate to **Civic Engagement** section
3. Click **Badges** tab
4. Click **Create New Badge** button

#### 2. Fill Out Badge Information

**Required Fields:**
- **Badge Name:** Short, descriptive name (e.g., "Civic Champion")
- **Description:** Clear description of what the badge represents
- **Badge Image:** Upload a 64x64px image (PNG recommended)

**Badge Criteria:**
- **Qualification Criteria Type:** Choose from 5 types (see below)
- **Automatically Award:** Check if badge should be auto-awarded when criteria met

#### 3. Configure Qualification Criteria

Choose one of the following criteria types and fill in the required fields:

**Example: Quest Completion Badge**
```
Badge Name: Quest Master
Description: Complete 10 quests to earn this badge
Badge Image: [Upload 64x64px trophy icon]
Criteria Type: Quest Completion
  - Quests to Complete: 10
  - Streak Days: (optional)
Auto-Awarded: ✓ Checked
```

#### 4. Save Badge

1. Click **Create Badge** button
2. Verify success message appears
3. Verify badge appears in the badge grid
4. Check badge shows "0 awarded" initially

---

## Badge Qualification Criteria

### 1. Quest Completion

Awards badge when user completes a specified number of quests.

**Fields:**
- **Quests to Complete:** Number of quests user must complete (e.g., 5, 10, 25)
- **Streak Days (optional):** Consecutive days user must complete quests

**Example Use Cases:**
- "Quest Newbie" - Complete 1 quest
- "Quest Master" - Complete 10 quests
- "Streak Champion" - Complete quests for 7 consecutive days

### 2. User Activity

Awards badge based on user activity count over a timeframe.

**Fields:**
- **Activity Count:** Number of activities required
- **Timeframe:** Last 7 days, Last 30 days, or All time
- **Activity Types:** Comma-separated list (e.g., POST_CREATED, COMMENT_CREATED)

**Example Use Cases:**
- "Active Contributor" - Create 10 posts in last 30 days
- "Comment King" - Create 50 comments all time
- "Engagement Leader" - 25 posts or comments in last 7 days

### 3. Civic Action

Awards badge based on civic engagement activities.

**Fields:**
- **Petitions Signed:** Number of petitions signed
- **Events Attended:** Number of events attended
- **Posts Created:** Number of civic posts created

**Example Use Cases:**
- "Petition Supporter" - Sign 5 petitions
- "Event Enthusiast" - Attend 3 events
- "Civic Voice" - Create 20 civic posts

### 4. Social Metric

Awards badge based on social standing and reputation.

**Fields:**
- **Reputation Score:** Minimum reputation score (0-100)
- **Followers Count:** Minimum number of followers
- **Friends Count:** Minimum number of friends

**Example Use Cases:**
- "Trusted Voice" - Reputation score ≥ 75
- "Community Leader" - 100+ followers
- "Social Butterfly" - 50+ friends

### 5. Custom Endpoint

Awards badge based on custom API endpoint logic.

**Fields:**
- **Custom Endpoint:** API endpoint to check (e.g., `/api/badges/check-special-criteria`)
- **Custom Parameters (JSON):** Additional parameters for endpoint

**Example Use Cases:**
- "First Donor" - Check if user has donated
- "Early Adopter" - Check account creation date
- "Special Achievement" - Custom business logic

---

## Manual Badge Awarding

For badges that should be awarded manually by admins (e.g., "Staff Pick", "MVP", "Special Recognition").

### Step-by-Step Guide

#### 1. Open Award Badge Modal

1. Navigate to **Civic Engagement** > **Badges**
2. Find the badge you want to award
3. Click **Award** button on the badge card

#### 2. Search for User

1. Type username or email in search box (minimum 2 characters)
2. Search is debounced (300ms delay for better performance)
3. Results appear automatically as you type

#### 3. Select User

1. Click **Select** button next to the user
2. Confirm the award: "Award this badge to [username]?"
3. Click **OK** to confirm

#### 4. Verify Award

1. Success message appears: "Badge successfully awarded to [username]!"
2. Modal closes automatically
3. Badge count increments (e.g., "0 awarded" → "1 awarded")
4. User will see badge in their profile and next to their posts

### Tips for Manual Awarding

- **Search by username:** Fastest way to find users
- **Search by email:** Useful if username is unknown
- **Award multiple times:** Can award same badge to different users
- **Cannot revoke:** Once awarded, badges cannot be easily revoked (contact developer)

---

## Auto-Award Qualification Checks

For auto-awarded badges, run qualification checks to award badges to all qualifying users.

### When to Run Qualification Checks

- **After creating new auto-awarded badge:** Awards to all existing qualifying users
- **Daily/Weekly maintenance:** Ensures all users get badges they qualify for
- **After major user activity:** Events, campaigns, etc.

### Step-by-Step Guide

#### 1. Access Qualification Runner

1. Navigate to **Civic Engagement** > **Badges**
2. Find the **🔄 Run Auto-Award Qualification Checks** button at top of badge grid

#### 2. Run Checks

1. Click the button
2. Confirm: "Run auto-award qualification checks for all users?"
3. Click **OK**

#### 3. Wait for Results

1. Loading message appears: "Running qualification checks..."
2. May take 5-30 seconds depending on user count
3. Results appear when complete:
   ```
   Qualification checks complete!
   - Users checked: 1,247
   - Badges awarded: 23
   - Users qualified: 18
   ```

#### 4. Verify Awards

1. Badge grid refreshes automatically
2. Badge counts update to show new awards
3. Users will see new badges immediately

### Performance Notes

- **Batch Processing:** Checks all users against all auto-awarded badges
- **Time Complexity:** O(users × auto_badges × criteria_complexity)
- **Estimated Time:** ~10-20ms per user (1,000 users ≈ 10-20 seconds)
- **Runs in Background:** Dashboard remains responsive during check

---

## Badge Display

### Where Badges Appear

1. **User Posts:** 32x32px next to username in feed
2. **User Profile:** Full badge collection in grid
3. **Badge Vault/Gallery:** User's earned badges (64x64px)
4. **Admin Dashboard:** Badge management grid

### Display Specifications

| Location | Size | Format | Notes |
|----------|------|--------|-------|
| Post Feed | 32x32px | Scaled from 64x64px | Next to username |
| User Profile | 48x48px | Scaled from 64x64px | Badge grid |
| Badge Vault | 64x64px | Original size | Full display |
| Admin Dashboard | 64x64px | Original size | Management view |

### Multiple Badges

- Users can earn unlimited badges
- Badges displayed in grid format
- Most recent badges first
- Hover/click for badge details

---

## Troubleshooting

### Badge Not Appearing After Creation

**Possible Causes:**
1. Image upload failed
2. API error during creation
3. Browser cache issue

**Solutions:**
1. Check browser console for errors (F12)
2. Verify image file is < 50KB and correct format
3. Refresh page (Ctrl+Shift+R for hard refresh)
4. Try creating badge again

### User Search Not Working

**Possible Causes:**
1. Less than 2 characters typed
2. No users match search term
3. API connection issue

**Solutions:**
1. Type at least 2 characters
2. Try different search terms (username vs email)
3. Check browser console for API errors
4. Verify internet connection

### Badge Not Auto-Awarding

**Possible Causes:**
1. Badge criteria not met by any users
2. Qualification checks not run recently
3. Badge marked as manual-only

**Solutions:**
1. Verify badge has "Auto-Awarded" checked
2. Run qualification checks manually
3. Check badge criteria is achievable
4. Verify backend API endpoints are working

### Badge Count Not Updating

**Possible Causes:**
1. API call failed
2. Browser cache issue
3. Page not refreshed after award

**Solutions:**
1. Refresh badge grid manually
2. Check browser console for errors
3. Hard refresh page (Ctrl+Shift+R)

---

## API Reference

### Endpoints Used by Badge System

#### 1. Get All Badges
```http
GET /api/badges/all
```
Returns all badges with award counts.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "badge-id-123",
      "name": "Quest Master",
      "description": "Complete 10 quests",
      "imageUrl": "https://...",
      "isActive": true,
      "isAutoAwarded": true,
      "_count": { "userBadges": 45 }
    }
  ]
}
```

#### 2. Create Badge
```http
POST /api/badges/create
Content-Type: multipart/form-data
```

**Request Body:**
```
name: "Quest Master"
description: "Complete 10 quests"
image: [File]
qualificationCriteria: {"type":"QUEST_COMPLETION","requirements":{"questCompletionCount":10}}
isAutoAwarded: true
```

#### 3. Search Users
```http
GET /api/admin/users/search?q=john
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "user-123",
      "username": "john_doe",
      "email": "john@example.com"
    }
  ]
}
```

#### 4. Award Badge Manually
```http
POST /api/admin/badges/award
Content-Type: application/json
```

**Request Body:**
```json
{
  "badgeId": "badge-id-123",
  "userId": "user-123"
}
```

#### 5. Run Qualification Checks
```http
POST /api/admin/badges/run-qualifications
Content-Type: application/json
```

**Response:**
```json
{
  "success": true,
  "data": {
    "usersChecked": 1247,
    "badgesAwarded": 23,
    "usersQualified": 18
  }
}
```

---

## Best Practices

### Badge Creation

1. ✅ Use clear, descriptive names
2. ✅ Write detailed descriptions
3. ✅ Use high-quality 64x64px images
4. ✅ Test criteria with real user data
5. ✅ Start with achievable requirements
6. ❌ Don't make criteria too easy (devalues badges)
7. ❌ Don't use copyrighted images

### Badge Management

1. ✅ Run qualification checks after creating auto-awarded badges
2. ✅ Monitor badge distribution (avoid too many or too few awards)
3. ✅ Adjust criteria based on user feedback
4. ✅ Create tiered badges (Bronze/Silver/Gold)
5. ❌ Don't award manually if badge should be auto-awarded
6. ❌ Don't change criteria after users earn badge

### User Experience

1. ✅ Celebrate badge awards with notifications
2. ✅ Make badges visible and prominent
3. ✅ Encourage users to earn badges
4. ✅ Highlight rare/prestigious badges
5. ❌ Don't over-gamify (focus on meaningful engagement)
6. ❌ Don't create too many badges (reduces value)

---

## Support

### Need Help?

- **Technical Issues:** Contact development team
- **Badge Ideas:** Submit via admin feedback form
- **User Complaints:** Review badge criteria and adjust if needed

### Changelog

- **2025-10-10:** Initial badge system documentation created
- **Future:** Badge system enhancements planned

---

**End of Badge System Guide**
