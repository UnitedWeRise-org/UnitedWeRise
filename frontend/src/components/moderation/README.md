# Content Moderation System - Phase 4 Implementation

## Overview

This directory contains the complete user-facing content warning system for UnitedWeRise. The system provides professional, accessible content warnings for sensitive material while maintaining excellent user experience.

## Components

### 1. ContentWarningScreen.js
**Primary content warning overlay component**

- **Purpose**: Display warning screens for sensitive content before user approval
- **Features**: User preferences, accessibility compliance, mobile responsive
- **Integration**: Called by PostComponent when contentFlags are present

```javascript
// Usage Example
const warningScreen = new ContentWarningScreen();
if (warningScreen.shouldHideContent(post.contentFlags)) {
    const html = warningScreen.renderWarningScreen(post.contentFlags, post.id);
}
```

### 2. SensitiveContentViewer.js
**Content viewer with user controls after approval**

- **Purpose**: Wrap approved sensitive content with hide/report controls
- **Features**: Content flag indicators, feedback system, report modal
- **Integration**: Called after user approves viewing sensitive content

```javascript
// Usage Example
const sensitiveViewer = new SensitiveContentViewer();
const wrappedContent = sensitiveViewer.wrapSensitiveContent(
    originalHTML,
    contentFlags,
    postId
);
```

### 3. index.js (ContentModerationManager)
**Central coordination and initialization**

- **Purpose**: Initialize and coordinate all content moderation components
- **Features**: Event coordination, preference management, error handling
- **Integration**: Auto-initializes on DOM ready, provides global access

## Quick Start

### 1. ES6 Module Integration
Add to your main.js file:
```javascript
import '../components/moderation/index.js';
```

### 2. PostComponent Integration
The PostComponent.js has been updated to automatically check for content flags and apply warnings. No additional configuration needed.

### 3. Backend API Requirements
Update your `/feed/` endpoint to include contentFlags:
```javascript
{
  id: "post-123",
  content: "Post content...",
  contentFlags: {
    graphicNews: true,
    medicalContent: false,
    disturbingContent: false,
    violence: false,
    accidents: false
  }
}
```

## Content Flag Types

| Flag | Description | Example Use Case |
|------|-------------|------------------|
| `graphicNews` | Graphic news content | War imagery, violence in news |
| `medicalContent` | Medical/educational content | Medical procedures, anatomy |
| `disturbingContent` | Generally disturbing material | Accidents, injury aftermath |
| `violence` | Violent content | Fighting, aggressive behavior |
| `accidents` | Accident footage | Car crashes, workplace accidents |

## User Experience Flow

```
1. User scrolls through feed
2. Post with contentFlags loads
3. System checks user preferences
4. If content should be hidden:
   a. Show ContentWarningScreen
   b. User chooses "View" or "Hide"
   c. If "View": Show SensitiveContentViewer
   d. User can hide, report, or provide feedback
5. If content not hidden: Show normal post
```

## User Preferences

Users can configure content filtering through:
- Warning screen "Content Settings" link
- Individual "Remember my choice" checkboxes
- Settings modal with granular controls

Preferences are stored in localStorage and persist across sessions.

## Accessibility Features

### Keyboard Navigation
- **Tab**: Navigate between interactive elements
- **Enter/Space**: Activate buttons
- **Escape**: Hide content warning (same as "Keep Hidden")

### Screen Reader Support
- ARIA labels and descriptions on all interactive elements
- Live regions for dynamic content updates
- Proper heading hierarchy and semantic markup

### Visual Accessibility
- High contrast mode support
- Reduced motion preference support
- Clear focus indicators
- Touch-friendly sizing on mobile devices

## Mobile Responsive Design

### Breakpoints
- **768px and below**: Tablet layout adjustments
- **480px and below**: Mobile-specific optimizations

### Mobile Features
- Touch-friendly button sizes (44px minimum)
- Optimized layouts for small screens
- Swipe-friendly interactions
- Reduced cognitive load with simplified interfaces

## Error Handling

### Graceful Degradation
- System works without contentFlags (shows normal posts)
- Individual component failures don't break entire system
- Fallback styling if CSS fails to load
- Admin-only error logging

### User-Facing Errors
- Clear error messages for failed operations
- Retry mechanisms for network issues
- Helpful guidance for accessibility users
- Contact information for support

## Performance Considerations

### Optimization Features
- Lazy loading of modal components
- Event delegation for dynamic content
- Minimal DOM manipulation
- CSS-only animations where possible

### Bundle Size
- Components are modular and tree-shakeable
- No external dependencies required
- Shared utility functions to reduce duplication

## Testing Guidelines

### Manual Testing Checklist
- [ ] Content warnings display correctly
- [ ] User preferences save and load
- [ ] Mobile responsive behavior
- [ ] Keyboard navigation works
- [ ] Screen reader compatibility
- [ ] Error handling scenarios

### Test Content Flags
```javascript
// Test data for development
const testPost = {
  id: "test-123",
  content: "Test post with sensitive content",
  contentFlags: {
    graphicNews: true,
    confidence: 0.85
  }
};
```

## Development Workflow

### Local Development
1. Ensure PostComponent.js includes latest moderation integration
2. Add moderation import to main.js
3. Test with mock contentFlags data
4. Verify responsive behavior

### Staging Deployment
1. Deploy all moderation component files
2. Update main.js import
3. Test user workflows
4. Verify backend integration

### Production Deployment
1. Ensure backend provides contentFlags
2. Monitor user interaction analytics
3. Collect feedback on warning accuracy
4. Iterate based on user behavior

## Support and Maintenance

### Admin Debugging
For admin users, the system provides enhanced logging:
```javascript
// Check system status
console.log(window.contentModerationManager.getStatus());

// View current user preferences
console.log(window.contentModerationManager.userPreferences);
```

### Common Issues
1. **Content warnings not showing**: Check that contentFlags are present in post data
2. **Preferences not saving**: Verify localStorage is available and not full
3. **Mobile layout issues**: Test on actual devices, not just browser dev tools
4. **Accessibility problems**: Test with actual screen readers and keyboard navigation

### Updates and Maintenance
- Component versions are tracked in individual file headers
- System status available via contentModerationManager.getStatus()
- Error logging provides debugging information for issues
- User feedback system helps identify areas for improvement

## Browser Support

### Minimum Requirements
- ES6 module support (all modern browsers)
- localStorage support
- CSS Grid and Flexbox support
- Modern event handling (addEventListener)

### Tested Browsers
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Polyfills
No polyfills required for target browser support.

---

For technical support or feature requests, please refer to the project's main documentation or contact the development team.