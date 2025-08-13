export interface SecurityEventData {
    userId?: string;
    eventType: string;
    ipAddress?: string;
    userAgent?: string;
    details?: any;
    riskScore?: number;
}
export declare class SecurityService {
    static readonly EVENT_TYPES: {
        readonly LOGIN_SUCCESS: "LOGIN_SUCCESS";
        readonly LOGIN_FAILED: "LOGIN_FAILED";
        readonly PASSWORD_RESET_REQUEST: "PASSWORD_RESET_REQUEST";
        readonly PASSWORD_RESET_SUCCESS: "PASSWORD_RESET_SUCCESS";
        readonly ACCOUNT_LOCKED: "ACCOUNT_LOCKED";
        readonly MULTIPLE_FAILED_LOGINS: "MULTIPLE_FAILED_LOGINS";
        readonly SUSPICIOUS_LOGIN_LOCATION: "SUSPICIOUS_LOGIN_LOCATION";
        readonly RAPID_REQUESTS: "RAPID_REQUESTS";
        readonly EMAIL_VERIFICATION_FAILED: "EMAIL_VERIFICATION_FAILED";
        readonly SESSION_HIJACK_ATTEMPT: "SESSION_HIJACK_ATTEMPT";
        readonly UNUSUAL_USER_AGENT: "UNUSUAL_USER_AGENT";
        readonly BRUTE_FORCE_DETECTED: "BRUTE_FORCE_DETECTED";
        readonly SPAM_DETECTED: "SPAM_DETECTED";
        readonly CONTENT_VIOLATION: "CONTENT_VIOLATION";
        readonly ADMIN_ACTION: "ADMIN_ACTION";
        readonly SECURITY_ALERT: "SECURITY_ALERT";
    };
    static readonly RISK_THRESHOLDS: {
        readonly LOW: 25;
        readonly MEDIUM: 50;
        readonly HIGH: 75;
        readonly CRITICAL: 90;
    };
    /**
     * Log a security event
     */
    static logEvent(eventData: SecurityEventData): Promise<void>;
    /**
     * Handle failed login attempt
     */
    static handleFailedLogin(userId: string, ipAddress?: string, userAgent?: string): Promise<void>;
    /**
     * Handle successful login
     */
    static handleSuccessfulLogin(userId: string, ipAddress?: string, userAgent?: string): Promise<void>;
    /**
     * Check if account is locked
     */
    static isAccountLocked(userId: string): Promise<boolean>;
    /**
     * Get security events for admin dashboard
     */
    static getSecurityEvents(options?: {
        limit?: number;
        offset?: number;
        eventType?: string;
        minRiskScore?: number;
        startDate?: Date;
        endDate?: Date;
    }): Promise<any[]>;
    /**
     * Get security statistics for dashboard
     */
    static getSecurityStats(timeframe?: '24h' | '7d' | '30d'): Promise<any>;
    /**
     * Calculate risk score based on event data
     */
    private static calculateRiskScore;
    /**
     * Assess login risk based on patterns
     */
    private static assessLoginRisk;
    /**
     * Handle high-risk security events
     */
    private static handleHighRiskEvent;
    /**
     * Clean up old security events (for maintenance)
     */
    static cleanupOldEvents(daysToKeep?: number): Promise<number>;
}
//# sourceMappingURL=securityService.d.ts.map