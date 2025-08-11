# Map-Based Trending Comments System

## Vision & Intent

The UnitedWeRise map serves as an **interactive political conversation discovery tool** that surfaces trending discussions based on geographic jurisdiction and political scope.

### Core Functionality

**National Level (Zoom Out):**
- Shows **any trending posts with national relevance** across all topics
- **Summaries of state-level conversations** that have national implications  
- **Summaries of district-level conversations** that are trending nationally
- Topics: Any politically relevant discussions, federal policies, major state events with national impact
- Data source: All trending conversations, prioritized by national relevance + engagement

**State Level (Zoom to User's State):**
- **Automatically flies to user's state** (from profile database)
- Shows **state-specific trending comments/conversations**
- **District-level conversation summaries** within the state
- **Events occurring within the state** (localized to actual event coordinates)
- Topics: State politics, governor races, state legislation, district races, local events with state impact
- Data source: Conversations within user's state + district summaries + event data

**Local Level (Zoom to User's District):**
- **Local trending comments** within user's district/area
- **Events in local area** (city council, school board, local politics)  
- **Secure location handling**: Comments localized arbitrarily within district (not exact user location)
- Topics: Municipal politics, local elections, community events, school board meetings
- Data source: District-level conversations + local events (with privacy protection)

### User Experience Flow

1. **User selects jurisdiction level** (National/State/Local buttons)
2. **Map displays relevant boundaries** for that jurisdiction level
3. **Trending comment popups appear** as periodic overlays on the map
4. **Popup content shows:**
   - Brief comment summary or excerpt
   - Topic/context (e.g., "Re: Mayor's Budget Proposal")
   - Engagement metrics (replies, reactions)
   - Source jurisdiction (e.g., "Austin, TX" or "Ohio")

5. **User interaction:**
   - **Interested**: Click popup → Navigate to full conversation
   - **Not interested**: Popup auto-dismisses after timeout
   - **Next**: New trending comment appears after interval

### Technical Implementation Goals

**API Integration:**
- Fetch trending comments by jurisdiction level and geographic bounds
- Filter comments by engagement metrics and recency
- Include metadata: location, topic, engagement stats

**Map Display:**
- Position popups based on comment origin coordinates
- Cycle through multiple trending items with smooth transitions  
- Responsive popup sizing for different screen sizes

**Navigation:**
- Clicking popup navigates to full conversation thread
- Preserve user's map position and zoom level
- Smooth transition back to map after conversation viewing

### Data Flow

```
User clicks "State" → Map bounds set to state level → 
API call for state trending comments → 
Popups display with state-specific content →
User clicks interesting popup → 
Navigate to full conversation
```

This transforms the map from a static geographic tool into a **dynamic discovery mechanism** for political conversations happening at different levels of government.

## Security & Privacy Considerations

### Personal Location Data Security
- **Never expose exact user locations** in map popups or coordinates
- **User's state/district from profile** used for filtering, not live location tracking
- **Comment locations randomized** within district boundaries to prevent doxxing
- **Event locations** use official venues (city hall, etc.) not personal addresses

### Data Handling
- **Profile-based geography**: Use saved state/district from user registration
- **No GPS tracking**: Map functionality based on profile data, not device location
- **Anonymized positioning**: Trending comments shown at random coordinates within jurisdiction
- **Official venues only**: Events shown at public buildings, not private locations

### Comment Privacy
- **District-level aggregation**: Local comments aggregated to district level
- **Summary-based display**: Sensitive local discussions shown as summaries
- **Official event coordinates**: School board meetings, city council at official buildings
- **No personal address correlation**: Comments never tied to residential addresses