// Force Override Old Initialization System
// This script ensures the new optimized system takes priority

console.log('🔧 Force optimization script loading...');

// Override the old functions immediately
window.originalVerifyAndSetUser = window.verifyAndSetUser;
window.verifyAndSetUser = function() {
    console.log('🚫 Blocking old verifyAndSetUser, using optimized system instead');
    
    // Use new system
    if (window.initializeApp) {
        window.initializeApp().then(result => {
            console.log('✅ Forced optimization successful:', result);
        }).catch(error => {
            console.error('💥 Forced optimization failed, falling back to old system:', error);
            if (window.originalVerifyAndSetUser) {
                window.originalVerifyAndSetUser();
            }
        });
    } else {
        console.warn('⚠️ New system not available, using old system');
        if (window.originalVerifyAndSetUser) {
            window.originalVerifyAndSetUser();
        }
    }
};

// Block old loadUserContent and loadUserPosts if they're called directly
window.originalLoadUserContent = window.loadUserContent;
window.loadUserContent = function() {
    console.log('🚫 Blocking old loadUserContent - data should come from batch initialization');
    // Don't call the old function - data should already be loaded
};

window.originalLoadUserPosts = window.loadUserPosts;
window.loadUserPosts = function() {
    console.log('🚫 Blocking old loadUserPosts - data should come from batch initialization');
    // Don't call the old function - data should already be loaded
};

// Ensure new system initializes on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    // Wait a moment for other scripts to load
    setTimeout(() => {
        if (window.apiManager && window.appInitializer) {
            console.log('🚀 Force optimization: New system ready, checking if initialization needed');
            
            // Only initialize if not already done
            if (!window.appInitializer.isAppInitialized()) {
                console.log('🚀 Force optimization: Starting new initialization');
                window.initializeApp().then(result => {
                    console.log('✅ Force optimization complete:', result);
                }).catch(error => {
                    console.error('💥 Force optimization failed:', error);
                });
            } else {
                console.log('✅ App already initialized by new system');
            }
        } else {
            console.warn('⚠️ New optimization system not available - check script loading');
        }
    }, 100);
});

console.log('🔧 Force optimization script ready');