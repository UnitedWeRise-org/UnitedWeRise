# Civic Engagement Gamification System
**Future Feature Specification for UnitedWeRise Platform**

---

## 📊 Executive Summary

A comprehensive gamification system designed to boost Daily Active Users (DAUs) and meaningful civic engagement through login streaks, quest systems, and reward mechanics. This system transforms routine platform interactions into an engaging, habit-forming experience that aligns with UnitedWeRise's mission of fostering political participation.

**Core Objective**: Increase DAUs while ensuring genuine civic engagement, not just empty logins.

---

## 🎮 Core Features

### 1. Login Streak System

#### **Functionality**
- Track consecutive daily logins for each user
- Display current streak prominently on user profiles
- Show longest streak achieved as a secondary metric
- Visual indicators for milestone achievements (7, 30, 60, 90 days)

#### **Mechanics**
- Streak increments with daily login (UTC timezone standardized)
- Grace period: 1 "freeze" per month to preserve streak if missed
- Streak resets after 48 hours of inactivity
- Must perform minimal activity (scroll, click) within 30 seconds to count

#### **Display Elements**
```
🔥 Current Streak: 42 days
🏆 Longest Streak: 127 days
❄️ Freezes Available: 1
```

### 2. Quest System

#### **Quest Types & Frequency**

**Daily Quests (2 per day)**
- Randomly selected from pool, refreshed at midnight UTC
- Examples:
  - "Make a post about a local issue" (+10 XP)
  - "Comment on 3 posts from your district" (+15 XP)
  - "View profiles of 2 representatives" (+10 XP)
  - "React to 5 posts with thumbs up/down" (+5 XP)
  - "Share a news article with commentary" (+10 XP)

**Weekly Quests (1 per week)**
- More substantial engagement requirements
- Examples:
  - "Follow 5 users from your state" (+50 XP)
  - "Engage in 3 different conversation bubbles" (+75 XP)
  - "Complete your candidate comparison for upcoming election" (+100 XP)
  - "Send a message to a local representative" (+100 XP)
  - "Create a post that gets 10+ engagements" (+75 XP)

**Monthly Quest (1 per month)**
- Meta-quest focused on consistency
- "Complete 20 quests this month" (+500 XP)
- Bonus rewards for 100% completion rate

#### **Quest Pool Categories**
1. **Engagement Quests** - Posting, commenting, reacting
2. **Discovery Quests** - Viewing profiles, exploring map, reading about candidates
3. **Connection Quests** - Following users, messaging, joining conversations
4. **Civic Quests** - Viewing ballot info, comparing candidates, contacting representatives
5. **Community Quests** - Helping new users, reporting issues, quality contributions

### 3. Reward & Recognition System

#### **Experience Points (XP) & Levels**
```
Level 1: Civic Newcomer (0-100 XP)
Level 2: Active Citizen (101-300 XP)
Level 3: Community Voice (301-600 XP)
Level 4: District Leader (601-1000 XP)
Level 5: State Influencer (1001-1500 XP)
Level 6: National Advocate (1501-2500 XP)
Level 7: Democracy Champion (2500+ XP)
```

#### **Badges & Achievements**
- **Streak Badges**: 
  - 🥉 Bronze Daily (7-day streak)
  - 🥈 Silver Weekly (30-day streak)
  - 🥇 Gold Monthly (60-day streak)
  - 💎 Diamond Dedication (90-day streak)
  - 🌟 Platinum Patriot (180-day streak)

- **Quest Badges**:
  - Quest Starter (10 quests completed)
  - Quest Hunter (50 quests completed)
  - Quest Master (200 quests completed)
  - Quest Legend (500 quests completed)

- **Civic Badges**:
  - Informed Voter (viewed all candidates in election)
  - Bridge Builder (engaged with opposing viewpoints)
  - Local Hero (20+ posts about local issues)
  - Democracy Defender (reported misinformation)

#### **Tangible Rewards**
- **Weekly Prize Drawings**:
  - Entry for users with 7-day streak
  - Prizes: Profile boost (1 week featured), custom flair, bonus XP

- **Monthly Grand Prize**:
  - Entry for users completing monthly quest
  - Prizes: $25-50 e-gift cards (when revenue allows), exclusive badge, profile highlight

- **Boost Mechanics**:
  - Featured post slot on main feed
  - Highlighted profile in user discovery
  - Custom profile themes/colors
  - Exclusive "Verified Civic Leader" status

---

## 🔧 Technical Implementation

### Database Schema Changes

```sql
-- User table additions
ALTER TABLE users ADD COLUMN current_streak INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN longest_streak INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN last_login_date DATE;
ALTER TABLE users ADD COLUMN streak_freezes INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN total_xp INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN level INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN quest_points INTEGER DEFAULT 0;

-- New tables
CREATE TABLE user_quests (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    quest_id UUID REFERENCES quests(id),
    status VARCHAR(20), -- 'active', 'completed', 'expired'
    progress INTEGER DEFAULT 0,
    assigned_at TIMESTAMP,
    completed_at TIMESTAMP,
    expires_at TIMESTAMP
);

CREATE TABLE quests (
    id UUID PRIMARY KEY,
    title VARCHAR(200),
    description TEXT,
    type VARCHAR(20), -- 'daily', 'weekly', 'monthly'
    category VARCHAR(50), -- 'engagement', 'discovery', 'connection', 'civic', 'community'
    requirements JSONB, -- Flexible structure for different quest types
    xp_reward INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_badges (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    badge_id UUID REFERENCES badges(id),
    earned_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE badges (
    id UUID PRIMARY KEY,
    name VARCHAR(100),
    description TEXT,
    icon_url VARCHAR(500),
    category VARCHAR(50),
    requirements JSONB,
    tier INTEGER -- For progressive badges
);

CREATE TABLE streak_history (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    streak_length INTEGER,
    started_at DATE,
    ended_at DATE,
    freeze_used BOOLEAN DEFAULT false
);

CREATE TABLE reward_winners (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    reward_type VARCHAR(50),
    reward_value TEXT,
    period_type VARCHAR(20), -- 'weekly', 'monthly'
    period_date DATE,
    claimed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### API Endpoints

```typescript
// Gamification endpoints
POST   /api/gamification/login          // Track login and update streak
GET    /api/gamification/profile/:userId // Get user's gamification stats
GET    /api/gamification/quests         // Get user's active quests
POST   /api/gamification/quests/:questId/progress // Update quest progress
POST   /api/gamification/quests/:questId/complete // Mark quest complete
GET    /api/gamification/leaderboard    // Get leaderboard (global/regional)
POST   /api/gamification/streak/freeze  // Use streak freeze
GET    /api/gamification/badges         // Get user's badges
GET    /api/gamification/rewards/eligible // Check reward eligibility
POST   /api/gamification/rewards/claim  // Claim available rewards
```

### Quest Progress Tracking Logic

```typescript
interface QuestRequirement {
    type: 'post' | 'comment' | 'follow' | 'view' | 'message' | 'react';
    target?: 'representative' | 'candidate' | 'user' | 'post';
    count: number;
    filters?: {
        isPolitical?: boolean;
        location?: 'local' | 'state' | 'national';
        timeframe?: number; // hours
    };
}

// Example quest progress updater
async function updateQuestProgress(userId: string, action: string, metadata: any) {
    const activeQuests = await getUserActiveQuests(userId);
    
    for (const quest of activeQuests) {
        const requirements = quest.requirements as QuestRequirement;
        
        if (requirements.type === action) {
            // Check if action matches quest requirements
            if (matchesRequirements(action, metadata, requirements)) {
                quest.progress += 1;
                
                if (quest.progress >= requirements.count) {
                    await completeQuest(userId, quest.id);
                    await awardXP(userId, quest.xp_reward);
                    await checkBadgeEligibility(userId);
                } else {
                    await saveQuestProgress(quest);
                }
            }
        }
    }
}
```

---

## 🎨 UI/UX Design Requirements

### Profile Gamification Section
```
┌─────────────────────────────────────┐
│ 🎮 Civic Engagement Stats           │
├─────────────────────────────────────┤
│ 🔥 42 Day Streak  ❄️ 1 Freeze      │
│ ⭐ Level 4: District Leader         │
│ 📊 875/1000 XP                      │
│                                     │
│ 🏆 Achievements                     │
│ [🥇][🎯][🗳️][🌉][💬]              │
│                                     │
│ 📋 Active Quests (2/3)             │
│ ▸ Comment on 3 posts (2/3)         │
│ ▸ View 2 representatives (0/2)     │
└─────────────────────────────────────┘
```

### Quest Dashboard Modal
```
┌─────────────────────────────────────┐
│        🎯 Today's Quests            │
├─────────────────────────────────────┤
│ DAILY QUESTS                        │
│ □ Make a post about local issue     │
│   Reward: 10 XP     [Start Quest]   │
│                                     │
│ ✓ React to 5 posts                 │
│   Completed! +5 XP                  │
│                                     │
│ WEEKLY QUEST (Ends in 3 days)       │
│ ▶ Follow 5 users from your state    │
│   Progress: 2/5     Reward: 50 XP   │
│                                     │
│ MONTHLY QUEST                       │
│ ▶ Complete 20 quests                │
│   Progress: 12/20   Reward: 500 XP  │
└─────────────────────────────────────┘
```

### Notification Toasts
- "🔥 Login streak extended to 15 days!"
- "✅ Quest completed: +10 XP earned!"
- "🎯 New daily quests available!"
- "🏆 Achievement unlocked: Bronze Daily!"
- "🎁 You're eligible for this week's prize drawing!"

---

## 🛡️ Anti-Abuse & Integrity Measures

### Login Verification
- Require minimum 30-second session activity
- Track device fingerprints to prevent automation
- Rate limit: Max 2 logins per hour per IP
- Suspicious pattern detection (multiple accounts, same device)

### Quest Integrity
- Action cooldowns (can't spam likes/comments)
- Quality requirements (min post length, no spam keywords)
- Geographic verification for location-based quests
- Manual review for high-value quest completions

### Fair Play Rules
- No XP for self-interactions (own posts/comments)
- Diminishing returns for repetitive actions
- Account age requirements for prize eligibility (7+ days)
- One account per person (verified via email/phone)

---

## 📊 Analytics & Success Metrics

### Key Performance Indicators (KPIs)
- **DAU/MAU Ratio**: Target 40% (up from baseline)
- **Average Session Duration**: Target +25% increase
- **Quest Completion Rate**: Target 60% for daily, 40% for weekly
- **Streak Retention**: % users maintaining 7+ day streaks
- **Feature Engagement**: % DAU interacting with gamification

### Tracking Events
```javascript
// Analytics events to implement
track('streak_updated', { userId, streakLength, type: 'increment|reset' });
track('quest_assigned', { userId, questId, questType });
track('quest_completed', { userId, questId, timeToComplete });
track('badge_earned', { userId, badgeId, badgeType });
track('reward_claimed', { userId, rewardType, rewardValue });
track('freeze_used', { userId, streakLength });
```

### A/B Testing Strategy
- **Phase 1**: 10% user rollout, measure engagement lift
- **Phase 2**: Test different XP values and quest difficulties
- **Phase 3**: Experiment with reward types and frequencies
- **Phase 4**: Full rollout with optimized parameters

---

## 🚀 Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
- [ ] Database schema updates
- [ ] Basic streak tracking backend
- [ ] Login tracking API endpoint
- [ ] Simple streak display on profile

### Phase 2: Quest System (Week 3-4)
- [ ] Quest definition system
- [ ] Quest assignment algorithm
- [ ] Progress tracking middleware
- [ ] Quest UI components

### Phase 3: Rewards & Badges (Week 5-6)
- [ ] Badge system implementation
- [ ] XP and leveling logic
- [ ] Achievement detection system
- [ ] Badge display UI

### Phase 4: Polish & Launch (Week 7-8)
- [ ] Anti-abuse measures
- [ ] Analytics integration
- [ ] Performance optimization
- [ ] Soft launch to test group

### Phase 5: Optimization (Ongoing)
- [ ] A/B testing framework
- [ ] Quest content expansion
- [ ] Reward tier adjustments
- [ ] Community feedback integration

---

## 💰 Revenue & Sustainability

### Cost Considerations
- **Development**: ~160 hours estimated
- **Prizes**: $200-500/month initial budget
- **Infrastructure**: Minimal additional cost

### Revenue Opportunities
- **Premium Streaks**: Paid streak insurance (multiple freezes)
- **Quest Boosts**: Pay to refresh quests or get bonus quests
- **Cosmetic Rewards**: Sell exclusive badges/themes
- **Sponsored Quests**: Partner with civic organizations

### ROI Projections
- **Expected DAU Increase**: 25-40%
- **User Lifetime Value**: +30% from increased retention
- **Viral Coefficient**: +0.15 from social sharing of achievements

---

## 🎯 Success Criteria

### Short Term (Month 1)
- 20% of users maintain 7+ day streaks
- 50% quest participation rate
- 15% increase in DAU

### Medium Term (Month 3)
- 35% of users maintain 14+ day streaks
- 65% quest participation rate
- 30% increase in DAU
- 25% increase in average session time

### Long Term (Month 6)
- Gamification drives 40% of daily logins
- 80% of active users have earned at least one badge
- Platform retention rate increased by 35%
- Meaningful civic engagement metrics up 50%

---

## 📝 Notes & Considerations

### Ethical Considerations
- Ensure gamification promotes genuine civic engagement, not clickbait
- Avoid addictive dark patterns that harm user wellbeing
- Maintain transparency about data collection and rewards

### Accessibility
- Ensure all gamification elements are screen-reader friendly
- Provide alternative ways to earn rewards for users with disabilities
- Clear, simple language for quest descriptions

### Localization
- Quest content should be relevant to user's jurisdiction
- Rewards should be available internationally (when applicable)
- Time zones handled properly for global users

---

## 🔗 Related Documentation
- [CIVIC_SOCIAL_MEDIA_VISION.md](./CIVIC_SOCIAL_MEDIA_VISION.md) - Platform mission alignment
- [FEED_ALGORITHM_TUNING.md](./FEED_ALGORITHM_TUNING.md) - Integration with feed algorithm
- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - Existing API structure
- [PROJECT_SUMMARY_UPDATED.md](./PROJECT_SUMMARY_UPDATED.md) - Current platform features

---

*Last Updated: December 2024*  
*Status: Future Implementation Specification*  
*Priority: High - Post-Launch Feature*  
*Estimated Impact: 25-40% DAU increase*