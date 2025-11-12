/**
 * Google Ads Initialization Module
 * Initializes Google Ads tracking (gtag.js) and conversion tracking
 *
 * SECURITY: Moved from inline script to ES6 module to remove unsafe-inline from CSP
 *
 * @module google-ads-init
 */

/**
 * Initialize Google Ads tracking
 * Sets up dataLayer and gtag configuration
 */
export function initializeGoogleAds() {
  try {
    // Initialize dataLayer for Google Tag Manager
    window.dataLayer = window.dataLayer || [];

    function gtag() {
      try {
        window.dataLayer.push(arguments);
      } catch (error) {
        console.warn('⚠️ Google Ads tracking failed:', error.message);
      }
    }

    // Initialize gtag
    gtag('js', new Date());

    // Configure Google Ads - wrap in try/catch for account issues
    try {
      gtag('config', 'AW-17599542348', {
        'debug_mode': false // Set to true for debugging
      });
      console.log('📊 Google Ads configured: AW-17599542348');
    } catch (error) {
      console.warn('⚠️ Google Ads config failed:', error.message);
    }

    /**
     * Track sign-up conversion for Google Ads
     * Called when user completes registration
     */
    window.trackSignUpConversion = function() {
      try {
        gtag('event', 'conversion', {
          'send_to': 'AW-17599542348/c7nDCIjrsKQbEMzojshB'
        });
        console.log('📊 Sign-up conversion tracked successfully');
        return true;
      } catch (error) {
        console.warn('⚠️ Sign-up conversion tracking failed:', error.message);
        return false;
      }
    };

    /**
     * Track custom Google Ads events
     * @param {string} eventName - Name of the event to track
     * @param {object} parameters - Event parameters
     */
    window.trackGoogleAdsEvent = function(eventName, parameters = {}) {
      try {
        gtag('event', eventName, {
          send_to: 'AW-17599542348',
          ...parameters
        });
        console.log(`📊 Tracked: ${eventName}`, parameters);
      } catch (error) {
        console.warn(`⚠️ Failed to track ${eventName}:`, error.message);
      }
    };

    console.log('✅ Google Ads tracking initialized');
  } catch (error) {
    console.warn('⚠️ Google Ads initialization completely failed:', error.message);
    console.warn('   → Possible causes: Ad blocker, network issues, or account problems');
    console.warn('   → Site functionality not affected');
  }
}
