/**
 * Loading Overlay Failsafe Module
 * Critical UX fix for stuck loading screens on mobile devices
 *
 * SECURITY: Moved from inline script to ES6 module to remove unsafe-inline from CSP
 *
 * @module loading-overlay-failsafe
 */

/**
 * Initialize loading overlay failsafe
 * Automatically hides stuck loading overlays after 15 seconds
 */
export function initLoadingOverlayFailsafe() {
  console.log('🔧 CRITICAL: Loading overlay failsafe activated');

  // Function to forcefully hide loading overlay
  function forceHideLoadingOverlay() {
    const overlay = document.getElementById('page-loading-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
      overlay.style.display = 'none'; // Double guarantee
      console.log('✅ CRITICAL: Loading overlay forcefully hidden');
    }
  }

  // Hide immediately on mobile
  const isMobile = window.innerWidth <= 767 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isMobile) {
    console.log('📱 CRITICAL: Mobile detected - hiding overlay immediately');
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', forceHideLoadingOverlay);
    } else {
      forceHideLoadingOverlay();
    }
  }

  // Absolute failsafe: Hide after 2 seconds no matter what
  setTimeout(function() {
    console.log('⏱️ CRITICAL: 2-second failsafe triggered');
    forceHideLoadingOverlay();
  }, 2000);

  // Additional failsafe: Hide after 5 seconds (for slow connections)
  setTimeout(function() {
    console.log('⏱️ CRITICAL: 5-second emergency failsafe triggered');
    forceHideLoadingOverlay();
  }, 5000);
}
