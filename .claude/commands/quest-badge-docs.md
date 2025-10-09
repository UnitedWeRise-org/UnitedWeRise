# Quest & Badge System Documentation Reference

You are assisting with the Quest and Badge gamification system for UnitedWeRise. This command provides quick access to all relevant documentation and implementation files.

## REQUIRED READING ORDER

Before implementing any quest or badge features, read in this order:

### 1. Philosophy & Design (WHY)
**File:** `docs/CIVIC_ENGAGEMENT.md`
**Read:** Sections 1-3 (Overview, Philosophy, System Design)
**Purpose:** Understand the civic engagement philosophy and why quests/badges exist

Key concepts:
- Quest system designed to incentivize civic participation
- Badge system recognizes achievement milestones
- Gamification supports democratic engagement, not just entertainment
- Privacy-preserving design (no public leaderboards that shame non-participants)

### 2. API Documentation (WHAT)
**File:** `docs/API_QUESTS_BADGES.md`
**Read:** All sections
**Purpose:** Complete API endpoint reference for quests and badges

Quest Endpoints (9 total):
- `GET /api/quests/daily` - Get daily quests
- `GET /api/quests/progress` - User's quest progress
- `GET /api/quests/streaks` - User's active streaks
- `POST /api/quests/update-progress` - Update quest progress
- `POST /api/quests/create` - Create new quest (admin)
- `PUT /api/quests/:questId` - Update quest (admin)
- `DELETE /api/quests/:questId` - Delete quest (admin)
- `GET /api/quests/stats` - Quest statistics (admin)
- `POST /api/quests/reset-progress/:userId` - Reset user progress (admin)

Badge Endpoints (10 total):
- `GET /api/badges/vault` - User's badge collection
- `GET /api/badges/available` - Available badges to earn
- `GET /api/badges/progress/:badgeId` - Progress toward specific badge
- `POST /api/badges/create` - Create new badge (admin)
- `PUT /api/badges/:badgeId` - Update badge (admin)
- `DELETE /api/badges/:badgeId` - Delete badge (admin)
- `POST /api/badges/award` - Award badge to user (admin)
- `GET /api/badges/stats` - Badge statistics (admin)
- `GET /api/badges/holders/:badgeId` - Users with specific badge (admin)
- `POST /api/badges/:badgeId/revoke/:userId` - Revoke user's badge (admin)

### 3. Backend Implementation (HOW - Backend)
**File:** `backend/src/routes/quests.ts`
**Purpose:** Current quest endpoint implementation

**File:** `backend/src/routes/badges.ts`
**Purpose:** Current badge endpoint implementation

Key patterns:
- JWT authentication required for all endpoints
- Admin-only endpoints check `req.user.role === 'ADMIN'`
- Quest progress tracked daily, weekly, milestone
- Badge qualification stored as JSON criteria
- Automatic badge awarding on quest completion

### 4. Database Schema (DATA)
**File:** `backend/prisma/schema.prisma`
**Lines:** 2504-2598
**Purpose:** Database models for Quest, Badge, UserQuestProgress, UserQuestStreak, UserBadge

Key models:
```prisma
model Quest {
  id              String   @id @default(uuid())
  title           String
  description     String
  questType       QuestType
  targetValue     Int
  rewardXP        Int
  rewardBadges    String[]  // Array of badge IDs awarded on completion
  isActive        Boolean   @default(true)
  createdAt       DateTime  @default(now())
}

enum QuestType {
  DAILY_HABIT
  DAILY_CIVIC
  WEEKLY_ENGAGEMENT
  MILESTONE
  SPECIAL_EVENT
}

model Badge {
  id               String   @id @default(uuid())
  name             String   @unique
  description      String
  imageUrl         String?
  tier             BadgeTier
  qualificationCriteria Json  // Flexible JSON criteria
  isActive         Boolean  @default(true)
  createdAt        DateTime @default(now())
}

model UserQuestProgress {
  id          String   @id @default(uuid())
  userId      String
  questId     String
  progress    Int      @default(0)
  isCompleted Boolean  @default(false)
  completedAt DateTime?
  lastUpdated DateTime @default(now())
}

model UserBadge {
  id        String   @id @default(uuid())
  userId    String
  badgeId   String
  awardedAt DateTime @default(now())
  awardedBy String?  // Admin who awarded it (if manual)
}
```

### 5. Frontend Integration (HOW - Frontend)
**File:** `frontend/src/js/components/quests.js` (if exists)
**File:** `frontend/src/js/components/badges.js` (if exists)
**Purpose:** Frontend UI components

Frontend patterns:
- Fetch quests on page load or user trigger
- Display progress bars with CSS animations
- Show badge vault with visual thumbnails
- Toast notifications for badge awards
- Admin controls visible only to admin users

## Common Implementation Tasks

### Adding a New Quest Type
1. Read `docs/CIVIC_ENGAGEMENT.md` section 2.1 (Quest Design Principles)
2. Add enum value to `QuestType` in schema.prisma
3. Run migration: `npx prisma migrate dev --name "add_quest_type_X"`
4. Update `backend/src/routes/quests.ts` validation logic
5. Update frontend quest display logic

### Creating a Badge with Qualification Criteria
1. Read `docs/API_QUESTS_BADGES.md` section 2.1 (Badge Creation)
2. Design JSON criteria (examples in docs)
3. Use `POST /api/badges/create` endpoint
4. Test qualification logic with `GET /api/badges/progress/:badgeId`

### Debugging Quest Progress Not Updating
1. Check `UserQuestProgress` table for user+quest record
2. Verify quest `isActive = true`
3. Check `lastUpdated` timestamp (race condition?)
4. Review `backend/src/routes/quests.ts` update-progress logic
5. Check frontend apiCall for errors

## Quick Commands

**Test quest endpoints:**
```bash
# Get daily quests (requires auth)
curl -H "Cookie: token=YOUR_JWT" https://dev-api.unitedwerise.org/api/quests/daily

# Update progress (requires auth)
curl -X POST -H "Cookie: token=YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"questId":"QUEST_ID","incrementValue":1}' \
  https://dev-api.unitedwerise.org/api/quests/update-progress
```

**Test badge endpoints:**
```bash
# Get user's badge vault (requires auth)
curl -H "Cookie: token=YOUR_JWT" https://dev-api.unitedwerise.org/api/badges/vault

# Award badge as admin (requires admin auth)
curl -X POST -H "Cookie: token=ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"userId":"USER_ID","badgeId":"BADGE_ID","reason":"Achievement unlocked"}' \
  https://dev-api.unitedwerise.org/api/badges/award
```

## Related Systems

- **User XP System** - Quests award XP, see `docs/MASTER_DOCUMENTATION.md` section 14
- **Notification System** - Badge awards trigger notifications
- **Analytics** - Quest completion tracked for engagement metrics
- **Admin Dashboard** - Quest/badge management UI at `/admin-dashboard.html`

## Next Steps

After reading documentation, typical workflow:
1. Identify which component you're modifying (quest vs badge, frontend vs backend)
2. Find existing pattern in codebase (grep for similar functionality)
3. Follow established architectural patterns
4. Test on development environment first
5. Update documentation if adding new endpoints or changing behavior

---

**Last Updated:** October 2025
**Documentation Coverage:** 100% (all 19 endpoints documented)
