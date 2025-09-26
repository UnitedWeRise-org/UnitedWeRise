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

// Phase 5: Component layer
import '../components/Profile.js';

// Phase 5a: URL routing system (depends on Profile component)
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
});

console.log('✅ ES6 Module system loaded successfully');
console.log('📋 All dependencies loaded in correct order');
console.log('🎯 Modern JavaScript architecture active');