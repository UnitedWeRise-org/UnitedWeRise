/**
 * User Background Image Manager
 * Manages user background images and application of backgrounds
 *
 * Functions to be migrated:
 * - applyUserBackground
 * - applyBackgroundForUser
 * - initializeUserBackground
 */

console.log('🖼️ Loading background manager...');

function applyUserBackground(backgroundImageUrl) {
    // Apply to My Profile
    const myProfileElements = document.querySelectorAll('.my-profile');
    myProfileElements.forEach(element => {
        if (backgroundImageUrl) {
            element.style.backgroundImage = `url(${backgroundImageUrl})`;
            element.classList.add('has-background');
        } else {
            element.style.backgroundImage = '';
            element.classList.remove('has-background');
        }
    });

    // Apply to My Feed main content area (corrected per documentation)
    const myFeedContent = document.getElementById('myFeedPosts');
    if (myFeedContent) {
        if (backgroundImageUrl) {
            myFeedContent.style.backgroundImage = `url(${backgroundImageUrl})`;
            myFeedContent.classList.add('has-background');
        } else {
            myFeedContent.style.backgroundImage = '';
            myFeedContent.classList.remove('has-background');
        }
    }
}

function applyBackgroundForUser(user) {
    // Function to apply background when viewing another user's profile
    if (user && user.backgroundImage) {
        // Apply to user profile elements
        const profileElements = document.querySelectorAll('.user-profile, .profile-view');
        profileElements.forEach(element => {
            element.style.backgroundImage = `url(${user.backgroundImage})`;
            element.classList.add('has-background');
        });
    }
}

// Initialize background on app load
function initializeUserBackground() {
    if (window.currentUser && window.currentUser.backgroundImage) {
        applyUserBackground(window.currentUser.backgroundImage);
    }
}

// Call this when user data is loaded
window.addEventListener('userDataLoaded', initializeUserBackground);

// Export for module system
export {
    applyUserBackground,
    applyBackgroundForUser,
    initializeUserBackground
};

// Global exposure for compatibility (temporary during migration)
if (typeof window !== 'undefined') {
    window.applyUserBackground = applyUserBackground;
    window.applyBackgroundForUser = applyBackgroundForUser;
    window.initializeUserBackground = initializeUserBackground;
    console.log('🌐 Background manager available globally');
}

console.log('✅ Background manager loaded');