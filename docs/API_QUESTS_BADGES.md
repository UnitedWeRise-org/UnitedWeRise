# Quest & Badge API Reference

**Status**: Production Ready
**Last Updated**: 2025-10-09
**Version**: 1.0.0

---

## 🤖 For Claude Code: When to Read This File

**Read this documentation when the user mentions ANY of these keywords:**
- Quest, Badge, Streak, Gamification
- Civic Engagement (in context of quests/badges)
- Daily Quest, Weekly Quest, Monthly Quest
- Badge Vault, Badge Collection
- Reputation Points, Quest Progress
- User achievements, civic participation rewards

**What this file contains:**
- Complete API documentation for all 19 Quest & Badge endpoints (9 quest + 10 badge)
- Database models: Quest, Badge, UserQuestProgress, UserQuestStreak, UserBadge
- Request/response schemas with JSON examples
- Frontend integration patterns (QuestProgressTracker, BadgeVault components)
- Admin workflows for creating/managing quests and badges
- Error handling and troubleshooting guides

**How to use this documentation:**
1. **Check REQUIRED READING in CLAUDE.md** - The AI Documentation Reference Protocol tells you to read this file when implementing quest/badge features
2. **Use the slash command** - Type `/quest-badge-docs` for a quick reference guide
3. **Read companion files** - This API doc should be read alongside:
   - `docs/CIVIC_ENGAGEMENT.md` (philosophy & design WHY)
   - `backend/src/routes/quests.ts` (current quest implementation)
   - `backend/src/routes/badges.ts` (current badge implementation)
   - `backend/prisma/schema.prisma` (lines 2504-2598: database models)

**Quick navigation:**
- Quest endpoints: Lines 151-546
- Badge endpoints: Lines 657-1093
- Frontend integration: Lines 1096-1172
- Admin workflows: Lines 1174-1274
- Database models: Lines 59-148 (quests), Lines 619-654 (badges)

**Implementation checklist:**
- [ ] Read CIVIC_ENGAGEMENT.md to understand WHY quest/badge system exists
- [ ] Review existing endpoint patterns in this file
- [ ] Check database schema for data models
- [ ] Follow established JSON schemas for requirements/rewards
- [ ] Test on development environment before deploying
- [ ] Update this file if adding new endpoints or changing behavior

---

## Overview

The Quest and Badge system gamifies civic engagement on UnitedWeRise by rewarding users for meaningful participation. Quests are daily, weekly, or monthly challenges that encourage users to engage with political content, participate in civic activities, and build community. Badges are earned achievements that users can display on their profiles to showcase their civic contributions.

**Key Features:**
- Daily quest generation based on user activity patterns
- Streak tracking to encourage consistent engagement
- Automated quest progress updates via user activity tracking
- Badge qualification system with automatic and manual awarding
- User-customizable badge display (up to 5 badges)
- Reputation points integration

---

## Quest System

### Quest Types

Quests are categorized by their time commitment and purpose:

| Type | Description | Timeframe |
|------|-------------|-----------|
| `DAILY_HABIT` | Encourage daily login and basic engagement | 24 hours |
| `DAILY_CIVIC` | Daily civic action challenges | 24 hours |
| `WEEKLY_ENGAGEMENT` | Weekly participation goals | 7 days |
| `MONTHLY_CONSISTENCY` | Month-long engagement tracking | 30 days |
| `SPECIAL_EVENT` | Time-limited event-based quests | Variable |
| `CIVIC_ACTION` | Direct civic participation challenges | Variable |
| `EDUCATIONAL` | Learning-focused quests | Variable |
| `SOCIAL_ENGAGEMENT` | Community interaction challenges | Variable |

### Quest Categories

Quests are organized into thematic categories:

- **INFORMATION**: Reading posts, articles, staying informed
- **PARTICIPATION**: Creating content, commenting, engaging
- **COMMUNITY**: Building connections, helping others
- **ADVOCACY**: Taking civic action, contacting representatives
- **EDUCATION**: Learning about civics, policy, governance
- **SOCIAL**: Social interactions, discussions, networking

### Quest Timeframes

- **DAILY**: Resets every 24 hours at midnight local time
- **WEEKLY**: Resets every Monday at midnight
- **MONTHLY**: Resets on the 1st of each month
- **ONGOING**: No time limit, progress accumulates
- **LIMITED_TIME**: Specific start and end dates

---

## Database Models

### Quest Model

```typescript
model Quest {
  id               String              // Unique quest identifier (cuid)
  type             QuestType           // Quest type enum
  category         QuestCategory       // Quest category enum
  title            String              // Display title
  description      String              // Full description (text)
  shortDescription String?             // Brief description for lists
  requirements     Json                // Flexible requirement definition
  rewards          Json                // Points, badges, reputation
  timeframe        QuestTimeframe      // Time constraint enum
  displayOrder     Int                 // Sort order (default: 0)
  isActive         Boolean             // Whether quest is active (default: true)
  startDate        DateTime?           // For special events
  endDate          DateTime?           // For limited-time quests
  createdAt        DateTime            // Creation timestamp
  updatedAt        DateTime            // Last update timestamp
  createdBy        String?             // Admin who created it
  userProgress     UserQuestProgress[] // Related user progress records
}
```

**Requirements JSON Schema:**
```json
{
  "actionType": "READ_POSTS",        // Action to track
  "requiredCount": 5,                 // Number required
  "metadata": {                       // Optional criteria
    "isPolitical": true,
    "tags": ["healthcare"],
    "minDuration": 30
  }
}
```

**Rewards JSON Schema:**
```json
{
  "reputationPoints": 10,             // Reputation awarded
  "badgeIds": ["badge_cuid_123"],     // Badges to award
  "specialRecognition": "Top Reader"  // Special title/recognition
}
```

### UserQuestProgress Model

```typescript
model UserQuestProgress {
  id          String    // Unique progress record (cuid)
  userId      String    // User identifier
  questId     String    // Quest identifier
  progress    Json      // Current progress state
  completed   Boolean   // Completion status (default: false)
  completedAt DateTime? // Completion timestamp
  startedAt   DateTime  // Start timestamp (default: now)
  updatedAt   DateTime  // Last update timestamp
}
```

**Progress JSON Schema:**
```json
{
  "current": 3,              // Current count
  "required": 5,             // Required count
  "percentage": 60,          // Completion percentage
  "lastAction": "2025-10-09T10:30:00Z"
}
```

### UserQuestStreak Model

```typescript
model UserQuestStreak {
  id                   String    // Unique streak record (cuid)
  userId               String    // User identifier (unique)
  currentDailyStreak   Int       // Current consecutive days (default: 0)
  longestDailyStreak   Int       // Longest daily streak (default: 0)
  currentWeeklyStreak  Int       // Current consecutive weeks (default: 0)
  longestWeeklyStreak  Int       // Longest weekly streak (default: 0)
  lastCompletedDate    DateTime? // Last quest completion date
  totalQuestsCompleted Int       // Lifetime quest count (default: 0)
  createdAt            DateTime  // Record creation timestamp
  updatedAt            DateTime  // Last update timestamp
}
```

---

## Quest API Endpoints

### GET /api/quests/daily

Retrieve daily quests for the authenticated user. Automatically generates new quests if none exist for today.

**Authentication**: Required (JWT)

**Request Parameters**: None

**Response Schema**:
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxxxxxxxxxxxxx",
      "questType": "DAILY_HABIT",
      "title": "Daily Login Challenge",
      "description": "Log in to UnitedWeRise for 5 consecutive days",
      "shortDescription": "Login 5 days in a row",
      "requirements": {
        "actionType": "LOGIN",
        "requiredCount": 1,
        "metadata": {}
      },
      "rewards": {
        "reputationPoints": 5
      },
      "timeframe": "DAILY",
      "difficulty": "BEGINNER",
      "isCompleted": false,
      "progress": {
        "current": 0,
        "required": 1,
        "percentage": 0
      },
      "expiresAt": "2025-10-10T00:00:00Z"
    }
  ]
}
```

**Error Responses**:
- `401 Unauthorized`: Missing or invalid authentication token
- `500 Internal Server Error`: Server error generating quests

**Example Usage**:
```javascript
const response = await apiCall('/quests/daily');
if (response.ok && response.data.success) {
  const quests = response.data.data;
  console.log(`You have ${quests.length} quests today`);
}
```

---

### GET /api/quests/progress

Get detailed progress for all user quests, including current streaks and completion statistics.

**Authentication**: Required (JWT)

**Request Parameters**: None

**Response Schema**:
```json
{
  "success": true,
  "data": {
    "dailyQuests": [
      {
        "id": "clxxxxxxxxxxxxxx",
        "questId": "clxxxxxxxxxxxxxx",
        "progress": {
          "current": 3,
          "required": 5,
          "percentage": 60
        },
        "completed": false,
        "startedAt": "2025-10-09T00:00:00Z",
        "updatedAt": "2025-10-09T10:30:00Z"
      }
    ],
    "weeklyQuests": [],
    "monthlyQuests": [],
    "streak": {
      "currentDailyStreak": 5,
      "longestDailyStreak": 12,
      "currentWeeklyStreak": 2,
      "longestWeeklyStreak": 4,
      "lastCompletedDate": "2025-10-08T23:45:00Z",
      "totalQuestsCompleted": 47
    }
  }
}
```

**Error Responses**:
- `401 Unauthorized`: Missing or invalid authentication token
- `500 Internal Server Error`: Database error retrieving progress

**Example Usage**:
```javascript
const response = await apiCall('/quests/progress');
const { streak, dailyQuests } = response.data.data;
console.log(`Current streak: ${streak.currentDailyStreak} days`);
```

---

### GET /api/quests/streaks

Get just the streak information for the authenticated user.

**Authentication**: Required (JWT)

**Request Parameters**: None

**Response Schema**:
```json
{
  "success": true,
  "data": {
    "dailyStreak": 5,
    "weeklyStreak": 2,
    "longestStreak": 12,
    "totalCompleted": 47,
    "lastCompletedDate": "2025-10-08T23:45:00Z"
  }
}
```

**Error Responses**:
- `401 Unauthorized`: Missing or invalid authentication token
- `500 Internal Server Error`: Database error retrieving streaks

**Example Usage**:
```javascript
const response = await apiCall('/quests/streaks');
const streak = response.data.data;
displayStreakBadge(streak.dailyStreak);
```

---

### POST /api/quests/update-progress

Update quest progress based on user activity. Called automatically by other services when users perform quest-relevant actions.

**Authentication**: Required (JWT)

**Request Body**:
```json
{
  "actionType": "READ_POSTS",
  "metadata": {
    "postId": "clxxxxxxxxxxxxxx",
    "duration": 45,
    "isPolitical": true
  }
}
```

**Request Parameters**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `actionType` | string | Yes | Type of action performed (LOGIN, READ_POSTS, CREATE_POST, etc.) |
| `metadata` | object | No | Additional context about the action |

**Response Schema**:
```json
{
  "success": true,
  "message": "Quest progress updated"
}
```

**Error Responses**:
- `401 Unauthorized`: Missing or invalid authentication token
- `400 Bad Request`: Invalid actionType or metadata
- `500 Internal Server Error`: Failed to update progress

**Example Usage**:
```javascript
// Called automatically after reading a post
await apiCall('/quests/update-progress', 'POST', {
  actionType: 'READ_POSTS',
  metadata: { postId: 'post123', isPolitical: true }
});
```

---

### POST /api/quests/create (Admin Only)

Create a new quest. Only accessible to admin users.

**Authentication**: Required (JWT + Admin Role)

**Request Body**:
```json
{
  "type": "DAILY_CIVIC",
  "category": "PARTICIPATION",
  "title": "Civic Engagement Challenge",
  "description": "Comment on 3 political posts to earn reputation points",
  "shortDescription": "Comment on 3 posts",
  "requirements": {
    "actionType": "CREATE_COMMENT",
    "requiredCount": 3,
    "metadata": {
      "isPolitical": true
    }
  },
  "rewards": {
    "reputationPoints": 15
  },
  "timeframe": "DAILY",
  "displayOrder": 1,
  "isActive": true
}
```

**Response Schema**:
```json
{
  "success": true,
  "data": {
    "id": "clxxxxxxxxxxxxxx",
    "type": "DAILY_CIVIC",
    "category": "PARTICIPATION",
    "title": "Civic Engagement Challenge",
    "description": "Comment on 3 political posts to earn reputation points",
    "createdAt": "2025-10-09T12:00:00Z",
    "createdBy": "admin_user_id"
  }
}
```

**Error Responses**:
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not an admin user
- `400 Bad Request`: Invalid quest data
- `500 Internal Server Error`: Failed to create quest

---

### GET /api/quests/all (Admin Only)

Retrieve all quests in the system, including inactive ones.

**Authentication**: Required (JWT + Admin Role)

**Request Parameters**: None

**Response Schema**:
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxxxxxxxxxxxxx",
      "type": "DAILY_CIVIC",
      "category": "PARTICIPATION",
      "title": "Civic Engagement Challenge",
      "isActive": true,
      "createdAt": "2025-10-09T12:00:00Z"
    }
  ]
}
```

**Error Responses**:
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not an admin user
- `500 Internal Server Error`: Database error

---

### PUT /api/quests/:questId (Admin Only)

Update an existing quest.

**Authentication**: Required (JWT + Admin Role)

**URL Parameters**:
- `questId`: Quest identifier (cuid)

**Request Body** (all fields optional):
```json
{
  "title": "Updated Quest Title",
  "description": "Updated description",
  "rewards": {
    "reputationPoints": 20
  },
  "isActive": false
}
```

**Response Schema**:
```json
{
  "success": true,
  "data": {
    "id": "clxxxxxxxxxxxxxx",
    "title": "Updated Quest Title",
    "updatedAt": "2025-10-09T12:30:00Z"
  }
}
```

**Error Responses**:
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not an admin user
- `404 Not Found`: Quest ID doesn't exist
- `500 Internal Server Error`: Failed to update quest

---

### GET /api/quests/analytics (Admin Only)

Get analytics and statistics about quest system performance.

**Authentication**: Required (JWT + Admin Role)

**Request Parameters**: None

**Response Schema**:
```json
{
  "success": true,
  "data": {
    "totalQuests": 25,
    "activeQuests": 20,
    "totalCompletions": 1543,
    "averageCompletionRate": 67.3,
    "questsByType": {
      "DAILY_HABIT": 8,
      "DAILY_CIVIC": 7,
      "WEEKLY_ENGAGEMENT": 5
    },
    "topQuests": [
      {
        "id": "clxxxxxxxxxxxxxx",
        "title": "Daily Login",
        "completions": 523,
        "completionRate": 89.2
      }
    ],
    "streakStats": {
      "averageDailyStreak": 3.4,
      "longestActiveStreak": 45,
      "usersWithStreaks": 237
    }
  }
}
```

**Error Responses**:
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not an admin user
- `500 Internal Server Error`: Failed to generate analytics

---

### POST /api/quests/create-weekly (Admin Only)

Generate or update the weekly quest. Typically called by a scheduled task.

**Authentication**: Required (JWT + Admin Role)

**Request Body**: None (automatic generation)

**Response Schema**:
```json
{
  "success": true,
  "data": {
    "id": "clxxxxxxxxxxxxxx",
    "type": "WEEKLY_ENGAGEMENT",
    "title": "Weekly Civic Participation",
    "description": "Complete 15 quests this week",
    "createdAt": "2025-10-09T00:00:00Z"
  }
}
```

**Error Responses**:
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not an admin user
- `500 Internal Server Error`: Failed to create weekly quest

---

## Badge System

### Badge Qualification System

Badges use a flexible JSON-based qualification criteria system that supports multiple qualification types:

**Quest Completion Criteria**:
```json
{
  "type": "QUEST_COMPLETION",
  "requiredCount": 50,
  "questTypes": ["DAILY_HABIT", "DAILY_CIVIC"]
}
```

**Streak Achievement Criteria**:
```json
{
  "type": "STREAK_ACHIEVEMENT",
  "requiredStreak": 7,
  "streakType": "DAILY"
}
```

**Reputation Threshold Criteria**:
```json
{
  "type": "REPUTATION_THRESHOLD",
  "minimumReputation": 100
}
```

**Activity Count Criteria**:
```json
{
  "type": "ACTIVITY_COUNT",
  "activityType": "CREATE_POST",
  "requiredCount": 20,
  "isPolitical": true
}
```

**Special Event Criteria**:
```json
{
  "type": "SPECIAL_EVENT",
  "eventId": "election_day_2024",
  "requiredParticipation": true
}
```

**Combined Criteria** (all must be met):
```json
{
  "type": "COMBINED",
  "requirements": [
    {
      "type": "REPUTATION_THRESHOLD",
      "minimumReputation": 50
    },
    {
      "type": "QUEST_COMPLETION",
      "requiredCount": 10
    }
  ]
}
```

---

## Badge Database Models

### Badge Model

```typescript
model Badge {
  id                    String      // Unique badge identifier (cuid)
  name                  String      // Unique badge name
  description           String      // Badge description (text)
  imageUrl              String      // Azure Storage URL
  qualificationCriteria Json        // Flexible criteria object
  displayOrder          Int         // Sort order (default: 0)
  isActive              Boolean     // Active status (default: true)
  isAutoAwarded         Boolean     // Auto-award flag (default: true)
  maxAwards             Int?        // Optional award limit
  createdAt             DateTime    // Creation timestamp
  updatedAt             DateTime    // Last update timestamp
  createdBy             String?     // Admin who created it
  userBadges            UserBadge[] // Related user badge records
}
```

### UserBadge Model

```typescript
model UserBadge {
  id           String   // Unique user badge record (cuid)
  userId       String   // User identifier
  badgeId      String   // Badge identifier
  earnedAt     DateTime // Earned timestamp (default: now)
  isDisplayed  Boolean  // Display on profile (default: false)
  displayOrder Int?     // Display position (1-5)
  awardedBy    String?  // Admin ID if manually awarded
  awardReason  String?  // Optional reason for manual awards
}
```

---

## Badge API Endpoints

### GET /api/badges/vault

Get the current user's badge vault, including earned badges and display preferences.

**Authentication**: Required (JWT)

**Request Parameters**: None

**Response Schema**:
```json
{
  "success": true,
  "data": {
    "badges": [
      {
        "id": "clxxxxxxxxxxxxxx",
        "badgeId": "badge_clxxxxxxxxxxxxxx",
        "earnedAt": "2025-09-15T14:30:00Z",
        "isDisplayed": true,
        "displayOrder": 1,
        "badge": {
          "id": "badge_clxxxxxxxxxxxxxx",
          "name": "Civic Champion",
          "description": "Completed 50 civic engagement quests",
          "imageUrl": "https://uwrstorage2425.blob.core.windows.net/badges/civic-champion.png",
          "rarity": "RARE",
          "category": "CIVIC"
        }
      }
    ],
    "settings": {
      "publicVisibility": true,
      "categoryPreference": ["CIVIC", "SOCIAL"],
      "rarityPriority": true
    },
    "totalBadges": 12,
    "displayedBadges": 3
  }
}
```

**Error Responses**:
- `401 Unauthorized`: Missing or invalid authentication token
- `500 Internal Server Error`: Database error retrieving badges

**Example Usage**:
```javascript
const response = await apiCall('/badges/vault');
const { badges, totalBadges } = response.data.data;
console.log(`You have earned ${totalBadges} badges!`);
```

---

### GET /api/badges/user/:userId

Get badges for a specific user (for viewing other users' profiles).

**Authentication**: Required (JWT)

**URL Parameters**:
- `userId`: User identifier (cuid)

**Response Schema**:
```json
{
  "success": true,
  "data": {
    "badges": [
      {
        "id": "clxxxxxxxxxxxxxx",
        "badgeId": "badge_clxxxxxxxxxxxxxx",
        "earnedAt": "2025-09-15T14:30:00Z",
        "isDisplayed": true,
        "displayOrder": 1,
        "badge": {
          "name": "Civic Champion",
          "description": "Completed 50 civic engagement quests",
          "imageUrl": "https://uwrstorage2425.blob.core.windows.net/badges/civic-champion.png",
          "rarity": "RARE"
        }
      }
    ],
    "displayedBadges": [
      // Only badges where isDisplayed = true
    ]
  }
}
```

**Error Responses**:
- `401 Unauthorized`: Not authenticated
- `404 Not Found`: User doesn't exist
- `500 Internal Server Error`: Database error

---

### GET /api/badges/available

Get all available badges in the system (for BadgeVault "available" section).

**Authentication**: Required (JWT)

**Request Parameters**: None

**Response Schema**:
```json
{
  "success": true,
  "data": [
    {
      "id": "badge_clxxxxxxxxxxxxxx",
      "name": "Civic Champion",
      "description": "Complete 50 civic engagement quests",
      "imageUrl": "https://uwrstorage2425.blob.core.windows.net/badges/civic-champion.png",
      "qualificationCriteria": {
        "type": "QUEST_COMPLETION",
        "requiredCount": 50,
        "questTypes": ["DAILY_CIVIC"]
      },
      "displayOrder": 1,
      "isActive": true,
      "isAutoAwarded": true,
      "category": "CIVIC",
      "rarity": "RARE"
    }
  ]
}
```

**Error Responses**:
- `401 Unauthorized`: Not authenticated
- `500 Internal Server Error`: Database error

---

### GET /api/badges/all

Get all badges (admin endpoint, includes inactive badges).

**Authentication**: Required (JWT)

**Request Parameters**: None

**Response Schema**: Same as `/badges/available`, but includes inactive badges.

**Error Responses**:
- `401 Unauthorized`: Not authenticated
- `500 Internal Server Error`: Database error

---

### PUT /api/badges/display

Update badge display preferences for the authenticated user.

**Authentication**: Required (JWT)

**Request Body**:
```json
{
  "badgeId": "badge_clxxxxxxxxxxxxxx",
  "isDisplayed": true,
  "displayOrder": 2
}
```

**Request Parameters**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `badgeId` | string | Yes | Badge identifier |
| `isDisplayed` | boolean | Yes | Whether to display on profile |
| `displayOrder` | integer | No | Display position (1-5) |

**Response Schema**:
```json
{
  "success": true,
  "data": {
    "id": "clxxxxxxxxxxxxxx",
    "badgeId": "badge_clxxxxxxxxxxxxxx",
    "isDisplayed": true,
    "displayOrder": 2,
    "updatedAt": "2025-10-09T14:00:00Z"
  }
}
```

**Error Responses**:
- `401 Unauthorized`: Not authenticated
- `400 Bad Request`: User doesn't own this badge or invalid displayOrder
- `500 Internal Server Error`: Failed to update display preference

**Example Usage**:
```javascript
// Add badge to profile display
await apiCall('/badges/display', 'PUT', {
  badgeId: 'badge_123',
  isDisplayed: true,
  displayOrder: 1
});
```

---

### POST /api/badges/create (Admin Only)

Create a new badge with an uploaded image.

**Authentication**: Required (JWT + Admin Role)

**Request Type**: `multipart/form-data`

**Form Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Unique badge name |
| `description` | string | Yes | Badge description |
| `image` | file | Yes | Badge image (PNG/JPG, max 1MB) |
| `qualificationCriteria` | JSON string | Yes | Qualification criteria object |
| `isAutoAwarded` | boolean | No | Auto-award flag (default: true) |
| `maxAwards` | integer | No | Max number of awards |
| `displayOrder` | integer | No | Sort order |

**Example Request** (JavaScript):
```javascript
const formData = new FormData();
formData.append('name', 'Civic Champion');
formData.append('description', 'Complete 50 civic engagement quests');
formData.append('image', imageFile);
formData.append('qualificationCriteria', JSON.stringify({
  type: 'QUEST_COMPLETION',
  requiredCount: 50,
  questTypes: ['DAILY_CIVIC']
}));
formData.append('isAutoAwarded', 'true');

const response = await fetch('/api/badges/create', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

**Response Schema**:
```json
{
  "success": true,
  "data": {
    "id": "badge_clxxxxxxxxxxxxxx",
    "name": "Civic Champion",
    "description": "Complete 50 civic engagement quests",
    "imageUrl": "https://uwrstorage2425.blob.core.windows.net/badges/civic-champion-abc123.png",
    "qualificationCriteria": {
      "type": "QUEST_COMPLETION",
      "requiredCount": 50,
      "questTypes": ["DAILY_CIVIC"]
    },
    "isAutoAwarded": true,
    "createdAt": "2025-10-09T15:00:00Z",
    "createdBy": "admin_user_id"
  }
}
```

**Error Responses**:
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not an admin user
- `400 Bad Request`: Invalid form data, missing image, or criteria parsing failed
- `413 Payload Too Large`: Image exceeds 1MB limit
- `500 Internal Server Error`: Failed to upload image or create badge

---

### PUT /api/badges/:badgeId (Admin Only)

Update an existing badge.

**Authentication**: Required (JWT + Admin Role)

**Request Type**: `multipart/form-data`

**URL Parameters**:
- `badgeId`: Badge identifier (cuid)

**Form Fields** (all optional):
| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Updated badge name |
| `description` | string | Updated description |
| `image` | file | New badge image (replaces existing) |
| `qualificationCriteria` | JSON string | Updated criteria |
| `isAutoAwarded` | boolean | Auto-award flag |
| `maxAwards` | integer | Max number of awards |
| `displayOrder` | integer | Sort order |

**Response Schema**:
```json
{
  "success": true,
  "data": {
    "id": "badge_clxxxxxxxxxxxxxx",
    "name": "Updated Badge Name",
    "imageUrl": "https://uwrstorage2425.blob.core.windows.net/badges/updated-image.png",
    "updatedAt": "2025-10-09T15:30:00Z"
  }
}
```

**Error Responses**:
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not an admin user
- `404 Not Found`: Badge doesn't exist
- `400 Bad Request`: Invalid update data
- `500 Internal Server Error`: Failed to update badge

---

### POST /api/badges/award (Admin Only)

Manually award a badge to a user.

**Authentication**: Required (JWT + Admin Role)

**Request Body**:
```json
{
  "userId": "user_clxxxxxxxxxxxxxx",
  "badgeId": "badge_clxxxxxxxxxxxxxx",
  "reason": "Outstanding civic participation during election season"
}
```

**Request Parameters**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | string | Yes | User to award badge to |
| `badgeId` | string | Yes | Badge to award |
| `reason` | string | No | Reason for manual award |

**Response Schema**:
```json
{
  "success": true,
  "data": {
    "id": "clxxxxxxxxxxxxxx",
    "userId": "user_clxxxxxxxxxxxxxx",
    "badgeId": "badge_clxxxxxxxxxxxxxx",
    "earnedAt": "2025-10-09T16:00:00Z",
    "awardedBy": "admin_user_id",
    "awardReason": "Outstanding civic participation during election season"
  }
}
```

**Error Responses**:
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not an admin user
- `400 Bad Request`: User already has this badge, or badge/user doesn't exist
- `500 Internal Server Error`: Failed to award badge

**Example Usage**:
```javascript
// Award special badge to active user
await apiCall('/badges/award', 'POST', {
  userId: 'user_123',
  badgeId: 'badge_456',
  reason: 'Top contributor for September 2025'
});
```

---

### DELETE /api/badges/:badgeId (Admin Only)

Deactivate a badge (soft delete - sets `isActive = false`).

**Authentication**: Required (JWT + Admin Role)

**URL Parameters**:
- `badgeId`: Badge identifier (cuid)

**Response Schema**:
```json
{
  "success": true,
  "message": "Badge deactivated successfully"
}
```

**Error Responses**:
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not an admin user
- `404 Not Found`: Badge doesn't exist
- `500 Internal Server Error`: Failed to deactivate badge

**Note**: This does NOT remove badges from users who have already earned them. It only prevents new awards and hides the badge from the available badges list.

---

### POST /api/badges/check-qualifications (Admin Only)

Run badge qualification checks across all users and auto-award eligible badges.

**Authentication**: Required (JWT + Admin Role)

**Request Body**: None

**Response Schema**:
```json
{
  "success": true,
  "data": {
    "badgesAwarded": 47
  },
  "message": "47 badges awarded based on qualification criteria"
}
```

**Error Responses**:
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not an admin user
- `500 Internal Server Error`: Failed to run qualification checks

**Example Usage**:
```javascript
// Typically run via scheduled task
const response = await apiCall('/badges/check-qualifications', 'POST');
console.log(`Awarded ${response.data.data.badgesAwarded} badges`);
```

**Note**: This endpoint should be called periodically (e.g., daily) by a scheduled task to automatically award badges to qualifying users.

---

## Frontend Integration

### QuestProgressTracker Component

**File**: `frontend/src/components/QuestProgressTracker.js`

**Initialization**:
```javascript
const questProgressTracker = new QuestProgressTracker();
window.questProgressTracker = questProgressTracker;
```

**Key Features**:
- Auto-loads quest data on component initialization
- Refreshes every 5 minutes automatically
- Listens for `userActivity` events to update progress
- Shows quest completion animations with confetti effect
- Displays daily progress, active quests, and streak information

**Events**:
- `questCompleted`: Fired when a quest is completed
  ```javascript
  document.dispatchEvent(new CustomEvent('questCompleted', {
    detail: { questId: 'quest_123', rewards: { reputationPoints: 10 } }
  }));
  ```

**Methods**:
- `loadQuestData()`: Refresh quest data from API
- `handleQuestCompletion(questId, rewards)`: Handle completion with animation
- `render()`: Render quest dashboard UI
- `destroy()`: Clean up timers and event listeners

**HTML Container**:
```html
<div id="quest-progress-container"></div>
```

---

### BadgeVault Component

**File**: `frontend/src/components/BadgeVault.js`

**Initialization**:
```javascript
const badgeVault = new BadgeVault();
window.badgeVault = badgeVault;
```

**Key Features**:
- Badge collection management
- Display preferences (up to 5 badges)
- Badge ordering via drag-and-drop or arrow buttons
- Auto-save display changes every 3 seconds
- Nameplate preview
- Filter by category and rarity

**Methods**:
- `showVault()`: Open badge vault modal
- `toggleBadgeDisplay(badgeId)`: Add/remove badge from display
- `moveBadgeUp(badgeId)`: Move badge up in display order
- `moveBadgeDown(badgeId)`: Move badge down in display order
- `updateSetting(setting, value)`: Update vault preferences
- `saveBadgeSettings()`: Save changes to backend

**Modal Tabs**:
1. **Display Settings**: Manage nameplate badges (max 5)
2. **Full Collection**: Browse all earned badges
3. **Preferences**: Configure vault settings

**HTML Usage**:
```html
<button onclick="badgeVault.showVault()">Open Badge Vault</button>
```

---

## Admin Workflows

### Creating a Quest

1. Navigate to Admin Dashboard > Quest Management
2. Click "Create New Quest"
3. Fill in quest details:
   - Type, category, timeframe
   - Title and description
   - Requirements (JSON)
   - Rewards (JSON)
4. Preview quest card
5. Save and activate

**Example Admin Request**:
```javascript
await apiCall('/quests/create', 'POST', {
  type: 'DAILY_CIVIC',
  category: 'PARTICIPATION',
  title: 'Civic Commentator',
  description: 'Comment on 5 political posts today',
  requirements: {
    actionType: 'CREATE_COMMENT',
    requiredCount: 5,
    metadata: { isPolitical: true }
  },
  rewards: {
    reputationPoints: 15
  },
  timeframe: 'DAILY',
  isActive: true
});
```

---

### Creating a Badge

1. Navigate to Admin Dashboard > Badge Management
2. Click "Create New Badge"
3. Upload badge image (PNG/JPG, max 1MB)
4. Fill in badge details:
   - Name and description
   - Qualification criteria (JSON)
   - Auto-award setting
5. Preview badge display
6. Save badge

**Example Admin Request**:
```javascript
const formData = new FormData();
formData.append('name', '7-Day Streak Master');
formData.append('description', 'Maintain a 7-day quest completion streak');
formData.append('image', badgeImageFile);
formData.append('qualificationCriteria', JSON.stringify({
  type: 'STREAK_ACHIEVEMENT',
  requiredStreak: 7,
  streakType: 'DAILY'
}));
formData.append('isAutoAwarded', 'true');

await fetch('/api/badges/create', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});
```

---

### Manually Awarding a Badge

1. Navigate to Admin Dashboard > User Management
2. Find target user
3. Click "Award Badge"
4. Select badge from dropdown
5. Enter reason for award (optional)
6. Confirm award

**Example Admin Request**:
```javascript
await apiCall('/badges/award', 'POST', {
  userId: 'user_clxxxxxxxxxxxxxx',
  badgeId: 'badge_special_event_2024',
  reason: 'Active participation in Election Day 2024 event'
});
```

---

### Running Badge Qualification Checks

**Scheduled Task** (recommended daily at midnight):
```javascript
// Run via cron job or scheduled cloud function
await apiCall('/badges/check-qualifications', 'POST');
```

This checks all active users against all active badge criteria and automatically awards qualifying badges.

---

## Complete Integration Example

### User Quest Journey

```javascript
// 1. User logs in - fetch daily quests
const questsResponse = await apiCall('/quests/daily');
const quests = questsResponse.data.data;
displayQuestsOnDashboard(quests);

// 2. User performs activity (reading a post)
async function onPostRead(postId, duration) {
  // Update quest progress
  await apiCall('/quests/update-progress', 'POST', {
    actionType: 'READ_POSTS',
    metadata: {
      postId,
      duration,
      isPolitical: true
    }
  });

  // Refresh quest display
  await questProgressTracker.loadQuestData();
}

// 3. Quest completion detected
document.addEventListener('questCompleted', async (event) => {
  const { questId, rewards } = event.detail;

  // Show completion animation
  questProgressTracker.handleQuestCompletion(questId, rewards);

  // Update reputation display
  updateReputationPoints(rewards.reputationPoints);

  // Check if badge earned
  if (rewards.badgeIds && rewards.badgeIds.length > 0) {
    showBadgeEarnedNotification(rewards.badgeIds);
  }
});

// 4. User views badge vault
badgeVault.showVault();

// 5. User customizes badge display
badgeVault.toggleBadgeDisplay('badge_123');
badgeVault.moveBadgeUp('badge_456');
// Auto-saved after 3 seconds
```

---

### Admin Management Example

```javascript
// 1. Create weekly quest
await apiCall('/quests/create', 'POST', {
  type: 'WEEKLY_ENGAGEMENT',
  category: 'PARTICIPATION',
  title: 'Weekly Community Leader',
  description: 'Complete 20 quests this week',
  requirements: {
    actionType: 'COMPLETE_QUESTS',
    requiredCount: 20
  },
  rewards: {
    reputationPoints: 100,
    badgeIds: ['badge_weekly_leader']
  },
  timeframe: 'WEEKLY',
  startDate: new Date('2025-10-07T00:00:00Z'),
  endDate: new Date('2025-10-13T23:59:59Z')
});

// 2. Check quest analytics
const analyticsResponse = await apiCall('/quests/analytics');
const { totalCompletions, averageCompletionRate } = analyticsResponse.data.data;
console.log(`Completion rate: ${averageCompletionRate}%`);

// 3. Award special badge
await apiCall('/badges/award', 'POST', {
  userId: 'top_contributor_user_id',
  badgeId: 'badge_community_hero',
  reason: 'Top contributor for Q4 2025'
});

// 4. Run nightly qualification check
await apiCall('/badges/check-qualifications', 'POST');
```

---

## Error Handling Best Practices

```javascript
async function fetchUserQuests() {
  try {
    const response = await apiCall('/quests/daily');

    if (!response.ok) {
      if (response.status === 401) {
        // Redirect to login
        redirectToLogin();
      } else if (response.status === 500) {
        // Show error message
        showError('Unable to load quests. Please try again later.');
      }
      return [];
    }

    if (response.data.success) {
      return response.data.data;
    } else {
      console.error('Quest fetch failed:', response.data.error);
      return [];
    }
  } catch (error) {
    console.error('Network error fetching quests:', error);
    showError('Network error. Please check your connection.');
    return [];
  }
}
```

---

## Performance Considerations

### Caching Recommendations

1. **Quest Data**: Cache for 5 minutes (component auto-refreshes)
2. **Badge Vault**: Cache for 1 hour (infrequent changes)
3. **Available Badges**: Cache for 24 hours (rarely changes)

### Rate Limiting

- Quest progress updates: Max 100 per minute per user
- Badge display updates: Max 10 per minute per user
- Admin endpoints: Max 100 per minute per admin

### Database Indexes

All critical queries are indexed:
- Quest lookups by `type`, `isActive`, `startDate/endDate`
- User progress by `userId`, `questId`, `completed`
- Badge lookups by `name`, `isActive`
- User badges by `userId`, `badgeId`, `isDisplayed`

---

## Security Notes

1. **Authentication**: All endpoints require JWT authentication
2. **Admin Authorization**: Admin endpoints verify `isAdmin` flag
3. **Input Validation**: All JSON inputs validated against schemas
4. **File Upload**: Badge images scanned for malware, limited to 1MB
5. **Rate Limiting**: Enforced on all endpoints
6. **CORS**: Configured for UnitedWeRise domains only

---

## Badge Distribution Methods

The UnitedWeRise badge system supports multiple distribution methods to accommodate different use cases, from automatic rewards for platform activity to special recognition awards.

### Method 1: Manual Direct Award

**When to use**: Special recognition, one-off awards, moderator discretion, exceptional contributions

**How it works**: Admins manually award badges to specific users through the admin interface or API

**API Endpoint**: `POST /api/badges/award`

**Request Example**:
```json
{
  "userId": "user_clxxxxxxxxxxxxxx",
  "badgeId": "badge_clxxxxxxxxxxxxxx",
  "reason": "Outstanding civic participation during election season"
}
```

**Response Example**:
```json
{
  "success": true,
  "data": {
    "id": "clxxxxxxxxxxxxxx",
    "userId": "user_clxxxxxxxxxxxxxx",
    "badgeId": "badge_clxxxxxxxxxxxxxx",
    "earnedAt": "2025-10-23T16:00:00Z",
    "awardedBy": "admin_user_id",
    "awardReason": "Outstanding civic participation during election season"
  }
}
```

**Use Cases**:
- Recognizing beta testers or early adopters
- Awarding "Bug Reporter" badges to users who report critical issues
- Special event participation (attended community call, livestream guest)
- Community moderation contributions
- Kickstarter backers or campaign supporters

**Error Handling**:
- `400 Bad Request`: User already has this badge
- `404 Not Found`: User or badge doesn't exist
- `400 Bad Request`: Badge award limit reached (if maxAwards set)

---

### Method 2: Automatic Criteria-Based Awards

**When to use**: Badges earned through measurable platform activity (quest completion, reputation milestones, activity counts)

**How it works**: System automatically checks qualification criteria on a schedule (typically daily) and awards badges to qualifying users

**API Endpoint**: `POST /api/badges/check-qualifications`

**Qualification Types**:

#### QUEST_COMPLETION
Award based on quest completion count or streaks.

```json
{
  "type": "QUEST",
  "requirements": {
    "questCompletionCount": 50,
    "questTypes": ["DAILY_CIVIC", "WEEKLY_ENGAGEMENT"]
  }
}
```

**Example**: "Complete 50 civic quests" badge

#### ACTIVITY_COUNT
Award based on specific user activities within a timeframe.

```json
{
  "type": "ACTIVITY",
  "requirements": {
    "activityTypes": ["CREATE_POST", "CREATE_COMMENT"],
    "activityCount": 100,
    "timeframe": "30d"
  }
}
```

**Example**: "Created 100 posts in the last 30 days" badge

#### CIVIC_ACTION
Award based on civic engagement actions.

```json
{
  "type": "CIVIC",
  "requirements": {
    "petitionsSigned": 10,
    "eventsAttended": 5,
    "postsCreated": 20
  }
}
```

**Example**: "Civic Champion: Signed 10 petitions and attended 5 events" badge

#### SOCIAL_METRIC
Award based on social standing and reputation.

```json
{
  "type": "SOCIAL",
  "requirements": {
    "reputationScore": 1000,
    "followersCount": 100,
    "friendsCount": 50
  }
}
```

**Example**: "Influential Voice: 1000 reputation and 100 followers" badge

#### CUSTOM_ENDPOINT
Award based on custom logic or user properties.

```json
{
  "type": "CUSTOM_ENDPOINT",
  "requirements": {
    "userProperty": "isSuperAdmin",
    "expectedValue": true
  }
}
```

**Example**: Check if user has `isSuperAdmin` flag for admin-only badges

**Note**: CUSTOM_ENDPOINT currently supports checking user properties. External API integration is planned for future implementation.

**Running Qualification Checks**:

```javascript
// Typically run via scheduled task (daily cron job)
const response = await apiCall('/badges/check-qualifications', 'POST');
console.log(`${response.data.data.badgesAwarded} badges awarded`);
```

**Response Example**:
```json
{
  "success": true,
  "data": {
    "badgesAwarded": 47
  },
  "message": "47 badges awarded based on qualification criteria"
}
```

**Best Practices**:
1. Set `isAutoAwarded: true` when creating the badge
2. Run checks during off-peak hours (e.g., 2 AM server time)
3. Monitor award counts to detect criteria that are too easy/hard
4. Start with generous criteria - easier to add "Gold" tier than fix over-restricted badges
5. Test criteria on staging environment first

**Performance Considerations**:
- Checks only active users (seen within last 30 days)
- Skips users who already have each badge
- Runs sequentially to avoid database overload
- Average runtime: ~5-10 minutes for 10,000 active users and 50 badges

---

### Method 3: Claim Code System

**Status**: 🚧 PLANNED FEATURE (Not Yet Implemented)

**Planned functionality**:
- Generate shareable codes for badge distribution
- Support for SHARED codes (one code, multiple claims, e.g., "CONFERENCE2025")
- Support for INDIVIDUAL codes (unique one-time use codes for each recipient)
- Expiration dates and max claim limits
- Public `/claim` page for users to redeem codes

**Planned use cases**:
- Event attendees: Generate "SUMMIT2025" code, share at conference
- Kickstarter backers: Generate individual codes, email to each backer
- Email campaigns: Create limited-time codes for engagement
- Partner rewards: Distribute codes to partner organizations

---

### Method 4: Bulk Email Award

**Status**: 🚧 PLANNED FEATURE (Not Yet Implemented)

**Planned functionality**:
- Award badges to multiple users by providing email list
- Paste or upload CSV of email addresses
- Match emails to registered accounts
- Detailed success/failure report
- Handle non-existent users and duplicate badges gracefully

**Planned use cases**:
- Kickstarter backer rewards: Export backer emails from campaign platform
- Beta tester badges: Award to email list from testing program
- Event attendee rewards: Import attendance list CSV
- Alumni programs: Recognize previous campaign supporters

---

### Distribution Method Comparison

| Method | Best For | Admin Effort | Scalability | Automation |
|--------|----------|--------------|-------------|------------|
| **Manual Direct Award** | Special cases, individual recognition | High | Low | None |
| **Auto Criteria-Based** | Activity-based rewards | Low (setup only) | High | Full |
| **Claim Codes** (planned) | Events, external campaigns | Medium | High | Partial |
| **Bulk Email Award** (planned) | External lists, backers | Medium | Medium | Partial |

---

### Badge Creation Best Practices

**Image Guidelines**:
- Format: PNG with transparent background (preferred) or JPG
- Size: 512x512 pixels recommended
- File size: Max 1MB
- Design: Recognizable at small sizes (64x64 display)
- Style: Consistent visual language across badge family

**Descriptions**:
- Clear: Explicitly state what the badge represents
- Concise: 1-2 sentences maximum
- Actionable: If criteria-based, explain how to earn it
- Engaging: Use language that motivates participation

**Qualification Criteria**:
- Start generous: Easier to add "Gold" tier later than fix overly restrictive criteria
- Test thoroughly: Verify criteria match on staging before production
- Use combined criteria: Require multiple achievements for higher-tier badges
- Monitor analytics: Check completion rates after launch

**Max Awards Settings**:
- Use sparingly: Only for truly exclusive badges
- Examples: "First 100 Users", "Beta Tester 2024", "Founding Member"
- Consider: Once limit reached, badge becomes "legacy" status

**Display Order**:
- Lower numbers appear first in badge selection UI
- Group by category/theme for intuitive browsing
- Highlight flagship or most impressive badges with lower display orders

---

## Support & Troubleshooting

### Common Issues

**Quest not updating after activity:**
- Check that activity event is properly fired
- Verify `actionType` matches quest requirements
- Check network console for failed API calls

**Badge not appearing after earning:**
- Badges may require admin qualification check
- Check `isAutoAwarded` flag on badge
- Verify qualification criteria are met

**Badge display not saving:**
- Wait 3 seconds for auto-save
- Check browser console for errors
- Ensure max 5 badges selected

### Debug Logging

Enable admin debug logging:
```javascript
adminDebugLog('Quest progress update:', {
  actionType,
  metadata,
  timestamp: new Date()
});
```

---

## Version History

**v1.0.0** (2025-10-09)
- Initial production release
- 9 quest endpoints
- 10 badge endpoints
- Frontend components integrated
- Admin workflows documented

---

**For additional support, contact the development team or consult the main MASTER_DOCUMENTATION.md file.**
