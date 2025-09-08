# Threading System Analysis

## Current Problem
- Comments are still "falling off" into invisible layers
- Backend caps depth at 2, frontend shows flattened indicator at depth >= 2
- This means depth 2 comments show as flattened, but higher depths might still exist

## Correct Logic

### Backend Rule (Database Storage)
```javascript
// When creating a new comment with parentId:
if (parentId) {
    const parent = await getParentComment(parentId);
    // HARD CAP: Never allow depth > 2
    depth = Math.min(parent.depth + 1, 2);
}
```

### Frontend Rule (Display)
```javascript  
// When displaying comments:
const actualDepth = comment.depth; // Always use backend value
const visualLayer = Math.min(actualDepth, 2); // Cap visual at layer 2
const isFlattened = actualDepth >= 2; // Show indicator for layer 2+
const marginLeft = visualLayer * 20; // 0px, 20px, 40px
```

### Visual Result
- **Depth 0**: Layer 0, no indent, no indicator
- **Depth 1**: Layer 1, 20px indent, no indicator  
- **Depth 2**: Layer 2, 40px indent, ↳ indicator
- **Depth 3+**: IMPOSSIBLE (backend caps at 2)

## Testing Scenarios

### Scenario 1: Normal Threading
1. Top-level comment (depth=0)
2. Reply to top-level (depth=1, 20px indent)
3. Reply to depth-1 comment (depth=2, 40px indent, ↳ indicator)
4. Reply to depth-2 comment (depth=2, 40px indent, ↳ indicator) ← FLATTENED

### Scenario 2: Author Continuation  
1. Author posts comment (depth=0)
2. Someone replies to author (depth=0) ← Special case
3. Reply to that reply (depth=1, 20px indent)

## Current Backend Issues to Check
1. Is depth calculation actually working?
2. Are there multiple code paths creating comments?
3. Is the transaction properly saving depth values?
4. Are existing comments in database with depth > 2?