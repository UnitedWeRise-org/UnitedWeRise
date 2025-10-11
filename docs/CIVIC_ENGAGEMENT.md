# Civic Engagement: Quest & Badge System

**Status**: ✅ Production Ready
**Last Updated**: 2025-10-09
**Feature Launch**: October 2-3, 2025

---

## 🤖 For Claude Code: When to Read This File

**Read this documentation when the user mentions ANY of these keywords:**
- Quest, Badge, Gamification
- Civic Engagement, Streak, Quest System
- Badge Vault, Quest Progress
- "Why do we have quests?" or "What's the purpose of badges?"

**What this file contains:**
- **PHILOSOPHY documentation (WHY)**: This is NOT just an API reference. This file explains the civic engagement philosophy and design rationale behind the Quest & Badge system
- **System design**: Quest types explained (DAILY_HABIT vs DAILY_CIVIC vs WEEKLY_ENGAGEMENT, etc.)
- **Quest categories**: INFORMATION vs PARTICIPATION vs ADVOCACY, etc.
- **Quest requirements schema**: JSON structure for defining quest requirements
- **Quest rewards schema**: JSON structure for defining quest rewards
- **Badge qualification criteria**: How badges are earned (auto-award vs manual)
- **Streak system**: How daily/weekly streaks work
- **Admin workflows**: How to create quests and badges
- **Frontend integration**: QuestProgressTracker and BadgeVault components
- **Best practices**: Quest/badge design principles
- **Implementation examples**: Complete code flows for quest completion and badge awarding

**CRITICAL - This is a PHILOSOPHY doc:**
Unlike `API_QUESTS_BADGES.md` (which documents WHAT endpoints exist), this file explains WHY the quest/badge system exists and HOW it should be used to encourage civic engagement.

**How to use this documentation:**
1. **Check REQUIRED READING in CLAUDE.md** - This file is listed as REQUIRED when implementing quest/badge features
2. **Read sections 1-3 first** - System Overview, Quest System Design, Badge System Design (understand the WHY before coding)
3. **Use the slash command** - Type `/quest-badge-docs` for a quick reference
4. **Read companion files** - This philosophy doc should be read alongside:
   - `docs/API_QUESTS_BADGES.md` (API endpoint documentation - WHAT)
   - `backend/src/routes/quests.ts` (current implementation - HOW)
   - `backend/src/routes/badges.ts` (current implementation - HOW)
   - `backend/prisma/schema.prisma` (lines 2504-2598: database models - DATA)

**Quick navigation:**
- Philosophy & Goals: Lines 45-101
- Quest Types Explained: Lines 129-399 (understand why each type exists)
- Badge Types Explained: Lines 777-862 (understand badge purpose)
- Quest Requirements Schema: Lines 437-556
- Badge Qualification Criteria: Lines 897-1160
- Admin Workflows: Lines 1412-1714
- Frontend Components: Lines 1716-2047
- Troubleshooting: Lines 2617-2795

**Implementation checklist:**
- [ ] Read sections 1-3 to understand the civic engagement philosophy
- [ ] Review quest types to understand which type fits your feature
- [ ] Review badge types to understand badge purpose and value
- [ ] Check existing quests/badges for patterns before creating new ones
- [ ] Follow design principles (lines 2514-2614) when creating quests/badges
- [ ] Test on development environment before deploying
- [ ] Update this file if changing system philosophy or adding new quest/badge types

**When to read this file vs API_QUESTS_BADGES.md:**
- **Read THIS file when**: User asks about quest/badge system design, philosophy, or "why do we have this?"
- **Read API_QUESTS_BADGES.md when**: User asks about specific endpoints, request/response formats, or implementation details

---

## Table of Contents

1. [System Overview](#system-overview)
   - [Purpose & Goals](#purpose--goals)
   - [Architecture](#architecture)
2. [Quest System Design](#quest-system-design)
   - [Philosophy](#philosophy)
   - [Quest Types Explained](#quest-types-explained)
   - [Quest Categories Explained](#quest-categories-explained)
   - [Quest Requirements Schema](#quest-requirements-schema)
   - [Quest Rewards Schema](#quest-rewards-schema)
   - [Streak System](#streak-system)
   - [Quest Generation Algorithm](#quest-generation-algorithm)
3. [Badge System Design](#badge-system-design)
   - [Philosophy](#badge-system-philosophy)
   - [Badge Types](#badge-types)
   - [Qualification Criteria Schema](#qualification-criteria-schema)
   - [Auto-Award System](#auto-award-system)
   - [Manual Award System](#manual-award-system)
   - [Badge Display System](#badge-display-system)
4. [Admin Workflows](#admin-workflows)
   - [Creating a New Quest](#creating-a-new-quest)
   - [Creating a New Badge](#creating-a-new-badge)
   - [Monitoring Quest Completion](#monitoring-quest-completion)
   - [Running Badge Qualification Checks](#running-badge-qualification-checks)
5. [Frontend Integration](#frontend-integration)
   - [QuestProgressTracker Component](#questprogresstracker-component)
   - [BadgeVault Component](#badgevault-component)
   - [Profile Badge Display](#profile-badge-display)
6. [Database Schema Reference](#database-schema-reference)
7. [Implementation Examples](#implementation-examples)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)
10. [Future Enhancements](#future-enhancements)
11. [API Reference](#api-reference)

---

## System Overview

### Purpose & Goals

The Civic Engagement Quest & Badge system was built to transform passive social media consumption into active civic participation. The core philosophy is **"Make Democracy Daily"** - turning civic engagement into a rewarding habit rather than a once-every-four-years event.

**Primary Goals:**

1. **Increase Daily Civic Engagement** - Move beyond election-season participation to daily civic awareness and action
2. **Reward Consistent Participation** - Recognize users who show up consistently, not just during major events
3. **Create Clear Pathways for New Users** - Provide structured onboarding through progressive quest difficulty
4. **Foster Long-Term Habit Formation** - Use gamification psychology to build sustainable civic engagement habits
5. **Recognize Meaningful Achievements** - Award badges that represent real civic contributions, not just participation trophies

**Design Principles:**

- **Accessibility First**: Quests should be achievable by all users regardless of political knowledge or experience
- **Progressive Difficulty**: Guide users from simple information consumption to active civic participation
- **Authentic Engagement**: Reward real civic actions (signing petitions, attending events, informed discussion)
- **Community Building**: Encourage connections between civically-minded users
- **Transparency**: Clear progress tracking and qualification criteria for all achievements

### Architecture

The Quest & Badge system is a **dual-track gamification engine** that runs parallel to the main social platform:

```
┌─────────────────────────────────────────────────────────────┐
│                    User Actions Layer                        │
│  (Posts, Comments, Follows, Petitions, Events, Logins)      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Quest Progress Tracker                          │
│  - Monitors user activities via ActivityType events          │
│  - Updates quest progress in real-time                       │
│  - Triggers quest completion when requirements met           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Reward Distribution Engine                      │
│  - Awards reputation points                                  │
│  - Triggers badge qualification checks                       │
│  - Updates user streaks                                      │
│  - Sends completion notifications                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Badge Qualification System                      │
│  - Evaluates users against badge criteria                    │
│  - Auto-awards qualifying badges                             │
│  - Manages badge display preferences                         │
└─────────────────────────────────────────────────────────────┘
```

**Key Components:**

1. **Quest Service** (`quest.service.ts`) - Core quest logic, progress tracking, streak calculation
2. **Badge Service** (`badge.service.ts`) - Badge creation, qualification checking, awarding logic
3. **Quest Routes** (`quests.ts`) - API endpoints for quest data and progress
4. **Badge Routes** (`badges.ts`) - API endpoints for badge vault and display management
5. **QuestProgressTracker** (`QuestProgressTracker.js`) - Frontend quest display and progress visualization
6. **BadgeVault** (`BadgeVault.js`) - Frontend badge collection and display management

---

## Quest System Design

### Philosophy

**Quests are NOT tasks - they are opportunities.**

The quest system is designed around the principle that civic engagement should feel rewarding, not obligatory. Each quest type serves a specific psychological and behavioral purpose:

- **DAILY_HABIT** quests build routine: "I check in every day"
- **DAILY_CIVIC** quests build agency: "My voice matters"
- **WEEKLY_ENGAGEMENT** quests build consistency: "I'm committed long-term"
- **SPECIAL_EVENT** quests create urgency: "Important things are happening now"
- **EDUCATIONAL** quests build knowledge: "I understand the issues"
- **SOCIAL_ENGAGEMENT** quests build community: "I'm part of something bigger"

### Quest Types Explained

#### **DAILY_HABIT**
**Purpose**: Establish daily check-in behavior and information consumption habits

**Characteristics**:
- Low barrier to entry (reading posts, logging in)
- Small reputation rewards (1-2 points)
- Automatically assigned to all active users
- Refreshes daily

**Examples**:
```json
{
  "title": "Daily Check-In",
  "description": "Start your day by checking in with your community. Read at least 3 posts from your feed to stay informed.",
  "requirements": {
    "type": "READ_POSTS",
    "target": 3,
    "timeframe": "daily"
  },
  "rewards": {
    "reputationPoints": 2,
    "experiencePoints": 10
  }
}
```

**Typical Rewards**: 1-2 reputation points, 10-15 experience points

---

#### **DAILY_CIVIC**
**Purpose**: Drive daily civic actions beyond passive consumption

**Characteristics**:
- Requires user-generated content or civic action
- Medium reputation rewards (3-5 points)
- Variety of action types (post creation, petition signing, commenting)
- Randomly rotated to prevent monotony

**Examples**:
```json
{
  "title": "Voice Your Opinion",
  "description": "Share your thoughts on a local issue or policy. Create a post about something happening in your community.",
  "requirements": {
    "type": "CIVIC_ACTION",
    "target": 1,
    "timeframe": "daily",
    "metadata": {
      "actionType": "POST_CREATED"
    }
  },
  "rewards": {
    "reputationPoints": 3,
    "experiencePoints": 20
  }
}
```

**Typical Rewards**: 3-5 reputation points, 20-30 experience points

**Action Types**:
- `POST_CREATED` - Create a civic-minded post
- `PETITION_SIGNED` - Sign a petition
- `COMMENT_CREATED` - Engage in civic discussion (requires 2 comments)
- `EVENT_RSVP` - RSVP to a civic event

---

#### **WEEKLY_ENGAGEMENT**
**Purpose**: Reward sustained engagement over time, prevent burnout from daily pressure

**Characteristics**:
- Aggregates daily quest completions
- High reputation rewards (10+ points)
- Often tied to badge unlocks
- Resets weekly on Sunday night

**Examples**:
```json
{
  "title": "Weekly Civic Champion",
  "description": "Complete at least 5 daily quests this week to maintain your civic engagement streak.",
  "requirements": {
    "type": "COMPLETE_QUESTS",
    "target": 5,
    "timeframe": "weekly",
    "metadata": {
      "questTypes": ["DAILY_HABIT", "DAILY_CIVIC"]
    }
  },
  "rewards": {
    "reputationPoints": 10,
    "experiencePoints": 100,
    "badges": ["weekly-champion"]
  }
}
```

**Typical Rewards**: 10-15 reputation points, 100+ experience points, badge progress

---

#### **MONTHLY_CONSISTENCY**
**Purpose**: Recognize long-term commitment and habit formation

**Characteristics**:
- Requires consistent engagement over 30 days
- Very high reputation rewards (20-50 points)
- Often unlocks exclusive badges
- Tracks streak maintenance

**Examples**:
```json
{
  "title": "30-Day Civic Activist",
  "description": "Maintain a daily engagement streak for 30 consecutive days. True change requires sustained effort.",
  "requirements": {
    "type": "STREAK_MAINTENANCE",
    "target": 30,
    "timeframe": "monthly",
    "metadata": {
      "streakType": "daily"
    }
  },
  "rewards": {
    "reputationPoints": 50,
    "badges": ["30-day-activist"],
    "specialRecognition": "Featured User Status"
  }
}
```

**Typical Rewards**: 20-50 reputation points, exclusive badges, special recognition

---

#### **SPECIAL_EVENT**
**Purpose**: Drive participation during critical civic moments

**Characteristics**:
- Time-limited (elections, protests, legislative votes)
- Tied to real-world events
- Often high-value rewards
- Manually created by admins

**Examples**:
```json
{
  "title": "Election Day Turnout",
  "description": "Vote in today's election and share your 'I Voted' post to encourage others.",
  "requirements": {
    "type": "CIVIC_ACTION",
    "target": 1,
    "timeframe": "one_day",
    "metadata": {
      "actionType": "ELECTION_PARTICIPATION",
      "eventDate": "2025-11-05"
    }
  },
  "rewards": {
    "reputationPoints": 25,
    "badges": ["voter-badge-2025"],
    "specialRecognition": "Democracy Defender"
  },
  "startDate": "2025-11-05T00:00:00Z",
  "endDate": "2025-11-05T23:59:59Z"
}
```

**Typical Rewards**: 15-30 reputation points, commemorative badges

---

#### **CIVIC_ACTION**
**Purpose**: Reward specific high-value civic behaviors

**Characteristics**:
- Ongoing availability (not time-limited)
- Requires meaningful civic participation
- Often prerequisites for advanced badges
- Can be completed multiple times

**Examples**:
```json
{
  "title": "Petition Champion",
  "description": "Sign 10 petitions for causes you believe in. Every signature counts toward change.",
  "requirements": {
    "type": "CIVIC_ACTION",
    "target": 10,
    "timeframe": "ongoing",
    "metadata": {
      "actionType": "PETITION_SIGNED"
    }
  },
  "rewards": {
    "reputationPoints": 15,
    "badges": ["petition-champion"]
  }
}
```

**Typical Rewards**: 10-20 reputation points, achievement badges

---

#### **EDUCATIONAL**
**Purpose**: Encourage learning about civic processes and policy issues

**Characteristics**:
- May include reading articles, watching videos, or completing quizzes
- Builds foundation for informed participation
- Often required for advanced civic action quests
- Can include external content

**Examples**:
```json
{
  "title": "Know Your Representatives",
  "description": "Learn about your local, state, and federal representatives. View all their profiles and policy positions.",
  "requirements": {
    "type": "EDUCATIONAL",
    "target": 1,
    "timeframe": "ongoing",
    "metadata": {
      "actionType": "COMPLETE_EDUCATION_MODULE",
      "moduleId": "representatives-101"
    }
  },
  "rewards": {
    "reputationPoints": 5,
    "experiencePoints": 50
  }
}
```

**Typical Rewards**: 5-10 reputation points, knowledge badges

---

#### **SOCIAL_ENGAGEMENT**
**Purpose**: Build connections within the civic community

**Characteristics**:
- Encourages following, friending, and networking
- Particularly important for new users (first 30 days)
- Lower rewards but frequent opportunities
- Builds social capital for future collaboration

**Examples**:
```json
{
  "title": "Build Your Network",
  "description": "Connect with like-minded citizens. Follow or friend request at least 1 new person today.",
  "requirements": {
    "type": "SOCIAL_INTERACTION",
    "target": 1,
    "timeframe": "daily"
  },
  "rewards": {
    "reputationPoints": 1,
    "experiencePoints": 15
  }
}
```

**Typical Rewards**: 1-3 reputation points, social badges

---

### Quest Categories Explained

Categories organize quests by their civic purpose and help users find quests aligned with their interests.

#### **INFORMATION**
**Purpose**: Learning, reading, staying informed
**Examples**: Daily Check-In, Read Policy Briefings, Follow News Topics
**User Persona**: "I want to understand what's happening"

#### **PARTICIPATION**
**Purpose**: Taking civic action, contributing content
**Examples**: Voice Your Opinion, Sign Petitions, Attend Events
**User Persona**: "I want to make a difference"

#### **COMMUNITY**
**Purpose**: Building networks, collaboration, organizing
**Examples**: Build Your Network, Join Discussion Groups, Create Local Initiative
**User Persona**: "I want to work with others"

#### **ADVOCACY**
**Purpose**: Promoting causes, mobilizing support, campaigning
**Examples**: Share Petition, Contact Representative, Organize Rally
**User Persona**: "I want to fight for change"

#### **EDUCATION**
**Purpose**: Deep learning, policy understanding, skill-building
**Examples**: Complete Civics Course, Learn About Ballot Measures, Understand Legislative Process
**User Persona**: "I want to become an expert"

#### **SOCIAL**
**Purpose**: Relationship-building, networking, mentorship
**Examples**: Mentor New User, Form Discussion Group, Connect Local Activists
**User Persona**: "I want to build relationships"

---

### Quest Requirements Schema

Requirements are stored as JSON in the database, allowing flexible and extensible quest definitions.

#### **Base Structure**
```typescript
interface QuestRequirement {
  type: 'LOGIN' | 'READ_POSTS' | 'CIVIC_ACTION' | 'SOCIAL_INTERACTION' | 'COMPLETE_QUESTS';
  target: number;              // How many times action must be performed
  timeframe: 'daily' | 'weekly' | 'monthly' | 'ongoing';
  metadata?: {                 // Optional additional constraints
    categories?: string[];     // Filter by categories
    minDuration?: number;      // Minimum time spent (seconds)
    actionType?: string;       // Specific action required
    questTypes?: string[];     // Types of quests to count
    geographicScope?: string;  // LOCAL, STATE, NATIONAL
  };
}
```

#### **Requirement Type: LOGIN**
Tracks user login activity.

```json
{
  "type": "LOGIN",
  "target": 1,
  "timeframe": "daily"
}
```

**Use Case**: Daily check-in quests

---

#### **Requirement Type: READ_POSTS**
Tracks post views. Typically uses `POST_VIEWED` activity event.

```json
{
  "type": "READ_POSTS",
  "target": 5,
  "timeframe": "daily",
  "metadata": {
    "categories": ["CIVIC", "POLITICAL"],
    "minDuration": 10
  }
}
```

**Use Case**: Information consumption quests

**Metadata Options**:
- `categories`: Only count posts with specific tags
- `minDuration`: Require user to spend at least X seconds viewing

---

#### **Requirement Type: CIVIC_ACTION**
Tracks specific civic behaviors. Requires `metadata.actionType` to specify the action.

```json
{
  "type": "CIVIC_ACTION",
  "target": 1,
  "timeframe": "daily",
  "metadata": {
    "actionType": "PETITION_SIGNED"
  }
}
```

**Valid Action Types**:
- `POST_CREATED` - User creates a post
- `COMMENT_CREATED` - User creates a comment
- `PETITION_SIGNED` - User signs a petition
- `EVENT_RSVP` - User RSVPs to an event
- `ELECTION_PARTICIPATION` - User votes or participates in election
- `REPRESENTATIVE_CONTACTED` - User contacts an official

---

#### **Requirement Type: SOCIAL_INTERACTION**
Tracks relationship-building activities.

```json
{
  "type": "SOCIAL_INTERACTION",
  "target": 3,
  "timeframe": "weekly"
}
```

**Counted Activities**:
- `FOLLOW_ADDED` - User follows another user
- `FRIEND_REQUEST_SENT` - User sends friend request
- `FRIEND_REQUEST_ACCEPTED` - User accepts friend request
- `MESSAGE_SENT` - User sends direct message

---

#### **Requirement Type: COMPLETE_QUESTS**
Meta-requirement: Tracks completion of other quests.

```json
{
  "type": "COMPLETE_QUESTS",
  "target": 5,
  "timeframe": "weekly",
  "metadata": {
    "questTypes": ["DAILY_HABIT", "DAILY_CIVIC"]
  }
}
```

**Use Case**: Weekly/monthly aggregate quests

---

### Quest Rewards Schema

Rewards are distributed immediately upon quest completion.

```typescript
interface QuestReward {
  reputationPoints?: number;      // Added to user's reputation score (max 100)
  badges?: string[];              // Badge IDs to award
  specialRecognition?: string;    // Title or special status
  experiencePoints?: number;      // XP for future leveling system
}
```

#### **Example Reward Structures**

**Simple Daily Quest**:
```json
{
  "reputationPoints": 2,
  "experiencePoints": 10
}
```

**Weekly Achievement**:
```json
{
  "reputationPoints": 10,
  "experiencePoints": 100,
  "badges": ["weekly-champion"]
}
```

**Major Milestone**:
```json
{
  "reputationPoints": 50,
  "badges": ["30-day-activist", "civic-leader"],
  "specialRecognition": "Community Leader",
  "experiencePoints": 500
}
```

**Reputation Point Guidelines**:
- Daily habits: 1-2 points
- Daily civic actions: 3-5 points
- Weekly consistency: 10-15 points
- Monthly achievements: 20-50 points
- Special events: 15-30 points

**Reputation Score Cap**: Maximum 100 to prevent inflation

---

### Streak System

Streaks measure consecutive days or weeks of quest completion, creating accountability and habit formation.

#### **Daily Streaks**

Tracked in `UserQuestStreak` table with timezone-aware date comparison:

```typescript
interface UserQuestStreak {
  currentDailyStreak: number;      // Consecutive days with quest completion
  longestDailyStreak: number;      // Personal best
  lastCompletedDate: DateTime;     // Midnight-normalized date
  totalQuestsCompleted: number;    // Lifetime total
}
```

**Streak Logic**:
1. Quest completed today → Increment if yesterday was completed, reset to 1 if not
2. Grace period: None (builds discipline)
3. Date comparison: Normalized to midnight in user's timezone
4. Longest streak: Updated whenever current streak exceeds it

**Timezone Considerations**:
- All dates stored in UTC
- Normalized to midnight before comparison
- `lastCompletedDate` is set to `00:00:00` of completion day

**Code Reference** (`quest.service.ts:407-474`):
```typescript
private async updateUserStreak(userId: string, questType: QuestType): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);  // Normalize to midnight

  // Calculate days since last completion
  const daysSinceLastCompletion = lastCompleted
    ? Math.floor((today.getTime() - lastCompleted.getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  if (daysSinceLastCompletion === 1) {
    newDailyStreak++;  // Consecutive day
  } else if (daysSinceLastCompletion > 1) {
    newDailyStreak = 1;  // Streak broken
  }
}
```

---

#### **Weekly Streaks**

Similar logic for weekly consistency:

```typescript
currentWeeklyStreak: number;     // Consecutive weeks with 5+ quest completions
longestWeeklyStreak: number;     // Personal best
```

**Weekly Streak Calculation**:
- Week starts Sunday 00:00:00 UTC
- Requires 5 quest completions to count as "complete week"
- Compared by week number: `Math.floor(date.getTime() / (1000 * 60 * 60 * 24 * 7))`

---

### Quest Generation Algorithm

The quest generation system creates **personalized daily quests** based on user profile, history, and lifecycle stage.

#### **Daily Quest Assignment Flow**

```
User requests daily quests
       ↓
Check if daily quests already exist for today
       ↓
       ├─→ YES: Return existing quests
       ↓
       └─→ NO: Generate new daily quests
              ↓
       ┌──────┴─────────┐
       ↓                ↓
Always assign:    Conditionally assign:
- Daily Habit    - Daily Civic (interest-based)
- Daily Civic    - Social Quest (if user < 30 days old)
                 - Educational (if low knowledge score)
```

#### **Selection Criteria**

1. **Daily Habit Quest** (Always assigned)
   - Single standardized quest: "Daily Check-In"
   - Created on first request, reused thereafter
   - Requirement: Read 3 posts

2. **Daily Civic Quest** (Always assigned)
   - Randomized from pool of 3 options:
     - Voice Your Opinion (create post)
     - Support a Cause (sign petition)
     - Engage in Discussion (2 comments)
   - Selection: Random on each generation
   - Variation prevents monotony

3. **Social Engagement Quest** (Conditional: New users only)
   - Assigned if `userAge < 30 days`
   - Purpose: Build network during onboarding
   - Requirement: Follow/friend 1 person

4. **Educational Quest** (Future: Conditional based on profile)
   - Not yet implemented
   - Planned: Assign if user has low civic knowledge score

#### **User Age Calculation**

```typescript
const userAge = Math.floor(
  (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
);

if (userAge < 30) {
  // Assign social quest for onboarding
}
```

#### **Difficulty Scaling** (Future Enhancement)

Currently, all daily quests are fixed difficulty. Planned progression:

- **Days 1-7**: DAILY_HABIT only (ease in)
- **Days 8-30**: DAILY_HABIT + DAILY_CIVIC
- **Days 31+**: DAILY_HABIT + DAILY_CIVIC + WEEKLY_ENGAGEMENT
- **Days 90+**: Add MONTHLY_CONSISTENCY

#### **Interest-Based Selection** (Future Enhancement)

The system reads `user.interests` array but doesn't yet use it for quest personalization. Planned implementation:

```typescript
const civicQuests = await this.getQuestsMatchingInterests(user.interests);
const selectedQuest = civicQuests[Math.floor(Math.random() * civicQuests.length)];
```

---

## Badge System Design

### Badge System Philosophy

**Badges are permanent symbols of civic achievement, not participation trophies.**

Unlike quests (which are opportunities), badges are **accomplishments**. They represent:

1. **Meaningful Milestones**: "I've completed 100 quests" is significant
2. **Skill Mastery**: "I understand legislative process" shows expertise
3. **Civic Impact**: "I've organized 3 local events" demonstrates leadership
4. **Community Recognition**: Public display of civic credibility

**Badge Design Principles**:

- **Scarcity Creates Value**: Limited badges (not everyone gets everything)
- **Progressive Difficulty**: Easy starter badges → challenging mastery badges
- **Visual Hierarchy**: Rarity (Common → Legendary) visible in design
- **Display as Status**: Users choose which badges appear on their nameplate
- **Auto-Award When Possible**: Reduce admin burden, ensure fairness

---

### Badge Types

#### **Milestone Badges**
**Purpose**: Recognize quantitative achievements

**Characteristics**:
- Based on counts (quests completed, posts created, petitions signed)
- Clear numeric thresholds
- Automatic qualification checking
- Progressive tiers (Bronze → Silver → Gold → Platinum)

**Examples**:
- **Quest Completer**: Complete 10 / 50 / 100 / 500 quests
- **Petition Champion**: Sign 10 / 25 / 50 / 100 petitions
- **Community Builder**: Make 10 / 50 / 100 / 250 friends
- **Content Creator**: Create 25 / 100 / 500 / 1000 posts

**Qualification Criteria**:
```json
{
  "type": "QUEST_COMPLETION",
  "requirements": {
    "questCompletionCount": 100
  }
}
```

---

#### **Skill Badges**
**Purpose**: Recognize demonstrated expertise in civic areas

**Characteristics**:
- Based on quality metrics (engagement, impact, knowledge)
- May require manual verification
- Often tied to educational content
- High prestige value

**Examples**:
- **Policy Expert**: Complete all policy education modules + create 10 policy posts with 100+ views
- **Legislative Scholar**: Demonstrate understanding of bill tracking, voting records, and committee structures
- **Advocacy Leader**: Organize 3 successful petition campaigns (500+ signatures each)
- **Debate Champion**: Participate in 25 civil discussions with high engagement

**Qualification Criteria**:
```json
{
  "type": "CUSTOM_ENDPOINT",
  "requirements": {
    "customEndpoint": "/api/verify-policy-expert",
    "customParams": {
      "minModulesCompleted": 10,
      "minPolicyPosts": 10,
      "minAvgViews": 100
    }
  }
}
```

---

#### **Participation Badges**
**Purpose**: Encourage ongoing civic behaviors

**Characteristics**:
- Awarded for sustained activity
- Often time-based (daily streaks, weekly participation)
- Renewable or tiered
- Visible social proof

**Examples**:
- **Daily Activist**: 7 / 14 / 30 / 60 / 100 day quest streak
- **Weekly Champion**: Complete weekly quest 4 weeks in a row
- **Election Warrior**: Vote in 3 / 5 / 10 consecutive elections
- **Town Hall Regular**: Attend 5 / 10 / 20 civic events

**Qualification Criteria**:
```json
{
  "type": "QUEST_COMPLETION",
  "requirements": {
    "streakDays": 30
  }
}
```

---

#### **Special Event Badges**
**Purpose**: Commemorate participation in historic or critical civic moments

**Characteristics**:
- Limited-time availability
- Cannot be earned after event ends
- High collectible value
- Often tied to real-world events

**Examples**:
- **Election Day 2025**: Voted and shared proof on November 5, 2025
- **March for Science**: Attended March for Science rally on April 22, 2025
- **Budget Advocacy**: Participated in city budget public comment period
- **Supreme Court Watch**: Engaged during landmark SCOTUS decision

**Qualification Criteria**:
```json
{
  "type": "CIVIC_ACTION",
  "requirements": {
    "activityTypes": ["ELECTION_PARTICIPATION"],
    "timeframe": "1d"
  },
  "metadata": {
    "eventDate": "2025-11-05",
    "oneTimeOnly": true
  }
}
```

---

### Qualification Criteria Schema

Badge qualification criteria define **when a user has earned a badge**. The system supports multiple criteria types for flexibility.

#### **Base Structure**

```typescript
interface BadgeQualificationCriteria {
  type: 'QUEST_COMPLETION' | 'USER_ACTIVITY' | 'CIVIC_ACTION' | 'SOCIAL_METRIC' | 'CUSTOM_ENDPOINT';
  requirements: {
    // Quest-based criteria
    questTypes?: string[];          // Only count these quest types
    questCompletionCount?: number;  // Total quests completed
    streakDays?: number;            // Consecutive day streak

    // Activity-based criteria
    activityTypes?: string[];       // Activity types to count
    activityCount?: number;         // Minimum activity count
    timeframe?: string;             // '7d', '30d', 'all_time'

    // Civic action criteria
    petitionsSigned?: number;
    eventsAttended?: number;
    postsCreated?: number;

    // Social metric criteria
    reputationScore?: number;
    followersCount?: number;
    friendsCount?: number;

    // Custom endpoint for complex logic
    customEndpoint?: string;
    customParams?: any;
  };
}
```

---

#### **QUEST_COMPLETION Criteria**

Awards badges based on quest completion statistics.

**Example: Quest Completionist**
```json
{
  "type": "QUEST_COMPLETION",
  "requirements": {
    "questCompletionCount": 100
  }
}
```

**Example: Streak Master**
```json
{
  "type": "QUEST_COMPLETION",
  "requirements": {
    "streakDays": 30
  }
}
```

**Qualification Logic** (`badge.service.ts:197-222`):
```typescript
private async checkQuestCriteria(userId: string, requirements: any): Promise<boolean> {
  // Check total completed quests
  if (requirements.questCompletionCount) {
    const completedQuests = await prisma.userQuestProgress.count({
      where: { userId, completed: true }
    });
    if (completedQuests < requirements.questCompletionCount) return false;
  }

  // Check current streak
  if (requirements.streakDays) {
    const streak = await prisma.userQuestStreak.findUnique({ where: { userId } });
    if (!streak || streak.currentDailyStreak < requirements.streakDays) return false;
  }

  return true;
}
```

---

#### **USER_ACTIVITY Criteria**

Awards badges based on general platform activity.

**Example: Active Commenter**
```json
{
  "type": "USER_ACTIVITY",
  "requirements": {
    "activityTypes": ["COMMENT_CREATED"],
    "activityCount": 100,
    "timeframe": "30d"
  }
}
```

**Example: Engagement Champion**
```json
{
  "type": "USER_ACTIVITY",
  "requirements": {
    "activityTypes": ["LIKE_ADDED", "COMMENT_CREATED", "SHARE_ADDED"],
    "activityCount": 500,
    "timeframe": "all_time"
  }
}
```

**Qualification Logic** (`badge.service.ts:224-243`):
```typescript
private async checkActivityCriteria(userId: string, requirements: any): Promise<boolean> {
  const whereClause: any = { userId };

  // Filter by activity types
  if (requirements.activityTypes) {
    whereClause.activityType = { in: requirements.activityTypes };
  }

  // Apply timeframe filter
  if (requirements.timeframe && requirements.timeframe !== 'all_time') {
    const days = parseInt(requirements.timeframe.replace('d', ''));
    const since = new Date();
    since.setDate(since.getDate() - days);
    whereClause.createdAt = { gte: since };
  }

  const activityCount = await prisma.userActivity.count({ where: whereClause });
  return activityCount >= (requirements.activityCount || 0);
}
```

---

#### **CIVIC_ACTION Criteria**

Awards badges based on specific civic behaviors tracked separately from general activity.

**Example: Petition Activist**
```json
{
  "type": "CIVIC_ACTION",
  "requirements": {
    "petitionsSigned": 25
  }
}
```

**Example: Event Organizer**
```json
{
  "type": "CIVIC_ACTION",
  "requirements": {
    "eventsAttended": 10,
    "postsCreated": 50
  }
}
```

**Qualification Logic** (`badge.service.ts:245-274`):
Uses Prisma `_count` to efficiently check related models:

```typescript
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    _count: {
      select: {
        petitionSignatures: true,
        eventRSVPs: true,
        posts: true
      }
    }
  }
});

if (requirements.petitionsSigned && user._count.petitionSignatures < requirements.petitionsSigned) {
  return false;
}
```

---

#### **SOCIAL_METRIC Criteria**

Awards badges based on user's social standing and reputation.

**Example: Influencer**
```json
{
  "type": "SOCIAL_METRIC",
  "requirements": {
    "followersCount": 500,
    "reputationScore": 85
  }
}
```

**Example: Community Leader**
```json
{
  "type": "SOCIAL_METRIC",
  "requirements": {
    "reputationScore": 95,
    "friendsCount": 100
  }
}
```

**Qualification Logic** (`badge.service.ts:276-309`):
```typescript
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: {
    reputationScore: true,
    followersCount: true,
    _count: {
      select: {
        receivedFriendRequests: { where: { status: 'ACCEPTED' } },
        sentFriendRequests: { where: { status: 'ACCEPTED' } }
      }
    }
  }
});

// Calculate total friends (sent + received accepted requests)
const friendsCount = user._count.receivedFriendRequests + user._count.sentFriendRequests;

// Check all requirements
if (requirements.reputationScore && (user.reputationScore || 0) < requirements.reputationScore) {
  return false;
}
```

---

#### **CUSTOM_ENDPOINT Criteria**

For complex qualification logic that doesn't fit standard patterns.

**Example: Policy Expert**
```json
{
  "type": "CUSTOM_ENDPOINT",
  "requirements": {
    "customEndpoint": "/api/verify-policy-expert",
    "customParams": {
      "minModulesCompleted": 10,
      "minPolicyPosts": 10,
      "minAvgEngagement": 50
    }
  }
}
```

**Current Status**: Placeholder implementation (always returns `false`)
**Future Enhancement**: Implement microservice for custom badge logic

---

### Auto-Award System

The auto-award system runs **bulk qualification checks** to ensure users receive badges as soon as they qualify.

#### **How It Works**

1. Admin triggers qualification check (manual or scheduled)
2. System fetches all active users (last seen within 30 days)
3. For each user, check against all auto-awardable badges
4. Award badges to qualifying users
5. Send notification for each badge earned

**Code Reference** (`badge.service.ts:318-361`):

```typescript
async runBadgeQualificationChecks(): Promise<number> {
  // Get active users (last 30 days)
  const activeUsers = await prisma.user.findMany({
    where: {
      lastSeenAt: { gte: thirtyDaysAgo }
    },
    select: { id: true }
  });

  // Get auto-awardable badges
  const activeBadges = await prisma.badge.findMany({
    where: {
      isActive: true,
      isAutoAwarded: true
    }
  });

  let badgesAwarded = 0;

  // Check each user against each badge
  for (const user of activeUsers) {
    for (const badge of activeBadges) {
      // Skip if user already has badge
      const alreadyHas = await prisma.userBadge.findUnique({
        where: {
          userId_badgeId: { userId: user.id, badgeId: badge.id }
        }
      });

      if (!alreadyHas && await this.checkUserQualifications(user.id, badge.id)) {
        await this.awardBadge(user.id, badge.id, undefined, 'Automatically awarded for meeting criteria');
        badgesAwarded++;
      }
    }
  }

  return badgesAwarded;
}
```

#### **Triggering Auto-Award**

**Manual (Admin Dashboard)**:
```bash
POST /api/badges/check-qualifications
Authorization: Bearer <admin-token>
```

**Scheduled (Cron Job)** - Future implementation:
```bash
# Run daily at 2 AM UTC
0 2 * * * curl -X POST https://api.unitedwerise.org/api/badges/check-qualifications
```

**Performance Considerations**:
- Current implementation: O(users × badges) - not scalable beyond 10k users
- Future: Incremental checking triggered by user actions
- Future: Background job queue for qualification checks

---

### Manual Award System

Admins can manually award badges for achievements not captured by automated criteria.

#### **Use Cases**

- **One-time recognitions**: Featured speaker at town hall
- **Subjective achievements**: Excellence in civil discourse
- **Special contributions**: Identified misinformation, helped onboard new users
- **Beta tester rewards**: Early adopters, bug reporters

#### **Manual Award Flow**

1. Admin identifies deserving user
2. Admin navigates to Badges admin panel
3. Select badge and user
4. Provide reason for award (recorded for transparency)
5. Badge awarded, user notified

**API Endpoint**:
```bash
POST /api/badges/award
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "userId": "cm2abcd1234",
  "badgeId": "cm2xyz9876",
  "reason": "Exceptional leadership during city council public comment campaign"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "cm2userBadge123",
    "userId": "cm2abcd1234",
    "badgeId": "cm2xyz9876",
    "earnedAt": "2025-10-09T14:30:00Z",
    "isDisplayed": false,
    "awardedBy": "cm2admin456",
    "awardReason": "Exceptional leadership during city council public comment campaign"
  }
}
```

**Database Record** (`badge.service.ts:104-162`):
```typescript
const userBadge = await prisma.userBadge.create({
  data: {
    userId,
    badgeId,
    awardedBy,        // Admin user ID
    awardReason: reason
  }
});

// Notify user
await prisma.notification.create({
  data: {
    type: 'REACTION',
    senderId: awardedBy || 'system',
    receiverId: userId,
    message: `You earned the "${badge.name}" badge!`
  }
});
```

---

### Badge Display System

Users can customize which badges appear on their public profile and next to their name in posts/comments.

#### **Display Limits**

- **Maximum displayed badges**: 5 (prevents nameplate clutter)
- **User-controlled ordering**: Drag-and-drop in BadgeVault
- **Public visibility toggle**: Hide badge collection from other users

#### **Nameplate Integration**

Badges appear as small icons next to username in:
- Post author byline
- Comment author byline
- User profile header
- Leaderboards and rankings
- Direct message conversations

**Visual Hierarchy**:
```
┌────────────────────────────────────────┐
│  👤 Username                            │
│     🏆 🎖️ ⭐ 🔥 📚                      │
│     "Daily Activist | Policy Expert"    │
└────────────────────────────────────────┘
```

#### **Badge Vault Interface**

The `BadgeVault` component provides:

1. **Display Settings Tab**:
   - Nameplate preview showing current display
   - Drag-to-reorder badges
   - Add/remove badges from display
   - Live preview of changes

2. **Full Collection Tab**:
   - Grid view of all earned badges
   - Categorized by badge type
   - Rarity indicators
   - Earned date and progress stats

3. **Preferences Tab**:
   - Public visibility toggle
   - Auto-prioritize rare badges
   - Category preferences

**Code Reference** (`BadgeVault.js:302-328`):
```javascript
renderDisplayTab() {
  const displayedBadges = this.userBadges
    .filter(b => b.isDisplayed)
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  return `
    <div class="nameplate-preview">
      <div class="preview-badges">
        ${displayedBadges.map(userBadge => `
          <img src="${userBadge.badge.imageUrl}"
               alt="${userBadge.badge.name}"
               class="preview-badge"
               title="${userBadge.badge.name}">
        `).join('')}
      </div>
    </div>
  `;
}
```

#### **Display State Persistence**

Badge display preferences are saved via auto-save:

**API Endpoint**:
```bash
PUT /api/badges/display
Authorization: Bearer <token>
Content-Type: application/json

{
  "badgeId": "cm2badge123",
  "isDisplayed": true,
  "displayOrder": 2
}
```

**Auto-save Logic** (`BadgeVault.js:64-104`):
```javascript
setupAutoSave() {
  // Auto-save changes every 3 seconds when dirty
  setInterval(() => {
    if (this.isDirty) {
      this.saveBadgeSettings();
    }
  }, 3000);
}
```

---

## Admin Workflows

### Creating a New Quest

#### **Step-by-Step Guide**

1. **Define Quest Purpose**
   - What behavior are you trying to encourage?
   - Is this daily, weekly, or one-time?
   - Who is the target audience?

2. **Choose Quest Type & Category**
   - Type: DAILY_HABIT, DAILY_CIVIC, WEEKLY_ENGAGEMENT, etc.
   - Category: INFORMATION, PARTICIPATION, COMMUNITY, etc.

3. **Define Requirements**
   ```json
   {
     "type": "CIVIC_ACTION",
     "target": 1,
     "timeframe": "daily",
     "metadata": {
       "actionType": "PETITION_SIGNED"
     }
   }
   ```

4. **Set Rewards**
   ```json
   {
     "reputationPoints": 3,
     "experiencePoints": 20,
     "badges": []  // Optional: badge IDs
   }
   ```

5. **Configure Display**
   - Title: Clear, action-oriented ("Sign a Petition for Change")
   - Description: Inspiring, explains WHY it matters
   - Short Description: <50 chars for quest lists
   - Display Order: Lower numbers appear first

6. **API Call**
   ```bash
   POST /api/quests/create
   Authorization: Bearer <admin-token>
   Content-Type: application/json

   {
     "type": "DAILY_CIVIC",
     "category": "PARTICIPATION",
     "title": "Support a Local Cause",
     "description": "Find a petition for a local issue you care about and add your signature. Every voice counts!",
     "shortDescription": "Sign a local petition",
     "requirements": {
       "type": "CIVIC_ACTION",
       "target": 1,
       "timeframe": "daily",
       "metadata": {
         "actionType": "PETITION_SIGNED",
         "geographicScope": "LOCAL"
       }
     },
     "rewards": {
       "reputationPoints": 3,
       "experiencePoints": 25
     },
     "timeframe": "DAILY",
     "displayOrder": 5,
     "isActive": true
   }
   ```

7. **Verify Creation**
   ```bash
   GET /api/quests/all
   ```

#### **Example Quest: Election Day Turnout**

```json
{
  "type": "SPECIAL_EVENT",
  "category": "PARTICIPATION",
  "title": "Vote in the 2025 General Election",
  "description": "Your vote is your voice in democracy. Vote today and share your participation to encourage others!",
  "shortDescription": "Vote in today's election",
  "requirements": {
    "type": "CIVIC_ACTION",
    "target": 1,
    "timeframe": "one_day",
    "metadata": {
      "actionType": "ELECTION_PARTICIPATION"
    }
  },
  "rewards": {
    "reputationPoints": 25,
    "experiencePoints": 100,
    "badges": ["voter-2025"],
    "specialRecognition": "Election Day Voter 2025"
  },
  "timeframe": "LIMITED_TIME",
  "startDate": "2025-11-05T00:00:00Z",
  "endDate": "2025-11-05T23:59:59Z",
  "isActive": true
}
```

---

### Creating a New Badge

#### **Step-by-Step Guide**

1. **Design Badge Image**
   - Size: 256×256px PNG with transparency
   - Style: Match existing badge aesthetic
   - Rarity visual cues: Border color/effects

2. **Define Qualification Criteria**
   ```json
   {
     "type": "QUEST_COMPLETION",
     "requirements": {
       "questCompletionCount": 50,
       "streakDays": 7
     }
   }
   ```

3. **Write Badge Description**
   - Clear achievement statement
   - Explains HOW to earn it
   - Inspiring tone

4. **Configure Settings**
   - `isAutoAwarded`: true (automatic) or false (manual only)
   - `maxAwards`: null (unlimited) or number (limited edition)
   - `displayOrder`: Controls sort order in badge vault

5. **Upload via API**
   ```bash
   POST /api/badges/create
   Authorization: Bearer <admin-token>
   Content-Type: multipart/form-data

   name: "Quest Marathon Champion"
   description: "Complete 50 quests and maintain a 7-day streak. True dedication to civic engagement!"
   qualificationCriteria: {
     "type": "QUEST_COMPLETION",
     "requirements": {
       "questCompletionCount": 50,
       "streakDays": 7
     }
   }
   image: <file upload: badge-marathon.png>
   isAutoAwarded: true
   displayOrder: 10
   ```

6. **Verify Upload**
   ```bash
   GET /api/badges/all
   ```

7. **Run Initial Qualification Check**
   ```bash
   POST /api/badges/check-qualifications
   ```

#### **Example Badge: 30-Day Activist**

```bash
POST /api/badges/create

name: "30-Day Activist"
description: "Maintain a 30-day consecutive quest completion streak. You've made civic engagement a daily habit!"
qualificationCriteria: {
  "type": "QUEST_COMPLETION",
  "requirements": {
    "streakDays": 30
  }
}
image: <30-day-activist.png>
isAutoAwarded: true
maxAwards: null
displayOrder: 20
```

---

### Monitoring Quest Completion

#### **Quest Analytics Endpoint**

```bash
GET /api/quests/analytics
Authorization: Bearer <admin-token>
```

**Response Structure**:
```json
{
  "success": true,
  "data": {
    "totalQuests": 25,
    "activeQuests": 18,
    "questProgress": [
      {
        "questId": "cm2quest123",
        "completed": true,
        "count": 1523
      },
      {
        "questId": "cm2quest123",
        "completed": false,
        "count": 892
      }
    ],
    "streakStats": {
      "_avg": {
        "currentDailyStreak": 4.2,
        "longestDailyStreak": 12.8,
        "totalQuestsCompleted": 34.5
      },
      "_max": {
        "currentDailyStreak": 87,
        "longestDailyStreak": 120,
        "totalQuestsCompleted": 856
      }
    },
    "completionRates": [
      {
        "questId": "cm2quest123",
        "completed": true,
        "count": 1523,
        "completionRate": 63.1  // Calculated: 1523 / (1523 + 892)
      }
    ]
  }
}
```

#### **Key Metrics to Monitor**

1. **Completion Rate**: `completedCount / (completedCount + inProgressCount)`
   - Target: >60% for daily quests
   - <40% indicates quest is too difficult

2. **Average Streak**: Indicator of sustained engagement
   - Target: >7 days average
   - Declining average = user burnout

3. **Quest Popularity**: Total attempts (completed + in-progress)
   - Low attempts = quest not visible or unappealing
   - High attempts + low completion = difficulty issue

4. **Longest Streak**: Indicator of top user engagement
   - Target: >30 days for healthy community
   - <14 days = need better retention mechanics

---

### Running Badge Qualification Checks

#### **When to Run Checks**

1. **After Creating New Badge**: Retroactively award to qualifying users
2. **Daily Scheduled Job**: Catch users who recently qualified
3. **After Major Quest Milestones**: Check for streak-based badges
4. **Manual Trigger**: When investigating missing badge awards

#### **Trigger Endpoint**

```bash
POST /api/badges/check-qualifications
Authorization: Bearer <admin-token>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "badgesAwarded": 47
  },
  "message": "47 badges awarded based on qualification criteria"
}
```

#### **Performance Considerations**

Current implementation checks **all active users** against **all auto-awardable badges**:

- **Time Complexity**: O(users × badges)
- **Current Scale**: ~1000 users × ~20 badges = 20,000 checks
- **Execution Time**: ~30-60 seconds

**Scaling Strategy** (when users > 10k):
- Incremental checking: Only check users with recent activity
- Event-driven awards: Trigger checks on quest completion
- Background job queue: Asynchronous processing

---

## Frontend Integration

### QuestProgressTracker Component

**Purpose**: Display daily quests, track progress, and celebrate completions

**Location**: `frontend/src/components/QuestProgressTracker.js`

#### **Key Features**

1. **Auto-Loading**: Fetches quest data on page load and every 5 minutes
2. **Real-Time Updates**: Listens for user activity events
3. **Progress Visualization**: Shows completion percentage and individual quest progress
4. **Streak Display**: Highlights current streak with fire emoji 🔥
5. **Completion Celebration**: Confetti animation and modal on quest completion

#### **Component Structure**

```javascript
class QuestProgressTracker {
  constructor() {
    this.userQuests = [];         // Current quests
    this.userStreaks = {};        // Streak data
    this.isLoading = false;
    this.refreshInterval = null;
  }

  async init() {
    await this.loadQuestData();
    this.refreshInterval = setInterval(() => this.loadQuestData(), 5 * 60 * 1000);
    this.setupActivityListeners();
  }

  async loadQuestData() {
    const [questsResponse, streaksResponse] = await Promise.all([
      window.apiCall('/quests/daily'),
      window.apiCall('/quests/streaks')
    ]);
    // Update component state
    this.render();
  }
}
```

#### **Data Flow**

```
Page Load
    ↓
QuestProgressTracker.init()
    ↓
Fetch /quests/daily + /quests/streaks
    ↓
Render dashboard
    ↓
    ├─→ Setup 5-min refresh interval
    └─→ Setup activity event listeners
         ↓
    User performs action (post, comment, etc.)
         ↓
    Activity event dispatched
         ↓
    Reload quest data after 1s delay
         ↓
    Check for quest completion
         ↓
    Show celebration animation if completed
```

#### **HTML Integration**

```html
<!-- In main page HTML -->
<div id="quest-progress-container"></div>

<script type="module">
  import QuestProgressTracker from './components/QuestProgressTracker.js';
  const tracker = new QuestProgressTracker();
</script>
```

#### **Rendered Dashboard**

```html
<div class="quest-dashboard">
  <div class="quest-header">
    <h3>🎯 Today's Civic Challenges</h3>
    <div class="streak-indicator">
      <span class="streak-icon">🔥</span>
      <span class="streak-count">7</span>
      <span class="streak-label">day streak</span>
    </div>
  </div>

  <div class="progress-summary">
    <div class="progress-bar">
      <div class="progress-fill" style="width: 66%"></div>
    </div>
    <span>Daily Progress: 2/3 (66%)</span>
  </div>

  <div class="quest-list">
    <!-- Individual quest cards -->
  </div>
</div>
```

#### **Quest Card Structure**

```html
<div class="quest-card completed" data-quest-id="cm2quest123">
  <div class="quest-icon-badge">📖</div>

  <div class="quest-content">
    <h4>Daily Check-In</h4>
    <p>Read 3 posts from your feed to stay informed</p>

    <div class="quest-progress-section">
      <span>3 / 3 posts read</span>
      <div class="mini-progress-bar">
        <div class="mini-progress-fill" style="width: 100%"></div>
      </div>
    </div>
  </div>

  <div class="quest-rewards">
    <div class="reward-item">⭐ +2</div>
    <div class="completion-badge">✅</div>
  </div>
</div>
```

---

### BadgeVault Component

**Purpose**: Badge collection management and display customization

**Location**: `frontend/src/components/BadgeVault.js`

#### **Key Features**

1. **Badge Collection Display**: Grid view of all earned badges
2. **Nameplate Customization**: Choose up to 5 badges for public display
3. **Display Ordering**: Drag-to-reorder displayed badges
4. **Rarity Indicators**: Visual hierarchy by badge rarity
5. **Auto-Save**: Persists display preferences every 3 seconds

#### **Component Structure**

```javascript
class BadgeVault {
  constructor() {
    this.userBadges = [];         // Earned badges
    this.availableBadges = [];    // All platform badges
    this.vaultSettings = {
      publicVisibility: true,
      categoryPreference: ['CIVIC', 'SOCIAL'],
      rarityPriority: true
    };
    this.isDirty = false;
  }

  async init() {
    await this.loadBadgeData();
    this.setupAutoSave();
  }

  showVault() {
    // Create modal overlay
    const modal = document.createElement('div');
    modal.className = 'badge-vault-modal modal-overlay';
    modal.innerHTML = this.renderVaultModal();
    document.body.appendChild(modal);
  }
}
```

#### **Vault Tabs**

**1. Display Settings Tab**
- Nameplate preview showing current display
- List of displayed badges with reordering controls
- Grid of available badges to add

**2. Full Collection Tab**
- All earned badges organized by category
- Collection stats (X/Y badges earned)
- Earned dates and rarity indicators

**3. Preferences Tab**
- Public visibility toggle
- Auto-prioritize rare badges
- Category preferences

#### **Display Management**

```javascript
toggleBadgeDisplay(badgeId) {
  const badge = this.userBadges.find(b => b.badgeId === badgeId);
  const currentDisplayed = this.userBadges.filter(b => b.isDisplayed);

  if (badge.isDisplayed) {
    // Remove from display
    badge.isDisplayed = false;
    this.reorderDisplayBadges();
  } else {
    // Add to display (if under 5-badge limit)
    if (currentDisplayed.length < 5) {
      badge.isDisplayed = true;
      badge.displayOrder = currentDisplayed.length + 1;
    } else {
      alert('You can only display up to 5 badges at once');
      return;
    }
  }

  this.isDirty = true;
  this.renderBadgeVault();
}
```

#### **Opening the Vault**

```html
<!-- In user profile or navbar -->
<button onclick="badgeVault.showVault()">
  🏆 Badge Vault
</button>
```

#### **Auto-Save Logic**

```javascript
setupAutoSave() {
  setInterval(() => {
    if (this.isDirty) {
      this.saveBadgeSettings();
    }
  }, 3000);
}

async saveBadgeSettings() {
  const displayBadges = this.userBadges
    .filter(b => b.isDisplayed)
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .slice(0, 5);

  const response = await window.apiCall('/badges/display', 'POST', {
    displayBadges: displayBadges.map((b, index) => ({
      badgeId: b.badgeId,
      displayOrder: index + 1,
      isDisplayed: true
    }))
  });

  if (response.ok) {
    this.isDirty = false;
  }
}
```

---

### Profile Badge Display

**Location**: User profile page, post bylines, comment author lines

#### **Integration Points**

1. **User Profile Header**
   ```html
   <div class="profile-header">
     <img src="avatar.jpg" class="profile-avatar">
     <div class="profile-info">
       <h2>Username</h2>
       <div class="profile-badges">
         <img src="badge1.png" alt="Badge Name" class="profile-badge">
         <img src="badge2.png" alt="Badge Name" class="profile-badge">
         <!-- Max 5 badges -->
       </div>
     </div>
   </div>
   ```

2. **Post Byline**
   ```html
   <div class="post-author">
     <img src="avatar.jpg" class="author-avatar">
     <div class="author-info">
       <span class="author-name">Username</span>
       <div class="author-badges">
         🏆 🎖️ ⭐
       </div>
     </div>
   </div>
   ```

3. **Comment Author**
   ```html
   <div class="comment-header">
     <img src="avatar.jpg" class="comment-avatar">
     <span class="comment-author">Username</span>
     <span class="comment-badges">🏆⭐</span>
   </div>
   ```

#### **Fetching User Badges for Display**

```javascript
// When rendering another user's profile
const response = await window.apiCall(`/badges/user/${userId}`);

if (response.ok && response.data.success) {
  const badges = response.data.data.displayedBadges;
  renderProfileBadges(badges);
}

function renderProfileBadges(badges) {
  const container = document.getElementById('profile-badges');
  container.innerHTML = badges
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map(userBadge => `
      <img src="${userBadge.badge.imageUrl}"
           alt="${userBadge.badge.name}"
           title="${userBadge.badge.name}"
           class="profile-badge ${userBadge.badge.rarity?.toLowerCase()}">
    `).join('');
}
```

---

## Database Schema Reference

### Quest Model

```prisma
model Quest {
  id               String              @id @default(cuid())
  type             QuestType           // DAILY_HABIT, DAILY_CIVIC, etc.
  category         QuestCategory       // INFORMATION, PARTICIPATION, etc.
  title            String
  description      String              @db.Text
  shortDescription String?             // For quest lists
  requirements     Json                // Flexible requirement definition
  rewards          Json                // Points, badges, recognition
  timeframe        QuestTimeframe      // DAILY, WEEKLY, MONTHLY, etc.
  displayOrder     Int                 @default(0)
  isActive         Boolean             @default(true)
  startDate        DateTime?           // For special events
  endDate          DateTime?           // For limited-time quests
  createdAt        DateTime            @default(now())
  updatedAt        DateTime            @updatedAt
  createdBy        String?             // Admin who created
  userProgress     UserQuestProgress[]

  @@index([type])
  @@index([isActive])
  @@index([startDate, endDate])
}
```

**Field Explanations**:
- `type`: Quest behavioral category (what habit it builds)
- `category`: Civic category (what area of engagement)
- `requirements`: JSON containing `QuestRequirement` structure
- `rewards`: JSON containing `QuestReward` structure
- `displayOrder`: Lower numbers appear first in quest lists
- `startDate/endDate`: For time-limited special event quests

---

### UserQuestProgress Model

```prisma
model UserQuestProgress {
  id          String    @id @default(cuid())
  userId      String
  questId     String
  progress    Json      // Current progress state
  completed   Boolean   @default(false)
  completedAt DateTime?
  startedAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  quest       Quest     @relation(fields: [questId], references: [id], onDelete: Cascade)

  @@unique([userId, questId])
  @@index([userId])
  @@index([questId])
  @@index([completed])
}
```

**Field Explanations**:
- `progress`: JSON object tracking current state (e.g., `{ completed: 2, target: 3 }`)
- `completed`: Boolean flag for fast filtering
- `completedAt`: Timestamp of completion (for streak calculation)
- `@@unique([userId, questId])`: One progress record per user per quest

---

### UserQuestStreak Model

```prisma
model UserQuestStreak {
  id                   String    @id @default(cuid())
  userId               String    @unique
  currentDailyStreak   Int       @default(0)
  longestDailyStreak   Int       @default(0)
  currentWeeklyStreak  Int       @default(0)
  longestWeeklyStreak  Int       @default(0)
  lastCompletedDate    DateTime?
  totalQuestsCompleted Int       @default(0)
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt
  user                 User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

**Field Explanations**:
- `currentDailyStreak`: Consecutive days with ≥1 quest completed
- `longestDailyStreak`: Personal record for daily streak
- `currentWeeklyStreak`: Consecutive weeks with ≥5 quests completed
- `lastCompletedDate`: Normalized to midnight (timezone-aware)
- `totalQuestsCompleted`: Lifetime total (all time)

---

### Badge Model

```prisma
model Badge {
  id                    String      @id @default(cuid())
  name                  String      @unique
  description           String      @db.Text
  imageUrl              String      // Azure Storage URL
  qualificationCriteria Json        // Flexible criteria object
  displayOrder          Int         @default(0)
  isActive              Boolean     @default(true)
  isAutoAwarded         Boolean     @default(true)
  maxAwards             Int?        // Optional limit
  createdAt             DateTime    @default(now())
  updatedAt             DateTime    @updatedAt
  createdBy             String?     // Admin who created
  userBadges            UserBadge[]

  @@index([isActive])
  @@index([name])
}
```

**Field Explanations**:
- `qualificationCriteria`: JSON containing `BadgeQualificationCriteria` structure
- `isAutoAwarded`: If true, system automatically awards when qualified
- `maxAwards`: If set, limits total awards (for exclusive badges)
- `imageUrl`: Full URL to badge image in Azure Blob Storage

---

### UserBadge Model

```prisma
model UserBadge {
  id           String   @id @default(cuid())
  userId       String
  badgeId      String
  earnedAt     DateTime @default(now())
  isDisplayed  Boolean  @default(false)
  displayOrder Int?     // User's custom ordering
  awardedBy    String?  // Admin ID if manually awarded
  awardReason  String?  // Optional reason for manual awards
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  badge        Badge    @relation(fields: [badgeId], references: [id], onDelete: Cascade)

  @@unique([userId, badgeId])
  @@index([userId])
  @@index([badgeId])
  @@index([isDisplayed])
}
```

**Field Explanations**:
- `isDisplayed`: Whether badge appears on user's nameplate
- `displayOrder`: User's custom ordering (1-5 for displayed badges)
- `awardedBy`: Null for auto-awarded, admin ID for manual awards
- `awardReason`: Recorded for transparency and audit trail

---

## Implementation Examples

### Example: Creating a "Daily Voter" Quest

**Goal**: Encourage users to engage with voting-related content daily during election season.

**Step 1: Define Requirements**
```json
{
  "type": "READ_POSTS",
  "target": 5,
  "timeframe": "daily",
  "metadata": {
    "categories": ["VOTING", "ELECTIONS"],
    "minDuration": 15
  }
}
```

**Step 2: Define Rewards**
```json
{
  "reputationPoints": 3,
  "experiencePoints": 25,
  "badges": []  // Could add "Informed Voter" badge
}
```

**Step 3: Create Quest via API**
```bash
POST /api/quests/create
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "type": "DAILY_HABIT",
  "category": "INFORMATION",
  "title": "Stay Informed on Voting",
  "description": "Democracy requires informed voters. Read 5 posts about voting, elections, or ballot measures to understand the issues.",
  "shortDescription": "Read 5 voting-related posts",
  "requirements": {
    "type": "READ_POSTS",
    "target": 5,
    "timeframe": "daily",
    "metadata": {
      "categories": ["VOTING", "ELECTIONS"],
      "minDuration": 15
    }
  },
  "rewards": {
    "reputationPoints": 3,
    "experiencePoints": 25
  },
  "timeframe": "DAILY",
  "displayOrder": 3,
  "isActive": true,
  "startDate": "2025-10-01T00:00:00Z",
  "endDate": "2025-11-06T23:59:59Z"
}
```

**Step 4: Verify Quest Appears**
```bash
GET /api/quests/daily
# Should include new quest in response
```

---

### Example: Creating a "First Post" Badge

**Goal**: Welcome new users and encourage first-time content creation.

**Step 1: Design Badge Image**
- Create 256×256px PNG
- Theme: Welcome/starter badge (e.g., seedling 🌱, first steps 👶)
- Save as `first-post-badge.png`

**Step 2: Define Qualification Criteria**
```json
{
  "type": "CIVIC_ACTION",
  "requirements": {
    "postsCreated": 1
  }
}
```

**Step 3: Create Badge via API**
```bash
POST /api/badges/create
Authorization: Bearer <admin-token>
Content-Type: multipart/form-data

name: "First Post"
description: "You've shared your first thought with the community! This is just the beginning of your civic voice."
qualificationCriteria: {
  "type": "CIVIC_ACTION",
  "requirements": {
    "postsCreated": 1
  }
}
image: <first-post-badge.png>
isAutoAwarded: true
displayOrder: 1
```

**Step 4: Run Qualification Check**
```bash
POST /api/badges/check-qualifications
# Awards badge to all existing users with ≥1 post
```

**Step 5: Verify Award**
```bash
GET /api/badges/vault
# Should include "First Post" badge if you have posts
```

---

### Example: User Completes a Quest

**Flow Diagram**:

```
User creates a post
       ↓
Post creation triggers ActivityType.POST_CREATED event
       ↓
Event handler calls questService.updateQuestProgress(userId, 'POST_CREATED')
       ↓
Quest service finds active quests requiring POST_CREATED
       ↓
Updates progress: { completed: 1, target: 1 }
       ↓
Checks if quest requirements met (target reached)
       ↓
Calls handleQuestCompletion(userId, questId)
       ↓
       ├─→ Awards reputation points (+3)
       ├─→ Logs reputation event
       ├─→ Awards any associated badges
       ├─→ Updates user streak (currentDailyStreak++)
       └─→ Sends completion notification
              ↓
User sees quest completion modal with confetti 🎉
```

**Code Flow** (`quest.service.ts`):

```typescript
// 1. User action triggers update
await questService.updateQuestProgress(userId, 'POST_CREATED', {
  postId: 'cm2post123'
});

// 2. Find active quests matching this action
const activeQuests = await prisma.userQuestProgress.findMany({
  where: { userId, completed: false },
  include: { quest: true }
});

// 3. Check each quest's requirements
for (const questProgress of activeQuests) {
  const requirements = questProgress.quest.requirements;

  if (requirements.type === 'CIVIC_ACTION' &&
      requirements.metadata.actionType === 'POST_CREATED') {

    // 4. Update progress
    const newProgress = {
      completed: (currentProgress.completed || 0) + 1,
      target: requirements.target
    };

    const isCompleted = newProgress.completed >= requirements.target;

    // 5. Mark quest complete if requirements met
    if (isCompleted) {
      await handleQuestCompletion(userId, questId);
    }
  }
}

// 6. Quest completion handler
private async handleQuestCompletion(userId: string, questId: string) {
  const quest = await prisma.quest.findUnique({ where: { id: questId } });
  const rewards = quest.rewards;

  // Award reputation
  await prisma.user.update({
    where: { id: userId },
    data: {
      reputationScore: Math.min(100, currentScore + rewards.reputationPoints)
    }
  });

  // Award badges
  for (const badgeId of rewards.badges || []) {
    await badgeService.awardBadge(userId, badgeId);
  }

  // Update streak
  await updateUserStreak(userId, quest.type);

  // Notify user
  await prisma.notification.create({
    data: {
      type: 'REACTION',
      receiverId: userId,
      message: `Quest completed: ${quest.title}!`
    }
  });
}
```

---

### Example: Badge Auto-Award Trigger

**Scenario**: User completes their 30th consecutive day of quests

**Flow Diagram**:

```
User completes daily quest #30 in a row
       ↓
Quest completion handler calls updateUserStreak()
       ↓
Streak calculation: currentDailyStreak = 30
       ↓
Updates UserQuestStreak record
       ↓
[EITHER: Immediate check OR Nightly scheduled job]
       ↓
Badge qualification check runs
       ↓
Finds badge: "30-Day Activist"
       ↓
Criteria: { type: "QUEST_COMPLETION", requirements: { streakDays: 30 } }
       ↓
Checks user's streak: currentDailyStreak = 30 ✅
       ↓
User doesn't already have this badge ✅
       ↓
Awards badge automatically
       ↓
       ├─→ Creates UserBadge record
       ├─→ Sends notification: "You earned the '30-Day Activist' badge!"
       └─→ Adds to badge vault
              ↓
User sees badge notification and opens BadgeVault to display it
```

**Code Flow** (`badge.service.ts`):

```typescript
// 1. Scheduled job triggers qualification check
await badgeService.runBadgeQualificationChecks();

// 2. Get all active users and auto-awardable badges
const activeUsers = await prisma.user.findMany({
  where: { lastSeenAt: { gte: thirtyDaysAgo } }
});

const activeBadges = await prisma.badge.findMany({
  where: { isActive: true, isAutoAwarded: true }
});

// 3. Check each user against each badge
for (const user of activeUsers) {
  for (const badge of activeBadges) {
    // Skip if already has badge
    const alreadyHas = await prisma.userBadge.findUnique({
      where: { userId_badgeId: { userId: user.id, badgeId: badge.id } }
    });

    if (!alreadyHas) {
      // 4. Check qualification
      const qualifies = await checkUserQualifications(user.id, badge.id);

      // 5. Award if qualified
      if (qualifies) {
        await awardBadge(user.id, badge.id, undefined, 'Auto-awarded');
      }
    }
  }
}

// 6. Qualification check for streak badge
async checkQuestCriteria(userId: string, requirements: any): Promise<boolean> {
  if (requirements.streakDays) {
    const streak = await prisma.userQuestStreak.findUnique({
      where: { userId }
    });

    return streak && streak.currentDailyStreak >= requirements.streakDays;
  }
}
```

---

## Best Practices

### Quest Design Principles

#### **1. Keep Requirements Achievable**
❌ **Bad**: "Read 50 posts and comment on 20 of them in one day"
✅ **Good**: "Read 3 posts from your feed to stay informed"

**Rationale**: Daily quests should take 5-15 minutes max. Users should feel successful, not overwhelmed.

---

#### **2. Provide Clear Descriptions**
❌ **Bad**: "Engage with the platform"
✅ **Good**: "Share your thoughts on a local issue. Create a post about something happening in your community."

**Rationale**: Users should know exactly what to do and why it matters.

---

#### **3. Balance Difficulty Across Quest Types**
- **DAILY_HABIT**: Very easy (90%+ completion rate)
- **DAILY_CIVIC**: Easy-medium (60-70% completion rate)
- **WEEKLY_ENGAGEMENT**: Medium (40-50% completion rate)
- **MONTHLY_CONSISTENCY**: Challenging (20-30% completion rate)

**Rationale**: Progressive difficulty creates a sense of achievement while maintaining engagement.

---

#### **4. Consider New User Experience**
- First 7 days: Only DAILY_HABIT quests
- Days 8-30: Add DAILY_CIVIC quests
- Days 31+: Add WEEKLY_ENGAGEMENT
- Days 90+: Unlock all quest types

**Rationale**: Gradual onboarding prevents overwhelming new users.

---

#### **5. Avoid Repetitive Language**
Create variety in quest titles and descriptions even for similar actions:
- "Voice Your Opinion" vs "Share Your Perspective"
- "Support a Cause" vs "Stand for Change"
- "Engage in Discussion" vs "Join the Conversation"

**Rationale**: Variety prevents quest fatigue and monotony.

---

### Badge Design Principles

#### **1. Clear Qualification Criteria**
❌ **Bad**: "Be a good community member"
✅ **Good**: "Complete 50 quests AND maintain a 7-day streak"

**Rationale**: Users should understand exactly how to earn badges.

---

#### **2. Balance Rarity**
**Distribution Target**:
- Common: 40-50% of users
- Uncommon: 20-30% of users
- Rare: 10-15% of users
- Epic: 3-5% of users
- Legendary: <1% of users

**Rationale**: Scarcity creates value. If everyone has everything, nothing feels special.

---

#### **3. Avoid Participation Trophies for Everything**
❌ **Bad**: "Logged in once" badge
✅ **Good**: "Maintained 90-day login streak" badge

**Rationale**: Badges should represent meaningful achievements, not mere participation.

---

#### **4. Visual Hierarchy**
Badge images should visually communicate rarity:
- **Common**: Simple design, muted colors
- **Uncommon**: More detail, single accent color
- **Rare**: Complex design, multiple colors
- **Epic**: Animated effects, glowing border
- **Legendary**: Unique style, particle effects

**Rationale**: Users should instantly recognize valuable badges.

---

#### **5. Thematic Consistency**
All badges should follow a consistent visual style:
- Same size (256×256px)
- Similar level of detail
- Cohesive color palette
- Recognizable iconography

**Rationale**: Badges are part of the platform's visual identity.

---

## Troubleshooting

### Common Issues

#### **Issue: User completed quest but didn't receive reward**

**Diagnosis Steps**:

1. Check quest progress record:
   ```sql
   SELECT * FROM "UserQuestProgress"
   WHERE "userId" = 'cm2user123' AND "questId" = 'cm2quest456';
   ```

2. Verify `completed` is `true` and `completedAt` is set

3. Check reputation event log:
   ```sql
   SELECT * FROM "ReputationEvent"
   WHERE "userId" = 'cm2user123'
   ORDER BY "createdAt" DESC LIMIT 10;
   ```

4. Check user's current reputation score:
   ```sql
   SELECT "reputationScore", "reputationUpdatedAt"
   FROM "User" WHERE "id" = 'cm2user123';
   ```

**Common Causes**:
- Quest progress marked complete but `handleQuestCompletion` never called
- Reputation already at max (100)
- Badge ID in rewards doesn't exist

**Solution**:
```typescript
// Manually award missing rewards
await questService.handleQuestCompletion('cm2user123', 'cm2quest456');
```

---

#### **Issue: Badge not auto-awarding despite user qualifying**

**Diagnosis Steps**:

1. Check badge `isAutoAwarded` setting:
   ```sql
   SELECT "name", "isAutoAwarded", "isActive"
   FROM "Badge" WHERE "id" = 'cm2badge789';
   ```

2. Verify qualification criteria:
   ```sql
   SELECT "qualificationCriteria" FROM "Badge" WHERE "id" = 'cm2badge789';
   ```

3. Manually check if user qualifies:
   ```typescript
   const qualifies = await badgeService.checkUserQualifications('cm2user123', 'cm2badge789');
   console.log('User qualifies:', qualifies);
   ```

4. Check if badge already awarded:
   ```sql
   SELECT * FROM "UserBadge"
   WHERE "userId" = 'cm2user123' AND "badgeId" = 'cm2badge789';
   ```

**Common Causes**:
- `isAutoAwarded = false` (manual-only badge)
- Qualification check logic error
- User already has badge (duplicate check failed)
- Qualification check job not running

**Solution**:
```bash
# Manually run qualification check
POST /api/badges/check-qualifications

# Or manually award
POST /api/badges/award
{
  "userId": "cm2user123",
  "badgeId": "cm2badge789",
  "reason": "Manual award after auto-award failure"
}
```

---

#### **Issue: Quest appears in daily list but progress doesn't update**

**Diagnosis Steps**:

1. Check if quest is assigned to user:
   ```sql
   SELECT * FROM "UserQuestProgress"
   WHERE "userId" = 'cm2user123'
   AND "completed" = false;
   ```

2. Verify activity event is being tracked:
   ```sql
   SELECT * FROM "UserActivity"
   WHERE "userId" = 'cm2user123'
   ORDER BY "createdAt" DESC LIMIT 10;
   ```

3. Check quest requirements match activity type:
   ```typescript
   const quest = await prisma.quest.findUnique({ where: { id: 'cm2quest456' } });
   console.log('Requirements:', quest.requirements);
   ```

**Common Causes**:
- Activity type mismatch (quest expects `POST_CREATED`, user action logged as `POST_PUBLISHED`)
- Quest progress update logic not handling this activity type
- UserQuestProgress record not created when quest assigned

**Solution**:
```typescript
// Manually trigger progress update
await questService.updateQuestProgress('cm2user123', 'POST_CREATED', {
  postId: 'cm2post999'
});
```

---

#### **Issue: Streak reset unexpectedly**

**Diagnosis Steps**:

1. Check last completed date:
   ```sql
   SELECT "currentDailyStreak", "lastCompletedDate"
   FROM "UserQuestStreak" WHERE "userId" = 'cm2user123';
   ```

2. Check timezone of completion vs current date:
   ```typescript
   const streak = await prisma.userQuestStreak.findUnique({
     where: { userId: 'cm2user123' }
   });
   const lastCompleted = new Date(streak.lastCompletedDate);
   const today = new Date();
   today.setHours(0, 0, 0, 0);
   lastCompleted.setHours(0, 0, 0, 0);

   const daysSince = Math.floor((today.getTime() - lastCompleted.getTime()) / (1000*60*60*24));
   console.log('Days since last completion:', daysSince);
   ```

3. Check quest completion log for missing day:
   ```sql
   SELECT DATE("completedAt") as completion_date, COUNT(*) as quests_completed
   FROM "UserQuestProgress"
   WHERE "userId" = 'cm2user123' AND "completed" = true
   GROUP BY DATE("completedAt")
   ORDER BY completion_date DESC
   LIMIT 10;
   ```

**Common Causes**:
- User didn't complete quest one day (legitimate streak break)
- Timezone mismatch (completed at 11:55 PM local, but server already advanced to next day UTC)
- Quest completed but `updateUserStreak` never called

**Solution**:
If streak was broken incorrectly due to bug:
```sql
-- Restore streak manually (admin only)
UPDATE "UserQuestStreak"
SET "currentDailyStreak" = 15, "lastCompletedDate" = '2025-10-08'
WHERE "userId" = 'cm2user123';
```

---

## Future Enhancements

### Planned Features (Q1 2026)

#### **1. Quest Difficulty Levels**
- **Beginner**, **Intermediate**, **Advanced**, **Expert**
- Progressive unlocking based on user level
- Higher rewards for harder quests
- Skill-based matchmaking for collaborative quests

---

#### **2. Team Quests**
- Multi-user collaborative quests
- Shared progress tracking
- Team-based rewards and badges
- Leaderboards for top teams

**Example**:
```json
{
  "title": "Organize a Town Hall",
  "type": "TEAM_CIVIC_ACTION",
  "requirements": {
    "type": "TEAM_EVENT",
    "teamSize": 5,
    "target": "ORGANIZE_EVENT",
    "metadata": {
      "eventType": "TOWN_HALL",
      "minAttendees": 25
    }
  },
  "rewards": {
    "reputationPoints": 50,
    "badges": ["community-organizer"],
    "teamBadge": "town-hall-organizers-2026"
  }
}
```

---

#### **3. Quest Chains / Storylines**
- Multi-quest narratives with unlocking progression
- "Chapter-based" civic education
- Gated content requiring previous quest completion

**Example**:
```
Chapter 1: Understanding Your Local Government
├─ Quest 1: Learn about your city council
├─ Quest 2: Attend a city council meeting
├─ Quest 3: Submit public comment
└─ Quest 4: Track a local bill

Chapter 2: Becoming a Community Advocate
├─ Quest 5: Create petition for local issue
├─ Quest 6: Get 50 signatures
└─ Quest 7: Present petition to council
```

---

#### **4. Seasonal Events / Limited-Time Campaigns**
- Holiday-themed civic quests
- Election-season super quests
- Awareness month campaigns
- Commemorative event participation

**Example**:
```json
{
  "title": "Earth Day 2026: Climate Action Week",
  "type": "SEASONAL_EVENT",
  "duration": "7 days",
  "quests": [
    "Attend local climate rally",
    "Sign environmental petition",
    "Share climate policy post",
    "Contact representative about climate bill"
  ],
  "rewards": {
    "badges": ["earth-day-2026"],
    "specialRecognition": "Climate Champion 2026"
  }
}
```

---

#### **5. User-Created Quests**
- High-reputation users can create community quests
- Peer voting on quest quality
- Curated by moderators before going live
- Creator gets recognition badge

**Requirements**:
- Reputation score ≥ 90
- Account age ≥ 90 days
- Quest creation privileges (manually granted by admin)

---

#### **6. Leaderboards & Competitions**
- Daily/weekly/monthly top quest completers
- State/district/city leaderboards
- Competitive quest rush events
- Prizes for top performers

**Leaderboard Types**:
- Total quests completed (lifetime)
- Current streak leaders
- Most badges earned
- Highest reputation score
- Most helpful community member

---

#### **7. Achievement Milestones**
- "Total XP" system separate from reputation
- Level-based progression (1-100)
- Level-up rewards and titles
- Unlock new features at certain levels

**Example Progression**:
```
Level 1-10: Newcomer
Level 11-25: Active Citizen
Level 26-50: Community Leader
Level 51-75: Civic Champion
Level 76-100: Democracy Defender
```

---

#### **8. Badge Trading / Gifting**
- Transfer certain badges to other users
- Gift commemorative badges
- Trade limited-edition badges
- Badge marketplace (reputation-based currency)

**Restrictions**:
- Only "tradeable" badges can be transferred
- Achievement badges cannot be traded (earn-only)
- Trading requires both users' consent

---

#### **9. Mobile App Integration**
- Push notifications for daily quests
- Quest completion via app
- Badge showcase on mobile profile
- Location-based quest suggestions

---

#### **10. AI-Powered Quest Recommendations**
- Personalized quest suggestions based on interests
- Difficulty adjustment based on completion rate
- Time-of-day quest optimization
- Social graph integration (quests friends are doing)

---

### Technical Debt to Address

1. **Scalability**: Current badge qualification check is O(users × badges)
   - **Solution**: Event-driven incremental checking

2. **Quest Progress Tracking**: Activity events not always reliable
   - **Solution**: Webhook-based progress updates from core services

3. **Timezone Handling**: Streak calculation assumes UTC
   - **Solution**: Store user timezone, normalize all dates to user's local time

4. **Caching**: Quest and badge data fetched on every request
   - **Solution**: Redis cache for quest lists and badge metadata

5. **Analytics**: No detailed funnel analysis for quest completion
   - **Solution**: Integrate with analytics platform (e.g., Mixpanel, Amplitude)

---

## API Reference

For detailed API endpoint documentation, see:
- **[API_QUESTS_BADGES.md](./API_QUESTS_BADGES.md)** - Complete API reference with request/response examples

For complete database schema, see:
- **[DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)** - Full Prisma schema documentation

---

## Changelog

**October 2-3, 2025**: Initial production launch
- Quest and Badge database models created
- Quest service with daily generation and progress tracking
- Badge service with auto-award qualification system
- QuestProgressTracker frontend component
- BadgeVault frontend component
- Admin APIs for quest/badge management

**October 9, 2025**: Documentation created
- Comprehensive system architecture documentation
- Admin workflow guides
- Implementation examples
- Troubleshooting guide

---

## Support & Contribution

**Questions?** Contact the development team:
- **Technical Lead**: [GitHub Issues](https://github.com/UnitedWeRise-org/UnitedWeRise/issues)
- **Product Questions**: Product team via Slack
- **Bug Reports**: [GitHub Issues](https://github.com/UnitedWeRise-org/UnitedWeRise/issues) with `[Quest/Badge]` tag

**Contributing**:
- Quest ideas: Submit via admin dashboard or GitHub
- Badge designs: Submit mockups to design team
- Code contributions: Follow standard PR process

---

**End of Documentation**
