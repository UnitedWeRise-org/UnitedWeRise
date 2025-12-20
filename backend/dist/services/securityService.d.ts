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
    /**
     * Check if an IP address is blocked
     * @param ipAddress - IP address to check (IPv4 or IPv6)
     * @returns true if IP is blocked and block is active/not expired
     */
    static isIPBlocked(ipAddress: string): Promise<boolean>;
    /**
     * Block an IP address (manual admin action)
     * @param params - Block parameters including IP, reason, and admin ID
     * @returns Success status with block ID or error message
     */
    static blockIP(params: {
        ipAddress: string;
        reason: string;
        blockedById: string;
        expiresAt?: Date;
        metadata?: any;
    }): Promise<{
        success: boolean;
        blockId?: string;
        error?: string;
    }>;
    /**
     * Unblock an IP address
     * @param ipAddress - IP address to unblock
     * @param unblockById - Admin user ID performing the unblock
     * @returns Success status or error message
     */
    static unblockIP(ipAddress: string, unblockById: string): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Get list of blocked IPs for admin dashboard
     * @param options - Filtering options
     * @returns Array of blocked IP records with admin details
     */
    static getBlockedIPs(options?: {
        includeExpired?: boolean;
        limit?: number;
        offset?: number;
    }): Promise<any[]>;
    /**
     * Clear all blocked IPs (super-admin only action)
     * @param adminId - Super admin user ID performing the action
     * @returns Success status with count of cleared blocks
     */
    static clearAllBlockedIPs(adminId: string): Promise<{
        success: boolean;
        clearedCount: number;
        error?: string;
    }>;
    /**
     * Validate IP address format (IPv4 or IPv6)
     * @param ip - IP address string to validate
     * @returns true if valid IPv4 or IPv6 format
     */
    static isValidIPAddress(ip: string): boolean;
}
//# sourceMappingURL=securityService.d.ts.map