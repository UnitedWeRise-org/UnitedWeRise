# Badge Administration Guide

**Last Updated**: October 23, 2025
**Version**: 1.0
**Audience**: Platform administrators and moderators

---

## Table of Contents

1. [Introduction](#introduction)
2. [Creating a Badge](#creating-a-badge)
3. [Distribution Methods](#distribution-methods)
4. [Best Practices](#best-practices)
5. [Troubleshooting](#troubleshooting)
6. [Badge Management](#badge-management)

---

## Introduction

Badges are achievements that users can earn through platform activity or receive as special recognition. They appear on user profiles and in the Badge Vault. This guide covers how to create, configure, and award badges effectively.

### Badge System Overview

- **Auto-awarded badges**: System automatically checks criteria and awards badges
- **Manual-award badges**: Admins award badges individually
- **Display limit**: Users can display up to 5 badges on their profile
- **Badge vault**: Users can view all earned badges and manage display preferences

---

## Creating a Badge

### Step-by-Step Process

1. **Navigate to Admin Panel → Badges**
   - Click "Badge Management" in the left sidebar
   - View existing badges or click "Create New Badge"

2. **Fill in Badge Details**

   **Name** (Required)
   - Must be unique across all badges
   - Keep under 30 characters for display purposes
   - Examples: "Civic Champion", "7-Day Streak", "First 100 Users"

   **Description** (Required)
   - 1-2 sentences explaining what the badge represents
   - If criteria-based, explain how to earn it
   - Examples:
     - ✅ "Complete 50 civic engagement quests to earn this badge"
     - ✅ "Awarded to the first 100 users who joined the platform"
     - ❌ "You got this badge for stuff" (too vague)

   **Badge Image** (Required)
   - Click "Upload Image" or drag and drop
   - **Recommended specifications**:
     - Format: PNG with transparent background (preferred) or JPG
     - Dimensions: 512x512 pixels
     - File size: Under 1MB (enforced maximum)
     - Design: Recognizable when scaled to 64x64 pixels
   - **Design tips**:
     - Use simple, bold iconography
     - Maintain consistent style with existing badges
     - Avoid text in the image (use badge name instead)
     - Test visibility at small sizes before uploading

3. **Configure Qualification Criteria**

   Choose the appropriate criteria type based on how the badge should be earned:

   #### Option A: Quest-Based Criteria

   Award based on quest completion.

   **JSON Example**:
   ```json
   {
     "type": "QUEST_COMPLETION",
     "requirements": {
       "questCompletionCount": 50,
       "questTypes": ["DAILY_CIVIC", "WEEKLY_ENGAGEMENT"]
     }
   }
   ```

   **When to use**: "Complete X quests", "Maintain streak for Y days"

   **Fields**:
   - `questCompletionCount`: Number of quests to complete
   - `questTypes` (optional): Specific quest types required
   - `streakDays` (optional): Required consecutive day streak

   #### Option B: Activity-Based Criteria

   Award based on platform activity counts.

   **JSON Example**:
   ```json
   {
     "type": "USER_ACTIVITY",
     "requirements": {
       "activityTypes": ["CREATE_POST", "CREATE_COMMENT"],
       "activityCount": 100,
       "timeframe": "30d"
     }
   }
   ```

   **When to use**: "Create X posts", "Comment Y times in Z days"

   **Fields**:
   - `activityTypes`: Array of activity types (CREATE_POST, CREATE_COMMENT, etc.)
   - `activityCount`: Total activity count required
   - `timeframe`: Time window (e.g., "7d", "30d", "all_time")

   #### Option C: Civic Action Criteria

   Award based on civic engagement actions.

   **JSON Example**:
   ```json
   {
     "type": "CIVIC_ACTION",
     "requirements": {
       "petitionsSigned": 10,
       "eventsAttended": 5,
       "postsCreated": 20
     }
   }
   ```

   **When to use**: "Sign X petitions", "Attend Y events", "Create Z political posts"

   **Fields**:
   - `petitionsSigned`: Number of petitions signed
   - `eventsAttended`: Number of events attended (RSVP'd)
   - `postsCreated`: Number of posts created

   #### Option D: Social Metric Criteria

   Award based on reputation and social standing.

   **JSON Example**:
   ```json
   {
     "type": "SOCIAL_METRIC",
     "requirements": {
       "reputationScore": 1000,
       "followersCount": 100,
       "friendsCount": 50
     }
   }
   ```

   **When to use**: "Reach X reputation", "Gain Y followers", "Make Z friends"

   **Fields**:
   - `reputationScore`: Minimum reputation score
   - `followersCount`: Minimum followers
   - `friendsCount`: Minimum friends (accepted friend requests)

   #### Option E: Custom Endpoint Criteria

   Award based on user properties or custom logic.

   **JSON Example**:
   ```json
   {
     "type": "CUSTOM_ENDPOINT",
     "requirements": {
       "userProperty": "isSuperAdmin",
       "expectedValue": true
     }
   }
   ```

   **When to use**: Admin-only badges, staff recognition, special user flags

   **Fields**:
   - `userProperty`: User property to check (e.g., isSuperAdmin, isCandidate)
   - `expectedValue`: Expected value for that property

4. **Set Distribution Options**

   **Is Auto-Awarded** (Default: true)
   - ✅ **True**: System automatically awards when criteria met
   - ❌ **False**: Admin must manually award each badge

   **Max Awards** (Optional)
   - Leave blank for unlimited awards
   - Set a number for exclusive badges
   - Examples:
     - "First 100 Users": maxAwards = 100
     - "Beta Tester 2024": maxAwards = 250
     - Once limit reached, badge becomes legacy/exclusive

   **Display Order** (Optional, Default: 0)
   - Lower numbers appear first in badge selection UI
   - Use to prioritize important badges
   - Examples:
     - Flagship badges: 1-10
     - Common badges: 50-100
     - Rare badges: 20-49

5. **Preview and Save**
   - Preview how badge will appear at different sizes
   - Check that criteria JSON is valid
   - Click "Create Badge" to save
   - Badge becomes active immediately if `isActive: true`

---

## Distribution Methods

### Method 1: Criteria-Based Auto-Award

**When to use**: Badges earned through platform activity

**How it works**:
- System checks all active users against badge criteria daily
- Automatically awards badges to qualifying users
- Users receive notification when badge is earned

**Setup**:
1. Create badge with `isAutoAwarded: true`
2. Configure qualification criteria (see Creating a Badge above)
3. Save badge
4. System will run automatic checks on schedule

**Admin Actions**:
- **Run manual check**: Navigate to Badge Management → Click "Run Qualification Check"
- **Schedule**: System runs automatically once per day (2 AM server time)
- **Monitor**: Check Badge Analytics to see award rates

**Examples**:
- "Complete 10 quests" → Awarded when user completes their 10th quest
- "Reach 100 reputation" → Awarded when user's reputation reaches 100
- "7-day streak" → Awarded when user maintains 7-day login streak

### Method 2: Direct Manual Award

**When to use**: Special recognition, one-off awards, exceptional contributions

**How it works**:
- Admin searches for user by name or email
- Selects badge to award
- Optionally provides reason
- User receives notification immediately

**Steps**:
1. Navigate to Admin Panel → User Management
2. Search for user by name, email, or ID
3. Click "Award Badge" button
4. Select badge from dropdown (shows all active badges)
5. Enter reason (optional but recommended)
   - Examples:
     - "Exceptional bug report leading to critical fix"
     - "Outstanding community moderation during election week"
     - "Kickstarter backer - $500 tier"
6. Click "Award Badge"
7. Confirmation appears with user notification sent

**API Method** (for bulk scripting):
```javascript
await apiCall('/badges/award', 'POST', {
  userId: 'user_clxxxxxxxxxxxxxx',
  badgeId: 'badge_clxxxxxxxxxxxxxx',
  reason: 'Special recognition for exceptional contribution'
});
```

**Examples**:
- Beta tester recognition
- Bug reporter rewards
- Event attendance (attended livestream, community call)
- Kickstarter backers
- Staff/moderator badges

### Method 3: Claim Code System

**Status**: 🚧 PLANNED FEATURE (Coming Soon)

**Planned functionality**:
- Admin generates shareable codes for badge distribution
- Two code types:
  - **Shared codes**: One code, multiple users (e.g., "CONFERENCE2025")
  - **Individual codes**: Unique codes, one-time use each
- Set expiration date and max claims
- Users redeem codes on public `/claim` page

**Planned use cases**:
- Event attendees (share code at conference)
- Email campaigns (send code to mailing list)
- Partner organizations (distribute to members)
- Kickstarter backers (email individual codes)

### Method 4: Bulk Email Award

**Status**: 🚧 PLANNED FEATURE (Coming Soon)

**Planned functionality**:
- Upload or paste list of email addresses
- System matches emails to registered accounts
- Awards badge to all matching users
- Provides detailed success/failure report

**Planned use cases**:
- Kickstarter backer rewards (export from campaign platform)
- Beta tester recognition (award to testing program participants)
- Event attendee rewards (import attendance list)
- Alumni programs (recognize previous supporters)

---

## Best Practices

### Badge Design Philosophy

1. **Progressive Recognition**
   - Create badge families with Bronze/Silver/Gold tiers
   - Start with achievable criteria, add harder tiers later
   - Examples:
     - Quest Master I (10 quests) → II (50 quests) → III (100 quests)
     - Reputation Rookie (100 points) → Influencer (1000) → Legend (10000)

2. **Clear Value Communication**
   - Badge name should hint at achievement
   - Description should clearly state how it's earned
   - Visual design should be distinctive and meaningful

3. **Balance Exclusivity and Accessibility**
   - Too easy: Badges lose meaning (everyone has them)
   - Too hard: Badges become discouraging (nobody has them)
   - Aim for 10-30% of active users earning common badges
   - Aim for 1-5% earning rare badges

4. **Seasonal and Event Badges**
   - Create time-limited badges for special occasions
   - Use `maxAwards` to create exclusivity
   - Examples:
     - "Election Day 2024 Participant"
     - "Summer 2025 Civic Champion"
     - "Platform Launch Founding Member"

### Criteria Configuration Tips

1. **Start Generous**
   - Easier to create harder "Gold" tier than fix overly restrictive criteria
   - Monitor analytics after launch, adjust if needed
   - Test criteria on staging environment first

2. **Use Combined Criteria**
   - Higher-tier badges can require multiple achievements
   - Example: "Complete 50 quests AND reach 500 reputation"

3. **Consider Timeframes**
   - Activity-based: Use 30-day windows to encourage ongoing engagement
   - All-time: Use for cumulative achievements

4. **Test Before Production**
   - Create test badge on staging environment
   - Award to test account manually
   - Run qualification check to verify auto-award logic
   - Deploy to production only after verification

### Image Guidelines

1. **Technical Requirements**
   - 512x512 pixels (scales down cleanly)
   - PNG with transparency (preferred) or JPG
   - Under 1MB file size
   - High contrast for visibility

2. **Design Consistency**
   - Use similar color palettes for badge families
   - Maintain consistent shape/border style
   - Consider accessibility (color-blind friendly)
   - Test at 64x64 display size

3. **Visual Hierarchy**
   - Common badges: Simple designs, neutral colors
   - Rare badges: More detail, vibrant colors
   - Legendary badges: Complex designs, special effects (glow, etc.)

### Notification Strategy

1. **Badge Earned Notifications**
   - Automatic notification when badge is awarded
   - Shows badge image and description
   - Links to badge vault for display management

2. **Manual Award Reasons**
   - Always provide reason for manual awards
   - Helps user understand why they received it
   - Creates record for other admins

3. **Batch Award Timing**
   - Run auto-qualification checks during off-peak hours
   - Avoid notification spam from batch awards
   - Consider weekly digest for multiple badge awards

---

## Troubleshooting

### Common Issues

#### User Says Badge Didn't Award Despite Meeting Criteria

**Diagnosis**:
1. Check if badge is active (`isActive: true`)
2. Check if badge is auto-awarded (`isAutoAwarded: true`)
3. Verify user actually meets criteria:
   - Check quest completion count
   - Verify reputation score
   - Confirm activity counts
4. Check if user already has badge (prevents duplicates)
5. Check if maxAwards limit reached

**Solutions**:
- Run manual qualification check: Badge Management → "Run Qualification Check"
- Award manually if criteria met but auto-award failed
- Verify criteria JSON is valid and matches actual data

#### Badge Not Appearing in Available Badges List

**Diagnosis**:
1. Check `isActive` status (must be true)
2. Check badge creation timestamp (may need page refresh)
3. Check browser console for errors

**Solutions**:
- Set badge to active: Edit badge → `isActive: true`
- Clear browser cache and reload
- Check server logs for errors

#### Too Many/Too Few Users Earning Badge

**Diagnosis**:
1. Review qualification criteria
2. Check Badge Analytics for award counts
3. Compare criteria to actual user data distribution

**Solutions**:
- **Too many**: Tighten criteria or create tiered badges
- **Too few**: Loosen criteria or add alternative paths
- Monitor analytics after changes

#### Manual Award Fails

**Error Messages**:
- "User already has this badge" → Check user's badge vault, they already own it
- "Badge not found" → Verify badge ID is correct
- "Badge award limit reached" → maxAwards limit hit, increase or remove limit
- "User not found" → Verify user ID/email is correct

**Solutions**:
- Check error message details
- Verify badge and user IDs
- Check maxAwards setting if limit error
- Contact user to confirm they don't have badge already

#### Qualification Check Takes Too Long

**Diagnosis**:
1. Check number of active users
2. Check number of active auto-awarded badges
3. Review server resource utilization

**Solutions**:
- Run during off-peak hours (2-4 AM)
- Consider splitting checks across multiple runs
- Optimize criteria queries (contact developer)

---

## Badge Management

### Editing Existing Badges

1. Navigate to Badge Management
2. Click badge to edit
3. Modify any field except ID
4. Can replace image (uploads new, keeps old URL as backup)
5. Can update criteria (affects future awards only, doesn't retroactively remove badges)
6. Click "Save Changes"

**Note**: Editing criteria doesn't affect users who already have the badge

### Deactivating Badges

1. Navigate to Badge Management
2. Click badge to edit
3. Set `isActive: false`
4. Click "Save Changes"

**Effects**:
- Badge no longer appears in available badges list
- Users who have badge keep it
- Auto-award checks skip this badge
- Can be reactivated later

### Deleting Badges (Soft Delete)

1. Navigate to Badge Management
2. Click badge to manage
3. Click "Delete Badge" (confirmation required)
4. Badge is deactivated (soft delete)

**Effects**:
- Same as deactivation (sets `isActive: false`)
- Badge remains in database
- Users keep their earned badges
- Cannot be permanently deleted (data integrity)

### Badge Analytics

Access via Badge Management → "View Analytics"

**Metrics Available**:
- Total badges created
- Total badges awarded (across all users)
- Award distribution by badge (most/least awarded)
- Award rate over time
- User engagement with badge system
- Average time to earn each badge

**Use Analytics To**:
- Identify too-easy or too-hard badges
- Monitor badge system health
- Plan new badge creation
- Justify criteria adjustments

---

## Quick Reference

### Badge Creation Checklist

- [ ] Unique, descriptive name (under 30 characters)
- [ ] Clear description (1-2 sentences, explains how to earn)
- [ ] Image uploaded (512x512 PNG/JPG, under 1MB)
- [ ] Image recognizable at 64x64 size
- [ ] Qualification criteria configured correctly
- [ ] Criteria tested on staging environment
- [ ] `isAutoAwarded` set appropriately
- [ ] `maxAwards` set if exclusive badge
- [ ] `displayOrder` set for badge priority
- [ ] Preview checked at multiple sizes
- [ ] Saved and activated

### Distribution Method Decision Tree

```
Is this for platform activity?
  ├─ YES → Use auto-awarded criteria-based badge
  └─ NO → Is this for multiple specific users?
      ├─ YES → Use planned bulk email award (or manual award each)
      └─ NO → Is this for one specific user?
          ├─ YES → Use manual direct award
          └─ NO → Is this for event/external campaign?
              └─ YES → Use planned claim code system
```

### Common Criteria Examples

```json
// 10 quest completions
{
  "type": "QUEST_COMPLETION",
  "requirements": { "questCompletionCount": 10 }
}

// 7-day streak
{
  "type": "QUEST_COMPLETION",
  "requirements": { "streakDays": 7 }
}

// 100 posts created
{
  "type": "USER_ACTIVITY",
  "requirements": {
    "activityTypes": ["CREATE_POST"],
    "activityCount": 100,
    "timeframe": "all_time"
  }
}

// 1000 reputation
{
  "type": "SOCIAL_METRIC",
  "requirements": { "reputationScore": 1000 }
}

// 5 petitions signed
{
  "type": "CIVIC_ACTION",
  "requirements": { "petitionsSigned": 5 }
}

// Super admin only
{
  "type": "CUSTOM_ENDPOINT",
  "requirements": {
    "userProperty": "isSuperAdmin",
    "expectedValue": true
  }
}
```

---

## Support

For technical issues or questions not covered in this guide:
- Contact development team
- Consult `docs/API_QUESTS_BADGES.md` for technical API details
- See `MASTER_DOCUMENTATION.md` for system architecture
