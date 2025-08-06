# User Onboarding System for United We Rise

## Overview

The onboarding system guides new users through setting up their account and personalizing their experience on the United We Rise platform. It focuses on connecting users with their representatives and helping them engage with political issues in a non-partisan way.

## Key Features

### 🔐 **Political Neutrality**
- **No party affiliation fields** - Users are never asked about political party membership
- **Subtle search filtering** - Political party terms are filtered from search results without showing errors
- **Issue-based focus** - Emphasis on policy topics rather than partisan labels
- **Representative-centered** - Focus on connecting with elected officials regardless of party

### 📋 **7-Step Onboarding Flow**

1. **Welcome** - Platform introduction and community values
2. **Verification** - Email/phone verification status
3. **Location** - ZIP code for finding representatives (required)
4. **Interests** - Policy topics and issues (optional)
5. **Experience** - Political engagement level (optional)
6. **Notifications** - Communication preferences (optional)  
7. **Profile** - Bio and avatar (optional)

### 🌟 **Smart Features**

- **Progressive disclosure** - Information revealed gradually
- **Skip non-required steps** - Flexible completion
- **Real-time validation** - Instant feedback on location/ZIP codes
- **Representative preview** - Show user's reps during location step
- **Mobile responsive** - Works on all devices
- **Auto-trigger** - Shows automatically for new users

## API Endpoints

### Core Onboarding
- `GET /api/onboarding/steps` - Get all steps with completion status
- `GET /api/onboarding/progress` - Get current progress summary
- `POST /api/onboarding/complete-step` - Complete a step with data
- `POST /api/onboarding/skip-step` - Skip a non-required step

### Supporting Endpoints
- `GET /api/onboarding/interests` - Get available interest categories
- `POST /api/onboarding/location/validate` - Validate ZIP code and preview representatives
- `POST /api/onboarding/welcome` - Mark welcome step as viewed
- `GET /api/onboarding/analytics` - Admin analytics on onboarding completion

### Search Filtering
- `GET /api/onboarding/search-preview` - Search with political term filtering

## Frontend Integration

### Automatic Triggering
The onboarding flow automatically appears for:
- New users after registration
- Users who haven't completed onboarding within 7 days
- Users returning after email verification

### Manual Triggering
```javascript
// Show onboarding manually
onboardingFlow.show();

// Check if user needs onboarding
const progress = await fetch('/api/onboarding/progress');
if (!progress.isComplete) {
    onboardingFlow.show();
}
```

## Database Schema

New fields added to User model:
```prisma
model User {
  // Onboarding tracking
  onboardingData      Json?     // Store onboarding progress and data
  onboardingCompleted Boolean   @default(false)
  interests           String[]  @default([])
  politicalExperience String?   // new, casual, engaged, activist
  notificationPreferences Json? // Store notification settings
  displayName         String?   // User's preferred display name
}
```

## Political Term Filtering

### Filtered Terms
The system subtly filters these types of terms:
- Political parties: "republican", "democrat", "gop"
- Political labels: "liberal", "conservative", "progressive"
- Politician names: Current major political figures
- Partisan terms: "left-wing", "right-wing", "partisan"

### How It Works
1. **Silent filtering** - No error messages shown
2. **Graceful fallback** - Returns issue-based suggestions instead
3. **Subtle messaging** - "Here are some popular topics to explore"
4. **No blocked term lists** - Users never see what's being filtered

Example:
```javascript
// User searches for "republican healthcare"
// System returns healthcare-related discussions
// No indication that "republican" was filtered
```

## Onboarding Steps Detail

### 1. Welcome Step
**Purpose**: Introduce platform values and features
**Content**:
- Platform mission and values
- Key features (find reps, discussions, civic engagement)
- Community guidelines
- Non-partisan messaging

**Required**: Yes
**Data Collected**: Timestamp of viewing

### 2. Verification Step  
**Purpose**: Ensure account security
**Content**:
- Email verification status and action buttons
- Phone verification status and action buttons
- Integration with existing verification system

**Required**: Yes (redirects to verification flows)
**Data Collected**: Verification completion status

### 3. Location Step
**Purpose**: Connect users with their representatives
**Content**:
- ZIP code input (required)
- Full address input (optional for better accuracy)
- Real-time representative preview
- Integration with Google Civic API

**Required**: Yes
**Data Collected**: ZIP code, city, state, representative list
**Validation**: Live lookup via Google Civic API

### 4. Interests Step
**Purpose**: Personalize content and discussions
**Content**:
- 20 non-partisan issue categories
- Multiple selection allowed
- Visual selection with chips
- Selected interest summary

**Required**: No
**Data Collected**: Array of selected interests
**Examples**: Healthcare, Education, Economy, Environment, Infrastructure

### 5. Experience Step
**Purpose**: Tailor UX to engagement level  
**Content**:
- New to Politics - Beginner guides and educational content
- Casual Observer - News summaries and key updates
- Actively Engaged - In-depth discussions and action opportunities
- Political Activist - Advanced tools and organizing features

**Required**: No
**Data Collected**: Experience level string
**Impact**: Affects content recommendations and UI complexity

### 6. Notifications Step
**Purpose**: Set communication preferences
**Content**:
- Email notifications (updates, digest, rep activity)
- In-app notifications (mentions, discussions)
- SMS notifications (urgent only)
- Granular control over each type

**Required**: No
**Data Collected**: Notification preferences object
**Default**: Essential notifications enabled

### 7. Profile Step
**Purpose**: Help community connection
**Content**:
- Avatar upload with preview
- Display name (optional)
- Bio (500 characters max)
- Privacy notice about optional nature

**Required**: No
**Data Collected**: Avatar, display name, bio
**Privacy**: All profile fields are optional and user-controlled

## Analytics & Tracking

### Onboarding Metrics
- Total users who started onboarding
- Completion rate by step
- Drop-off points analysis
- Time to completion
- Skip rates for optional steps

### Events Tracked
- `onboarding_opened` - User started onboarding
- `step_completed` - User completed a step
- `step_skipped` - User skipped an optional step
- `onboarding_completed` - User finished all required steps
- `onboarding_closed` - User exited before completion

### Admin Analytics
```javascript
GET /api/onboarding/analytics
{
  "totalStarted": 1500,
  "totalCompleted": 1200,
  "completionRate": 80.0,
  "averageStepsCompleted": 5.2,
  "dropoffByStep": {
    "welcome": 50,
    "verification": 100,
    "location": 80,
    "interests": 30,
    "experience": 20,
    "notifications": 15,
    "profile": 10
  }
}
```

## Implementation Notes

### Performance Considerations
- Lazy loading of interest categories
- Debounced ZIP code validation  
- Efficient step state management
- Minimal API calls during navigation

### Mobile Experience  
- Full-screen modal on mobile devices
- Touch-friendly interface elements
- Swipe gestures for navigation
- Responsive grid layouts

### Accessibility
- ARIA labels for screen readers
- Keyboard navigation support
- High contrast mode compatibility
- Focus management during step transitions

### Error Handling
- Network failure recovery
- Form validation with helpful messages
- Graceful degradation for API failures
- Progress preservation during interruptions

## Development Setup

### 1. Database Migration
```bash
cd backend
npx prisma migrate dev --name add-onboarding-fields
```

### 2. Frontend Integration
The onboarding component is automatically loaded via `backend-integration.js`:
```html
<script src="/src/components/OnboardingFlow.js"></script>
```

### 3. Testing Onboarding
```javascript
// Manually trigger onboarding
onboardingFlow.show();

// Reset user's onboarding status (dev only)
await fetch('/api/onboarding/reset', { method: 'POST' });
```

### 4. Customization
Modify `OnboardingService.getPopularIssues()` to update interest categories:
```typescript
getPopularIssues(): string[] {
  return [
    'Healthcare',
    'Education', 
    'Economy & Jobs',
    // Add new categories here
  ];
}
```

## Production Considerations

### Performance
- Enable step data caching
- Optimize representative API calls
- Implement step prefetching
- Monitor completion analytics

### Security
- Validate all step data server-side
- Sanitize user inputs (bio, display name)
- Rate limit onboarding API calls
- Secure avatar upload handling

### Monitoring
- Track onboarding completion funnels
- Monitor API response times
- Alert on high drop-off rates
- Measure time-to-engagement correlation

### A/B Testing Opportunities
- Different welcome messaging
- Step order variations
- Required vs optional step combinations
- Interest category presentations
- Representative preview formats

For implementation details, see the source code in:
- Backend: `/backend/src/services/onboardingService.ts`
- Frontend: `/frontend/src/components/OnboardingFlow.js`
- Routes: `/backend/src/routes/onboarding.ts`