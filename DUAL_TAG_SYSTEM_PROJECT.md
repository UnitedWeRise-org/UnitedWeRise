# Dual Tag System Implementation Project

## Overview
Implementation of a unified tag-based routing system for posts that combines AI-generated content keywords with reserved routing tags for proper content categorization and routing.

## System Architecture

### Dual Tag Structure:
- **AI-Generated Tags**: Content keywords (`"healthcare"`, `"climate"`, `"economy"`) for search enhancement
- **Reserved Routing Tags**: System-controlled routing (`"Public Post"`, `"Volunteer"`, `"Candidate"`, `"Admin"`)

### Current Status:
- ✅ **Database Schema**: Post.tags field exists and functional
- ✅ **Backend API**: POST /api/posts accepts tags parameter
- ✅ **Volunteer System**: Implemented as proof of concept using "Volunteer" tag
- ❌ **Frontend UI**: No tag input interface yet
- ❌ **Feed Filtering**: Feeds don't filter by routing tags yet
- ❌ **Reserved Tag Protection**: AI can accidentally assign routing tags

## Implementation Phases

### Phase 1: Backend Foundation
**Priority: CRITICAL - Must complete before other phases**

#### A. Tag Validation & Reserved Tags
- Create `backend/src/services/tagService.ts`
- Update `backend/src/middleware/validation.ts` with tag validation
- Protect reserved tags: `"Public Post"`, `"Volunteer"`, `"Candidate"`, `"Admin"`
- **Files to modify**: `posts.ts`, validation middleware

#### B. AI Keyword Integration  
- Integrate with existing AI topic discovery system
- Auto-populate content keywords during post creation
- **Files to modify**: `azureOpenAIService.ts`, `posts.ts`

#### C. Post Creation Updates
- Ensure all post creation endpoints support dual tagging
- **Files to modify**: `posts.ts:17`, `topicNavigation.ts:227`

### Phase 2: Frontend Tag Input
- Add tag input UI to posting interface
- Update `createPostFromTextarea()` function for manual tags
- Tag selection and management interface
- **Files to modify**: `index.html`, post creation functions

### Phase 3: Post Retrieval & Filtering  
**Priority: HIGH - Critical for system integrity**

#### A. Feed System Updates
- Filter My Feed by `"Public Post"` tag only
- Update ProbabilityFeedService for tag-aware algorithms  
- **Files to modify**: `feed.ts`, `probabilityFeedService.ts`

#### B. All Post Query Endpoints
- Personal posts: `/api/posts/me`
- User posts: `/api/posts/user/:userId` 
- Search enhancement: `/api/search/posts`
- **Risk**: Breaking existing functionality

#### C. Frontend Display Systems
- My Feed display functions
- Profile post displays
- Trending system integration
- Search results enhancement

### Phase 4: Migration & Safety
- Database migration: Add `"Public Post"` to all existing posts
- Admin system routing enhancements
- Comprehensive testing strategy

## Risk Assessment

### HIGH RISK:
- **Feed Algorithms**: Could break My Feed if filtering not implemented correctly
- **Search System**: Must maintain backward compatibility
- **Existing Posts**: All existing posts need `"Public Post"` tag via migration

### MEDIUM RISK:
- **Candidate Posts**: Integration with existing candidate features
- **AI Keyword Conflicts**: AI accidentally assigning reserved tags

### LOW RISK:
- **UI Changes**: Tag input interface additions
- **Admin Systems**: Volunteer system already working as proof of concept

## Dependencies

### Must Complete First:
1. Reserved tag validation system
2. Migration of existing posts to include `"Public Post"` tag
3. Feed filtering implementation

### Can Be Parallel:
- Frontend UI development
- AI keyword integration  
- Search enhancements

## Testing Strategy

1. **Tag Validation Testing**: Ensure reserved tags cannot be AI-assigned
2. **Feed Algorithm Testing**: Verify My Feed still works with tag filtering
3. **Migration Testing**: Ensure all existing posts get proper tags
4. **Backward Compatibility**: All existing functionality preserved

## Success Metrics

- ✅ All existing posts continue to display correctly
- ✅ Volunteer system continues working
- ✅ My Feed only shows `"Public Post"` tagged content  
- ✅ AI keywords enhance search without breaking routing
- ✅ No accidental misrouting of posts

## Notes

- **Candidate Policy System**: Currently separate from post system, pin in for future consideration
- **Message Routing**: Websocket messaging unaffected by post tag system
- **PhotoTag System**: Completely separate from Post.tags (person tagging vs content tagging)

---
**Created**: September 5, 2025  
**Status**: Planning Phase  
**Next Action**: Implement tag validation and reserved tag protection system