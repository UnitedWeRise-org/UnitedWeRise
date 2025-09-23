# Frontend Development Guide
**ES6 Module System & Modern JavaScript Standards**

## 🎯 Overview

This guide documents the modern ES6 module system implemented in the United We Rise frontend, providing developers with the knowledge to work effectively with our modern JavaScript architecture.

## 🏗️ Architecture

### Module System Design

**Core Principle**: Single entry point with explicit dependency management

```html
<!-- Entry Point -->
<script type="module" src="src/js/main.js"></script>
```

### Dependency Graph

```
main.js (Orchestration)
│
├── utils/environment.js          # Core utilities (no dependencies)
├── config/api.js                 # Configuration (depends on environment)
├── config/stripe.js              # Payment config (depends on environment)
├── integrations/backend-integration.js  # Integration layer (depends on api)
├── js/websocket-client.js        # Real-time communication (depends on environment)
├── components/Profile.js         # UI components (depends on environment)
├── js/map-maplibre.js            # Map visualization (depends on environment)
├── js/relationship-utils.js      # Social utilities (depends on environment)
└── js/app-initialization.js      # Application startup (orchestrates everything)
```

## 📚 Module Standards

### Import Patterns

```javascript
// Named imports (preferred)
import { getEnvironment, isDevelopment, getApiBaseUrl } from '../utils/environment.js';

// Multiple imports from same module
import {
    API_CONFIG,
    buildApiUrl,
    getHeaders
} from '../config/api.js';

// Class imports
import { Profile } from '../components/Profile.js';
import { UWRMapLibre } from '../js/map-maplibre.js';

// Relative path requirements
// ✅ Correct: '../utils/environment.js'
// ❌ Incorrect: '../utils/environment' (missing .js)
```

### Export Patterns

```javascript
// Named exports (standard approach)
export { ClassName, functionName, CONSTANT_VALUE };

// Class export
export class ComponentName {
    constructor() {
        // implementation
    }
}

// Function export
export function utilityFunction(param) {
    return result;
}

// Constant export
export const CONFIG_VALUE = 'value';
```

### Legacy Compatibility

**During Transition**: All modules maintain global exports for backward compatibility

```javascript
// ES6 Module Export (modern)
export { Profile, showProfile, toggleProfile };

// Legacy Global Export (compatibility)
if (typeof window !== 'undefined') {
    window.Profile = Profile;
    window.showProfile = showProfile;
    window.toggleProfile = toggleProfile;
}

// Console logging for verification
console.log('👤 Profile component loaded via ES6 module');
```

## 🔧 Development Workflow

### Creating New Modules

#### 1. Create Module File
```bash
# Create new component
touch frontend/src/components/NewComponent.js
```

#### 2. Implement ES6 Module Structure
```javascript
// src/components/NewComponent.js
import { getEnvironment, isDevelopment } from '../utils/environment.js';
import { API_CONFIG } from '../config/api.js';

class NewComponent {
    constructor() {
        this.environment = getEnvironment();
        this.apiBase = API_CONFIG.BASE_URL;
        this.init();
    }

    init() {
        // Component initialization
        if (isDevelopment()) {
            console.log('🆕 NewComponent initialized in development mode');
        }
    }

    // Component methods
    someMethod() {
        // Implementation
    }
}

// ES6 Export
export { NewComponent };

// Legacy Compatibility
window.NewComponent = NewComponent;

console.log('🆕 NewComponent loaded via ES6 module');
```

#### 3. Add to Dependency Chain
```javascript
// Add import to src/js/main.js in correct order
import '../components/NewComponent.js';
```

#### 4. Verify Loading
- Check browser console for loading messages
- Verify no import/export errors
- Test component functionality

### Modifying Existing Modules

#### 1. Locate Module Dependencies
```bash
# Find where module is imported
grep -r "import.*ComponentName" frontend/src/

# Find what module imports
grep -r "from.*module-name" frontend/src/
```

#### 2. Update Import/Export Statements
```javascript
// Add new imports at top
import { newFunction } from '../utils/newUtility.js';

// Add new exports at bottom
export { existingClass, newFunction };
```

#### 3. Maintain Backward Compatibility
```javascript
// Update global exports
window.newFunction = newFunction;
```

## 🚨 Common Patterns & Best Practices

### Environment Detection
```javascript
// ✅ Always use centralized functions
import { isDevelopment, getApiBaseUrl } from '../utils/environment.js';

if (isDevelopment()) {
    console.log('Debug info');
}

const apiUrl = getApiBaseUrl();

// ❌ Never use direct checks
// if (window.location.hostname.includes('dev')) { }
// if (process.env.NODE_ENV === 'development') { }
```

### API Configuration
```javascript
// ✅ Use centralized API config
import { API_CONFIG } from '../config/api.js';

const response = await fetch(API_CONFIG.url('users/profile'));

// ❌ Don't hardcode URLs
// const response = await fetch('https://api.unitedwerise.org/api/users/profile');
```

### Component Initialization
```javascript
// ✅ Auto-initialization pattern
class Component {
    constructor() {
        this.init();
    }

    init() {
        // Setup component
        document.addEventListener('DOMContentLoaded', () => {
            this.bindEvents();
        });
    }
}

// Auto-create instance
const componentInstance = new Component();

// Export both class and instance
export { Component, componentInstance };
```

### Error Handling
```javascript
// ✅ Consistent error handling
import { isDevelopment } from '../utils/environment.js';

try {
    // Operation
} catch (error) {
    if (isDevelopment()) {
        console.error('Component Error:', error);
    }

    // Handle error gracefully
    this.handleError(error);
}
```

## 🔍 Debugging & Troubleshooting

### Module Loading Issues

**"Cannot use import statement outside a module"**
- Ensure `<script type="module">` is used
- Check that file has proper `.js` extension in imports
- Verify browser supports ES6 modules

**Import/Export Errors**
```bash
# Check import paths
grep -n "import.*from" src/components/Problem.js

# Verify exports exist
grep -n "export" src/utils/target-module.js

# Check for circular dependencies
# Use browser dev tools Network tab to see module loading order
```

### Console Debugging
```javascript
// Module loading verification
console.log('🌍 Environment:', getEnvironment());
console.log('🔗 API Base:', getApiBaseUrl());
console.log('📊 API Config:', API_CONFIG);

// Check module availability
console.log('Available modules:', {
    Profile: typeof Profile,
    UWRMapLibre: typeof UWRMapLibre,
    FollowUtils: typeof FollowUtils
});
```

### Browser DevTools
- **Network Tab**: Verify all modules load successfully (200 status)
- **Console Tab**: Check for import/export errors
- **Sources Tab**: Set breakpoints in module files
- **Application Tab**: Verify no CORS issues with module loading

## 📋 Migration Checklist

### Converting Legacy Script to ES6 Module

- [ ] Add ES6 imports at top of file
- [ ] Convert function declarations to exports
- [ ] Update any direct global references to use imports
- [ ] Add module to main.js import chain
- [ ] Test loading in browser
- [ ] Verify no console errors
- [ ] Maintain global exports for compatibility
- [ ] Update documentation

### Verification Steps

- [ ] Module loads without errors
- [ ] All imports resolve correctly
- [ ] Exports are accessible
- [ ] Legacy global exports still work
- [ ] No circular dependencies
- [ ] Performance is maintained
- [ ] Browser compatibility confirmed

## 🚀 Advanced Patterns

### Dynamic Imports (Future Enhancement)
```javascript
// Lazy loading for performance
async function loadMapModule() {
    const { UWRMapLibre } = await import('../js/map-maplibre.js');
    return new UWRMapLibre();
}
```

### Module Factories
```javascript
// Factory pattern for component creation
export function createComponent(type, options) {
    switch (type) {
        case 'profile':
            return new Profile(options);
        case 'map':
            return new UWRMapLibre(options);
        default:
            throw new Error(`Unknown component type: ${type}`);
    }
}
```

### Configuration Modules
```javascript
// Centralized configuration
export const COMPONENT_CONFIG = {
    profile: {
        autoLoad: true,
        refreshInterval: 30000
    },
    map: {
        defaultZoom: 10,
        maxMarkers: 100
    }
};
```

## 📚 Additional Resources

- **MDN ES6 Modules**: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules
- **Module Best Practices**: https://web.dev/es-modules-in-browsers/
- **Project Documentation**: [MASTER_DOCUMENTATION.md](./MASTER_DOCUMENTATION.md)
- **Migration History**: [ES6-MIGRATION-PLAN.md](./ES6-MIGRATION-PLAN.md)

---

**Last Updated**: September 23, 2025
**Module System Version**: ES6 Production Ready
**Browser Support**: All modern browsers (ES2015+)