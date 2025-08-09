// Device Fingerprinting Service for Anti-Bot Protection
class DeviceFingerprinting {
    constructor() {
        this.fingerprint = null;
        this.components = {};
    }

    // Generate device fingerprint
    async generateFingerprint() {
        if (this.fingerprint) return this.fingerprint;

        try {
            // Collect various browser/device characteristics
            const components = await this.collectComponents();
            
            // Create hash from components
            this.fingerprint = await this.hashComponents(components);
            this.components = components;
            
            return this.fingerprint;
        } catch (error) {
            console.error('Fingerprinting error:', error);
            return this.generateFallbackFingerprint();
        }
    }

    // Collect browser/device characteristics
    async collectComponents() {
        const components = {};

        // Screen information
        components.screen = {
            width: screen.width,
            height: screen.height,
            colorDepth: screen.colorDepth,
            pixelDepth: screen.pixelDepth
        };

        // Viewport
        components.viewport = {
            width: window.innerWidth,
            height: window.innerHeight
        };

        // Timezone
        components.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        components.timezoneOffset = new Date().getTimezoneOffset();

        // Language preferences
        components.language = navigator.language;
        components.languages = navigator.languages ? navigator.languages.join(',') : '';

        // Platform information
        components.platform = navigator.platform;
        components.userAgent = navigator.userAgent;

        // Hardware concurrency (CPU cores)
        components.hardwareConcurrency = navigator.hardwareConcurrency || 0;

        // Memory (if available)
        components.deviceMemory = navigator.deviceMemory || 0;

        // Canvas fingerprinting (basic)
        components.canvas = this.getCanvasFingerprint();

        // WebGL information
        components.webgl = this.getWebGLFingerprint();

        // Touch support
        components.touchSupport = 'ontouchstart' in window;

        // Cookie enabled
        components.cookieEnabled = navigator.cookieEnabled;

        // Do Not Track
        components.doNotTrack = navigator.doNotTrack;

        // Storage quota (if available)
        try {
            if (navigator.storage && navigator.storage.estimate) {
                const estimate = await navigator.storage.estimate();
                components.storageQuota = estimate.quota || 0;
            }
        } catch (e) {
            components.storageQuota = 0;
        }

        return components;
    }

    // Basic canvas fingerprinting
    getCanvasFingerprint() {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Draw some text and shapes
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillStyle = '#f60';
            ctx.fillRect(125, 1, 62, 20);
            ctx.fillStyle = '#069';
            ctx.fillText('United We Rise 🇺🇸', 2, 15);
            ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
            ctx.fillText('Device Check', 4, 45);

            return canvas.toDataURL().slice(22, 82); // Get partial hash
        } catch (e) {
            return 'canvas_unavailable';
        }
    }

    // Basic WebGL fingerprinting
    getWebGLFingerprint() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            
            if (!gl) return 'webgl_unavailable';

            const renderer = gl.getParameter(gl.RENDERER);
            const vendor = gl.getParameter(gl.VENDOR);
            
            return `${vendor}~${renderer}`.slice(0, 100);
        } catch (e) {
            return 'webgl_error';
        }
    }

    // Create hash from components
    async hashComponents(components) {
        const str = JSON.stringify(components, Object.keys(components).sort());
        
        // Use SubtleCrypto if available, otherwise simple hash
        if (crypto && crypto.subtle) {
            try {
                const encoder = new TextEncoder();
                const data = encoder.encode(str);
                const hashBuffer = await crypto.subtle.digest('SHA-256', data);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            } catch (e) {
                return this.simpleHash(str);
            }
        } else {
            return this.simpleHash(str);
        }
    }

    // Simple hash fallback
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(16);
    }

    // Generate fallback fingerprint if main method fails
    generateFallbackFingerprint() {
        const fallback = [
            navigator.userAgent || '',
            screen.width + 'x' + screen.height,
            navigator.language || '',
            new Date().getTimezoneOffset()
        ].join('|');
        
        return this.simpleHash(fallback);
    }

    // Get risk score based on fingerprint characteristics
    getRiskScore() {
        if (!this.components) return 0;

        let riskScore = 0;
        
        // Suspicious characteristics
        if (this.components.userAgent.includes('bot') || 
            this.components.userAgent.includes('crawler')) {
            riskScore += 50;
        }

        // Headless browser indicators
        if (!this.components.webgl || this.components.webgl === 'webgl_unavailable') {
            riskScore += 10;
        }

        // Unusual screen resolutions
        const commonResolutions = [
            '1920x1080', '1366x768', '1536x864', '1440x900', 
            '1280x720', '1024x768', '414x896', '375x667'
        ];
        const resolution = `${this.components.screen.width}x${this.components.screen.height}`;
        if (!commonResolutions.includes(resolution)) {
            riskScore += 5;
        }

        // No touch support on mobile user agent
        if (this.components.userAgent.includes('Mobile') && !this.components.touchSupport) {
            riskScore += 15;
        }

        // Unusual hardware concurrency
        if (this.components.hardwareConcurrency > 16 || this.components.hardwareConcurrency === 0) {
            riskScore += 5;
        }

        return Math.min(riskScore, 100); // Cap at 100
    }

    // Get fingerprint data for backend
    async getFingerprintData() {
        const fingerprint = await this.generateFingerprint();
        return {
            fingerprint,
            riskScore: this.getRiskScore(),
            components: {
                userAgent: this.components.userAgent,
                screen: this.components.screen,
                timezone: this.components.timezone,
                language: this.components.language,
                platform: this.components.platform
            }
        };
    }
}

// Create global instance
const deviceFingerprinting = new DeviceFingerprinting();
window.deviceFingerprinting = deviceFingerprinting;

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DeviceFingerprinting;
}