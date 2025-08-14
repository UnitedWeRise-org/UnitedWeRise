# UnitedWeRise Reputation System - Complete Implementation

## 🏆 Overview

A comprehensive 0-100 reputation scoring system that promotes civil discourse without censorship. Users start at 70 and earn/lose points based on behavior, not political opinions.

**Core Philosophy**: "Transparent Accountability, Not Censorship"
- Everyone can speak freely
- Reputation affects visibility, never blocks speech
- Focus on behavior/civility, not content/opinions
- Mild algorithmic adjustments (±10-20% visibility)

---

## 📊 System Architecture

### Score Mechanics
- **Range**: 0-100 (no negative values)
- **Starting Score**: 70 (new users)
- **No Automatic Decay**: Scores only change through actions
- **Per-Post Penalty Cap**: Prevents pile-on attacks

### Algorithmic Effects
```
Score 95+:  +10% visibility boost (1.1x multiplier)
Score 50-94: Normal visibility (1.0x multiplier)
Score 30-49: -10% suppression (0.9x multiplier) 
Score <30:   -20% suppression (0.8x multiplier)
```

### Penalty Structure (Per Post)
```
Hate Speech:           -10 points
Harassment:            -8 points
Spam/Duplicates:       -2 points
Excessive Profanity:   -3 points (AI context-aware)
Personal Attacks:      -1 point
```

### Reward Structure (Daily Max: +2)
```
Quality Posts (5+ likes): +0.5 points
Constructive Dialogue:    +0.25 points
Helpful Content:          +0.25 points
Positive Feedback:        +0.25 points
```

---

## 🔧 Technical Implementation

### Core Services

#### 1. ReputationService (`backend/src/services/reputationService.ts`)
**Main Functions:**
- `getUserReputation(userId)` - Get current score and tier
- `generateContentWarning(content, userId)` - Pre-post analysis
- `analyzeAndApplyPenalties(content, userId, postId)` - Auto-moderation
- `awardReputation(userId, reason, postId)` - Positive reinforcement
- `processReport(reporterId, targetUserId, postId, reason)` - Community reports
- `processAppeal(userId, eventId, reason)` - Appeal system

**Key Features:**
- Azure OpenAI integration for sophisticated content analysis
- Per-post penalty caps (no pile-ons)
- Daily reward limits (+2 max per day)
- AI-powered appeals with admin escalation

#### 2. Updated Feed Algorithm (`backend/src/services/probabilityFeedService.ts`)
**Reputation Integration:**
- Added `reputation` weight factor (10% of feed algorithm)
- Visibility multipliers applied to final scores
- Higher reputation = better visibility in feeds
- Lower reputation = reduced (not eliminated) visibility

#### 3. Content Warning Middleware (`backend/src/middleware/reputationWarning.ts`)
**Middleware Functions:**
- `analyzeContentForWarning` - Non-blocking content analysis
- `requireWarningAcknowledgment` - Strict pre-post warnings
- `applyReputationPenalties` - Post-creation penalty application
- `warningRateLimit` - Prevents warning spam (max 5/hour)

### Database Schema

#### Updated User Model
```prisma
model User {
  // ... existing fields ...
  
  reputationScore     Int?      @default(70)
  reputationUpdatedAt DateTime?
  reputationEvents    ReputationEvent[]
}
```

#### New ReputationEvent Model
```prisma
model ReputationEvent {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id])
  
  type         String   // 'penalty' or 'reward'
  reason       String   // 'hate_speech', 'quality_post', etc.
  points       Float    // Points added/removed
  
  postId       String?  // Related post if applicable
  post         Post?    @relation(fields: [postId], references: [id])
  
  validated    Boolean  @default(false) // AI/human validated?
  scoreBefore  Int      // Transparency logging
  scoreAfter   Int      // Transparency logging
  
  metadata     Json?    // Additional context
  createdAt    DateTime @default(now())
}
```

#### Updated Post Model
```prisma
model Post {
  // ... existing fields ...
  
  reputationEvents    ReputationEvent[]
  authorReputation    Int?  // Cached reputation at post time
}
```

---

## 🛠️ API Endpoints

### Reputation Routes (`/api/reputation/`)

#### GET `/user/:userId`
Get user's current reputation score
```json
{
  "userId": "user123",
  "reputation": {
    "current": 75,
    "tier": "normal",
    "visibilityMultiplier": 1.0,
    "lastUpdated": "2025-01-15T10:30:00Z"
  }
}
```

#### GET `/me`
Get current user's reputation (authenticated)

#### GET `/history?limit=20&offset=0`
Get reputation event history (authenticated)
```json
{
  "events": [
    {
      "id": "event123",
      "type": "penalty",
      "reason": "personal_attack",
      "points": -1,
      "scoreBefore": 72,
      "scoreAfter": 71,
      "createdAt": "2025-01-15T10:00:00Z"
    }
  ]
}
```

#### POST `/analyze`
Analyze content for warnings before posting
```json
{
  "content": "Your post content here"
}
```

Response:
```json
{
  "showWarning": true,
  "issues": ["personal attack"],
  "potentialPenalty": -1,
  "message": "We don't aim to prevent anyone from sharing their ideas..."
}
```

#### POST `/report`
Submit community report
```json
{
  "targetUserId": "user456",
  "postId": "post789",
  "reason": "harassment",
  "content": "Post content that was reported"
}
```

#### POST `/appeal`
Appeal a reputation penalty
```json
{
  "eventId": "event123",
  "reason": "This was taken out of context. I was quoting someone else to criticize their position."
}
```

#### Admin Endpoints (require admin auth)
- `POST /award` - Manually award reputation
- `GET /stats` - System-wide reputation statistics
- `GET /low-reputation` - Users below threshold for review

---

## 🎯 Content Analysis System

### AI-Powered Detection
Uses Azure OpenAI (`gpt-35-turbo`) for sophisticated content analysis:

1. **Context-Aware**: Distinguishes between offensive and expressive language
2. **Political-Neutral**: Focuses on behavior, not opinions
3. **Conservative Flagging**: Only flags clear violations
4. **Fallback Graceful**: Continues without AI if service unavailable

### Content Warning Flow
```
User writes post → AI analyzes → Warning shown (if needed) → 
User can Edit (gain points) or Post Anyway (lose points) → 
Content posted → Community can report → Score adjusts
```

### Example Warning Message
```
We don't aim to prevent anyone from sharing their ideas, 
but please keep things civil.

Your post contains: personal attack

To maintain a positive community environment, we kindly ask 
you to reconsider how you might convey your ideas in a more 
constructive manner.

You may still post, but this content will be flagged and may 
affect your Community Reputation Score (potential impact: -1 points).

☐ I understand this notice and wish to proceed

[Edit Post] [Post Anyway]
```

---

## 🔄 Feed Integration

### Probability Cloud Algorithm
The reputation system integrates with the existing feed algorithm by:

1. **Reputation Weight**: 10% of feed scoring algorithm
2. **Visibility Multipliers**: Applied to final post scores
   - High reputation (95+): 1.1x multiplier (+10% boost)
   - Normal reputation (50-94): 1.0x multiplier (no change)
   - Low reputation (30-49): 0.9x multiplier (-10% suppression)
   - Very low reputation (<30): 0.8x multiplier (-20% suppression)

3. **Cached Reputation**: Posts store author reputation at creation time
4. **Fair Visibility**: Low reputation reduces visibility but never eliminates it

### Feed Algorithm Weights
```javascript
const feedWeights = {
  recency: 0.30,      // Newer content
  similarity: 0.25,   // Content similarity to user interests
  social: 0.25,       // Posts from followed users
  trending: 0.10,     // Popular/engaging content
  reputation: 0.10    // Author reputation
};
```

---

## 🛡️ Anti-Gaming Measures

### Per-Post Penalties
- Each post can only generate ONE penalty, regardless of reports
- Prevents coordinated attacks from tanking someone's score
- Multiple reports on same post don't stack

### Daily Limits
- **Rewards**: Maximum +2 points per day
- **Penalties**: No limit (bad behavior has immediate consequences)
- **Overflow Queue**: Excess positive actions queue for next day

### Report Validation
- AI validates reports to prevent weaponized reporting
- False reports don't impact target's reputation
- Pattern detection for coordinated attacks

### Rate Limiting
- Max 5 content warnings per hour per user
- Prevents spam posting to trigger system
- Graceful degradation when limits hit

---

## ⚖️ Appeals System

### Three-Tier Appeal Process

1. **AI Review** (Automatic)
   - Uses Azure OpenAI to review original penalty and appeal reason
   - High confidence decisions (>70%) processed automatically
   - Low confidence flagged for admin review

2. **Admin Review** (Human)
   - Complex cases escalated to admin panel
   - 48-hour response time commitment
   - Can overturn or uphold AI decisions

3. **Transparency Logging**
   - All appeals and decisions logged
   - Appeal reasoning required
   - Overturned decisions restore points + small bonus

### Appeal Example
```
Original Penalty: -8 points for "harassment"
User Appeal: "I was criticizing the policy, not the person. 
The comment 'supporters of this policy are misguided' is 
political criticism, not personal harassment."

AI Review: "Appeal has merit. Original content criticizes 
policy position rather than individuals. Overturning penalty."

Result: +8 points restored + 20% bonus = +10 points total
```

---

## 📊 Monitoring & Analytics

### System Statistics
- **Tier Distribution**: Percentage of users in each reputation tier
- **Event Frequency**: Most common penalties and rewards
- **Appeal Success Rate**: Percentage of appeals upheld/overturned
- **Average Score**: Platform-wide reputation average

### Admin Dashboard Integration
- Real-time reputation statistics
- Low reputation user alerts
- Appeal queue management
- System health monitoring

### Transparency Features
- Public reputation scores on profiles
- Personal reputation history
- Event explanations and reasoning
- Appeal status tracking

---

## 🚀 Deployment & Usage

### Backend Integration
1. **Add to app.ts**:
```javascript
import reputationRoutes from './routes/reputation';
app.use('/api/reputation', reputationRoutes);
```

2. **Update post routes** (already done):
```javascript
import { reputationService } from '../services/reputationService';
// Content analysis and penalty application integrated
```

3. **Database Migration**:
```bash
# Add reputation fields to existing schema
npx prisma db push
```

### Frontend Integration (To Do)
- Reputation badges on user profiles
- Content warning modals
- Appeal forms
- Reputation history displays
- Admin management interface

### Environment Configuration
```env
# Azure OpenAI (already configured)
AZURE_OPENAI_ENDPOINT=https://unitedwerise-openai.openai.azure.com/
AZURE_OPENAI_API_KEY=[configured]
AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-35-turbo

# Reputation System Settings (optional overrides)
REPUTATION_STARTING_SCORE=70
REPUTATION_DAILY_MAX_GAIN=2
REPUTATION_ANALYSIS_ENABLED=true
```

---

## 🎯 Success Metrics

### Community Health
- **Reduced Toxicity**: Fewer validated harassment/hate speech reports
- **Maintained Engagement**: No drop in post frequency or user activity
- **Political Diversity**: All viewpoints maintain representation
- **User Satisfaction**: Positive feedback on fairness and transparency

### System Performance
- **False Positive Rate**: <5% of AI penalties overturned on appeal
- **Gaming Attempts**: <1% of reputation changes from coordinated attacks
- **Appeal Response Time**: <48 hours for admin reviews
- **System Uptime**: 99.9% availability for reputation services

### Behavioral Changes
- **Warning Acceptance**: Users choose to edit rather than post controversial content
- **Quality Improvement**: Average post quality scores increase over time
- **Self-Regulation**: Community reports decrease as behavior improves
- **Cross-Party Dialogue**: Increased constructive engagement between opposing viewpoints

---

## 🔧 Maintenance & Tuning

### Regular Reviews
- **Monthly**: Review penalty thresholds and appeal success rates
- **Quarterly**: Analyze tier distribution and adjust if needed
- **Ongoing**: Monitor for new gaming attempts or abuse patterns

### A/B Testing
- **Feed Weights**: Test different reputation weight percentages
- **Penalty Values**: Fine-tune penalty amounts based on effectiveness
- **Warning Messages**: Test different warning copy for better acceptance

### Community Feedback
- **User Surveys**: Regular feedback on system fairness and effectiveness
- **Town Halls**: Public discussions about reputation system changes
- **Transparency Reports**: Quarterly reports on system performance and statistics

---

## 🎉 Conclusion

The UnitedWeRise Reputation System successfully balances free speech with community standards through:

✅ **Transparent Scoring**: Clear rules and visible reputation scores
✅ **Behavioral Focus**: Targets conduct, not political opinions  
✅ **Mild Consequences**: Visibility adjustments, not censorship
✅ **Appeal Process**: Fair review and overturn mechanisms
✅ **Anti-Gaming**: Robust protection against coordinated attacks
✅ **AI Integration**: Sophisticated content analysis with human oversight

This system creates natural social consequences similar to real-world reputation while preserving the platform's commitment to free speech and open political discourse.

**"Just as you'd ignore a jackass in public, you can choose to ignore a jackass on social media."**

The reputation system makes this choice easier by providing clear signals about user behavior while never silencing any voice completely.