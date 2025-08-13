// Console cleanup for production - reduces debugging noise
// Add to index.html before other scripts in production

(function() {
    // Only clean up console in production (not localhost)
    if (window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1' ||
        window.location.search.includes('debug=true')) {
        return; // Keep all logs in development
    }

    // Store original console methods
    const originalLog = console.log;
    const originalInfo = console.info;

    // Filter out verbose debugging messages
    console.log = function(...args) {
        const firstArg = args[0];
        if (typeof firstArg === 'string') {
            // Skip messages that start with debug emojis or contain debug keywords
            if (firstArg.match(/^[🔍🚀📝✅❌🔄💬📊🎯🔧⚠️💥🚫📱🗺️🔽]/u) ||
                firstArg.includes('debug') || 
                firstArg.includes('Debug') ||
                firstArg.includes('initialization') ||
                firstArg.includes('Map debug') ||
                firstArg.includes('Loading for') ||
                firstArg.includes('Container found') ||
                firstArg.includes('Button found') ||
                firstArg.includes('computed width')) {
                return; // Skip verbose debug messages
            }
        }
        originalLog.apply(console, args);
    };

    console.info = function(...args) {
        const firstArg = args[0];
        if (typeof firstArg === 'string' && firstArg.match(/^[🔍🚀📝✅❌🔄💬📊]/u)) {
            return; // Skip debug info messages
        }
        originalInfo.apply(console, args);
    };

    // Keep errors and warnings intact
    // console.error and console.warn are unchanged for debugging

    console.log('🧹 Console cleanup active - debug messages filtered');
})();