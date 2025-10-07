/**
 * Main ES6 Module Entry Point
 * Modern JavaScript module loader for United We Rise Frontend
 *
 * This replaces the old script tag loading system with proper ES6 module imports
 * following industry standards for dependency management and load order.
 */

console.log('🚀 Loading modern ES6 module system...');

// Phase 1: Core utilities (no dependencies)
import '../utils/environment.js';

// Phase 2: Configuration layer (depends on environment)
import '../config/api.js';

// Phase 3: Integration layer (depends on config)
import '../integrations/backend-integration.js';

// Phase 4: WebSocket and real-time services
import './websocket-client.js';

// Phase 4a: Authentication handlers (depends on API integration)
import '../handlers/auth-handlers.js';

// Phase 4b: Navigation handlers (depends on authentication)
import '../handlers/navigation-handlers.js';

// Phase 4c: Search handlers (depends on navigation and API integration)
import '../handlers/search-handlers.js';

// Phase 4d: Modal handlers (About and Volunteer modals)
import '../handlers/modal-handlers.js';

// Phase 4e: Content handlers (MOTD, trending, officials, conversations)
import '../handlers/content-handlers.js';

// Phase 4f: Relationship handlers (friends, following, social connections)
import '../handlers/relationship-handlers.js';

// Phase 4g: Map handlers (map initialization, controls, visualization)
import '../handlers/map-handlers.js';

// Phase 4h: Civic handlers (officials, profile, radio controls)
import '../handlers/civic-handlers.js';

// Phase 4i: Notification handlers (notification system, badges, toasts)
import '../handlers/notification-handlers.js';

// Phase 4j-unified: Unified Post Creator (consolidated posting system)
import '../modules/features/content/UnifiedPostCreator.js';

// Phase 4j-renderer: Unified Post Renderer (consolidated display system)
import '../modules/features/content/UnifiedPostRenderer.js';

// Phase 5: Component layer
import '../components/PostComponent.js';
import '../components/Profile.js';
import '../components/QuestProgressTracker.js';
import '../components/BadgeVault.js';

// Phase 5a: Mobile UX Components
import '../components/MobileBottomBar.js';
import '../components/TopBarController.js';
import '../components/FeedToggle.js';

// Phase 4j: My Feed handlers (personalized feed system)
import '../handlers/my-feed.js';

// Phase 4k: Trending handlers (topic mode, geographic scope, AI topics)
import '../handlers/trending-handlers.js';

// Phase 5b: URL routing system (depends on Profile component)
import '../utils/username-router.js';

// Phase 5b: Payment systems (require Stripe.js and API integration)
import { initializeDonationSystem } from './donation-system.js';

// Phase 6: Map and visualization
import './map-maplibre.js';
import './relationship-utils.js';

// Phase 7: Application initialization (orchestrates everything)
import './app-initialization.js';

// Phase 8: Service initialization (after DOM and dependencies are ready)
document.addEventListener('DOMContentLoaded', () => {
    // Initialize search handlers
    if (window.SearchHandlers) {
        window.searchHandlers = new window.SearchHandlers();
        console.log('🔍 Search handlers initialized');
    }

    // Initialize payment systems
    initializeDonationSystem();
    console.log('💳 Payment systems initialized');

    // Performance optimizations (migrated from index.html inline script)
    console.log('🚀 Initializing performance optimizations...');

    // Wrap apiCall with performance optimization if available
    if (window.createOptimizedApiCall && window.apiCall) {
        const originalApiCall = window.apiCall;
        window.apiCall = window.createOptimizedApiCall(originalApiCall);
        console.log('✅ API calls optimized with caching and retry');
    }

    // Wrap apiCall with error handling if available
    if (window.createErrorAwareApiCall && window.apiCall) {
        const currentApiCall = window.apiCall;
        window.apiCall = window.createErrorAwareApiCall(currentApiCall);
        console.log('✅ API calls enhanced with user-friendly error handling');
    }

    // Preload critical content
    if (window.performanceOptimizer) {
        window.performanceOptimizer.preloadCriticalContent();
    }

    console.log('🎉 Performance optimizations active!');
});

console.log('✅ ES6 Module system loaded successfully');
console.log('📋 All dependencies loaded in correct order');
console.log('🎯 Modern JavaScript architecture active');