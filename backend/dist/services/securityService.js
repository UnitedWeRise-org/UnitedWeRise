"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityService = void 0;
const prisma_1 = require("../lib/prisma");
;
const logger_1 = require("./logger");
class SecurityService {
    // Event type constants
    static EVENT_TYPES = {
        LOGIN_SUCCESS: 'LOGIN_SUCCESS',
        LOGIN_FAILED: 'LOGIN_FAILED',
        PASSWORD_RESET_REQUEST: 'PASSWORD_RESET_REQUEST',
        PASSWORD_RESET_SUCCESS: 'PASSWORD_RESET_SUCCESS',
        ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
        MULTIPLE_FAILED_LOGINS: 'MULTIPLE_FAILED_LOGINS',
        SUSPICIOUS_LOGIN_LOCATION: 'SUSPICIOUS_LOGIN_LOCATION',
        RAPID_REQUESTS: 'RAPID_REQUESTS',
        EMAIL_VERIFICATION_FAILED: 'EMAIL_VERIFICATION_FAILED',
        SESSION_HIJACK_ATTEMPT: 'SESSION_HIJACK_ATTEMPT',
        UNUSUAL_USER_AGENT: 'UNUSUAL_USER_AGENT',
        BRUTE_FORCE_DETECTED: 'BRUTE_FORCE_DETECTED',
        SPAM_DETECTED: 'SPAM_DETECTED',
        CONTENT_VIOLATION: 'CONTENT_VIOLATION',
        ADMIN_ACTION: 'ADMIN_ACTION',
        SECURITY_ALERT: 'SECURITY_ALERT'
    };
    // Risk score thresholds
    static RISK_THRESHOLDS = {
        LOW: 25,
        MEDIUM: 50,
        HIGH: 75,
        CRITICAL: 90
    };
    /**
     * Log a security event
     */
    static async logEvent(eventData) {
        try {
            const riskScore = eventData.riskScore || this.calculateRiskScore(eventData);
            await prisma_1.prisma.securityEvent.create({
                data: {
                    userId: eventData.userId || null,
                    eventType: eventData.eventType,
                    ipAddress: eventData.ipAddress || null,
                    userAgent: eventData.userAgent || null,
                    details: eventData.details || null,
                    riskScore
                }
            });
            // If this is a high-risk event, check for additional security measures
            if (riskScore >= this.RISK_THRESHOLDS.HIGH) {
                await this.handleHighRiskEvent(eventData, riskScore);
            }
            logger_1.logger.info({ eventType: eventData.eventType, riskScore }, 'Security event logged');
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to log security event');
            // Don't throw - security logging failures shouldn't break the app
        }
    }
    /**
     * Handle failed login attempt
     */
    static async handleFailedLogin(userId, ipAddress, userAgent) {
        try {
            // Get current user data
            const user = await prisma_1.prisma.user.findUnique({
                where: { id: userId }
            });
            if (!user)
                return;
            const newAttempts = (user.loginAttempts || 0) + 1;
            const shouldLock = newAttempts >= 5; // Lock after 5 failed attempts
            const updateData = {
                loginAttempts: newAttempts,
                suspiciousActivityCount: user.suspiciousActivityCount + 1
            };
            if (shouldLock) {
                updateData.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes lockout
            }
            // Update user
            await prisma_1.prisma.user.update({
                where: { id: userId },
                data: updateData
            });
            // Log security event
            await this.logEvent({
                userId,
                eventType: shouldLock ? this.EVENT_TYPES.ACCOUNT_LOCKED : this.EVENT_TYPES.LOGIN_FAILED,
                ipAddress,
                userAgent,
                details: {
                    attempts: newAttempts,
                    locked: shouldLock,
                    lockoutMinutes: shouldLock ? 15 : undefined
                },
                riskScore: shouldLock ? 80 : 20 + (newAttempts * 10)
            });
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Failed to handle failed login');
        }
    }
    /**
     * Handle successful login
     */
    static async handleSuccessfulLogin(userId, ipAddress, userAgent) {
        try {
            const updateData = {
                lastLoginAt: new Date(),
                lastLoginIp: ipAddress,
                loginAttempts: 0 // Reset failed attempts on successful login
            };
            await prisma_1.prisma.user.update({
                where: { id: userId },
                data: updateData
            });
            // Check for suspicious login patterns
            const riskScore = await this.assessLoginRisk(userId, ipAddress, userAgent);
            await this.logEvent({
                userId,
                eventType: this.EVENT_TYPES.LOGIN_SUCCESS,
                ipAddress,
                userAgent,
                details: {
                    previousLoginIp: ipAddress,
                    locationChanged: false // TODO: Implement geo-location checking
                },
                riskScore
            });
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Failed to handle successful login');
        }
    }
    /**
     * Check if account is locked
     */
    static async isAccountLocked(userId) {
        try {
            const user = await prisma_1.prisma.user.findUnique({
                where: { id: userId },
                select: { lockedUntil: true }
            });
            return user?.lockedUntil ? new Date() < user.lockedUntil : false;
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Failed to check account lock status');
            return false;
        }
    }
    /**
     * Get security events for admin dashboard
     */
    static async getSecurityEvents(options = {}) {
        try {
            const { limit = 100, offset = 0, eventType, minRiskScore = 0, startDate, endDate } = options;
            const where = {
                riskScore: { gte: minRiskScore }
            };
            if (eventType)
                where.eventType = eventType;
            if (startDate && endDate) {
                where.createdAt = {
                    gte: startDate,
                    lte: endDate
                };
            }
            return await prisma_1.prisma.securityEvent.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                            isAdmin: true,
                            isModerator: true
                        }
                    }
                },
                orderBy: [
                    { riskScore: 'desc' },
                    { createdAt: 'desc' }
                ],
                take: limit,
                skip: offset
            });
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to get security events');
            return [];
        }
    }
    /**
     * Get security statistics for dashboard
     */
    static async getSecurityStats(timeframe = '24h') {
        try {
            const hours = timeframe === '24h' ? 24 : timeframe === '7d' ? 168 : 720;
            const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);
            const [totalEvents, failedLogins, highRiskEvents, uniqueIPs, lockedAccounts, avgRiskScore] = await Promise.all([
                prisma_1.prisma.securityEvent.count({
                    where: { createdAt: { gte: startDate } }
                }),
                prisma_1.prisma.securityEvent.count({
                    where: {
                        eventType: this.EVENT_TYPES.LOGIN_FAILED,
                        createdAt: { gte: startDate }
                    }
                }),
                prisma_1.prisma.securityEvent.count({
                    where: {
                        riskScore: { gte: this.RISK_THRESHOLDS.HIGH },
                        createdAt: { gte: startDate }
                    }
                }),
                prisma_1.prisma.securityEvent.findMany({
                    where: {
                        createdAt: { gte: startDate },
                        ipAddress: { not: null }
                    },
                    select: { ipAddress: true },
                    distinct: ['ipAddress']
                }),
                prisma_1.prisma.user.count({
                    where: {
                        lockedUntil: { gt: new Date() }
                    }
                }),
                prisma_1.prisma.securityEvent.aggregate({
                    where: { createdAt: { gte: startDate } },
                    _avg: { riskScore: true }
                })
            ]);
            return {
                totalEvents,
                failedLogins,
                highRiskEvents,
                uniqueIPs: uniqueIPs.length,
                lockedAccounts,
                avgRiskScore: Math.round(avgRiskScore._avg.riskScore || 0),
                timeframe,
                generatedAt: new Date().toISOString()
            };
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to get security stats');
            return {
                totalEvents: 0,
                failedLogins: 0,
                highRiskEvents: 0,
                uniqueIPs: 0,
                lockedAccounts: 0,
                avgRiskScore: 0,
                error: 'Failed to load security statistics'
            };
        }
    }
    /**
     * Calculate risk score based on event data
     */
    static calculateRiskScore(eventData) {
        let score = 0;
        // Base scores by event type
        const eventScores = {
            [this.EVENT_TYPES.LOGIN_FAILED]: 20,
            [this.EVENT_TYPES.PASSWORD_RESET_REQUEST]: 10,
            [this.EVENT_TYPES.MULTIPLE_FAILED_LOGINS]: 40,
            [this.EVENT_TYPES.ACCOUNT_LOCKED]: 70,
            [this.EVENT_TYPES.SUSPICIOUS_LOGIN_LOCATION]: 60,
            [this.EVENT_TYPES.RAPID_REQUESTS]: 50,
            [this.EVENT_TYPES.SESSION_HIJACK_ATTEMPT]: 90,
            [this.EVENT_TYPES.BRUTE_FORCE_DETECTED]: 85,
            [this.EVENT_TYPES.SPAM_DETECTED]: 30,
            [this.EVENT_TYPES.LOGIN_SUCCESS]: 5,
            [this.EVENT_TYPES.PASSWORD_RESET_SUCCESS]: 15
        };
        score += eventScores[eventData.eventType] || 10;
        // Additional risk factors from details
        if (eventData.details) {
            const details = eventData.details;
            if (details.newLocation)
                score += 25;
            if (details.multipleFailures)
                score += 30;
            if (details.rateLimitHit)
                score += 20;
            if (details.unusualUserAgent)
                score += 15;
            if (details.rapidSuccession)
                score += 25;
            if (details.adminAction)
                score += 40;
        }
        return Math.min(score, 100); // Cap at 100
    }
    /**
     * Assess login risk based on patterns
     */
    static async assessLoginRisk(userId, ipAddress, userAgent) {
        try {
            let riskScore = 5; // Base score for successful login
            // Check recent failed attempts from this IP
            if (ipAddress) {
                const recentFailures = await prisma_1.prisma.securityEvent.count({
                    where: {
                        ipAddress,
                        eventType: this.EVENT_TYPES.LOGIN_FAILED,
                        createdAt: {
                            gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
                        }
                    }
                });
                if (recentFailures > 0) {
                    riskScore += recentFailures * 10;
                }
            }
            // Check for rapid login attempts
            const recentLogins = await prisma_1.prisma.securityEvent.count({
                where: {
                    userId,
                    eventType: this.EVENT_TYPES.LOGIN_SUCCESS,
                    createdAt: {
                        gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
                    }
                }
            });
            if (recentLogins > 3) {
                riskScore += 30;
            }
            return Math.min(riskScore, 100);
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Failed to assess login risk');
            return 5;
        }
    }
    /**
     * Handle high-risk security events
     */
    static async handleHighRiskEvent(eventData, riskScore) {
        try {
            logger_1.logger.warn({ eventType: eventData.eventType, riskScore }, 'HIGH RISK SECURITY EVENT');
            // Additional logging for critical events
            if (riskScore >= this.RISK_THRESHOLDS.CRITICAL) {
                logger_1.logger.error({
                    eventType: eventData.eventType,
                    userId: eventData.userId,
                    ipAddress: eventData.ipAddress,
                    details: eventData.details,
                    timestamp: new Date().toISOString()
                }, 'CRITICAL SECURITY EVENT');
                // TODO: Implement additional security measures:
                // - Send email alerts to admins
                // - Temporarily increase rate limiting for the IP
                // - Create security incident ticket
            }
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to handle high-risk event');
        }
    }
    /**
     * Clean up old security events (for maintenance)
     */
    static async cleanupOldEvents(daysToKeep = 90) {
        try {
            const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
            const result = await prisma_1.prisma.securityEvent.deleteMany({
                where: {
                    createdAt: { lt: cutoffDate },
                    riskScore: { lt: this.RISK_THRESHOLDS.HIGH } // Keep high-risk events longer
                }
            });
            logger_1.logger.info({ count: result.count }, 'Cleaned up old security events');
            return result.count;
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to cleanup old security events');
            return 0;
        }
    }
    // ============================================================
    // IP BLOCKING METHODS
    // ============================================================
    /**
     * Check if an IP address is blocked
     * @param ipAddress - IP address to check (IPv4 or IPv6)
     * @returns true if IP is blocked and block is active/not expired
     */
    static async isIPBlocked(ipAddress) {
        try {
            const blocked = await prisma_1.prisma.blockedIP.findFirst({
                where: {
                    ipAddress,
                    isActive: true,
                    OR: [
                        { expiresAt: null },
                        { expiresAt: { gt: new Date() } }
                    ]
                }
            });
            return !!blocked;
        }
        catch (error) {
            logger_1.logger.error({ error, ipAddress }, 'Failed to check IP block status');
            return false; // Fail open for safety - don't block legitimate users on error
        }
    }
    /**
     * Block an IP address (manual admin action)
     * @param params - Block parameters including IP, reason, and admin ID
     * @returns Success status with block ID or error message
     */
    static async blockIP(params) {
        try {
            const { ipAddress, reason, blockedById, expiresAt, metadata } = params;
            // Validate IP format
            if (!this.isValidIPAddress(ipAddress)) {
                return { success: false, error: 'Invalid IP address format' };
            }
            // Validate reason length
            if (!reason || reason.trim().length < 5) {
                return { success: false, error: 'Reason must be at least 5 characters' };
            }
            // Check if already blocked
            const existing = await prisma_1.prisma.blockedIP.findUnique({
                where: { ipAddress }
            });
            if (existing?.isActive) {
                return { success: false, error: 'IP address is already blocked' };
            }
            // Create or update block (upsert handles reactivating previously blocked IPs)
            const block = await prisma_1.prisma.blockedIP.upsert({
                where: { ipAddress },
                create: {
                    ipAddress,
                    reason: reason.trim(),
                    blockedById,
                    expiresAt,
                    metadata,
                    isActive: true
                },
                update: {
                    reason: reason.trim(),
                    blockedById,
                    blockedAt: new Date(),
                    expiresAt,
                    metadata,
                    isActive: true
                }
            });
            // Log security event for audit trail
            await this.logEvent({
                userId: blockedById,
                eventType: 'IP_BLOCKED',
                ipAddress,
                details: { reason, expiresAt, blockId: block.id },
                riskScore: 0 // Admin action, not a risk event
            });
            logger_1.logger.info({ ipAddress, blockedById, blockId: block.id }, 'IP address blocked');
            return { success: true, blockId: block.id };
        }
        catch (error) {
            logger_1.logger.error({ error, ipAddress: params.ipAddress }, 'Failed to block IP');
            return { success: false, error: 'Failed to block IP address' };
        }
    }
    /**
     * Unblock an IP address
     * @param ipAddress - IP address to unblock
     * @param unblockById - Admin user ID performing the unblock
     * @returns Success status or error message
     */
    static async unblockIP(ipAddress, unblockById) {
        try {
            const block = await prisma_1.prisma.blockedIP.findUnique({
                where: { ipAddress }
            });
            if (!block || !block.isActive) {
                return { success: false, error: 'IP address is not blocked' };
            }
            await prisma_1.prisma.blockedIP.update({
                where: { ipAddress },
                data: { isActive: false }
            });
            // Log security event for audit trail
            await this.logEvent({
                userId: unblockById,
                eventType: 'IP_UNBLOCKED',
                ipAddress,
                details: { originalBlockId: block.id, originalReason: block.reason },
                riskScore: 0
            });
            logger_1.logger.info({ ipAddress, unblockById }, 'IP address unblocked');
            return { success: true };
        }
        catch (error) {
            logger_1.logger.error({ error, ipAddress }, 'Failed to unblock IP');
            return { success: false, error: 'Failed to unblock IP address' };
        }
    }
    /**
     * Get list of blocked IPs for admin dashboard
     * @param options - Filtering options
     * @returns Array of blocked IP records with admin details
     */
    static async getBlockedIPs(options = {}) {
        try {
            const { includeExpired = false, limit = 100, offset = 0 } = options;
            const where = {};
            if (!includeExpired) {
                where.isActive = true;
                where.OR = [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } }
                ];
            }
            return await prisma_1.prisma.blockedIP.findMany({
                where,
                include: {
                    blockedBy: {
                        select: {
                            id: true,
                            username: true,
                            email: true
                        }
                    }
                },
                orderBy: { blockedAt: 'desc' },
                take: limit,
                skip: offset
            });
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to get blocked IPs');
            return [];
        }
    }
    /**
     * Clear all blocked IPs (super-admin only action)
     * @param adminId - Super admin user ID performing the action
     * @returns Success status with count of cleared blocks
     */
    static async clearAllBlockedIPs(adminId) {
        try {
            const result = await prisma_1.prisma.blockedIP.updateMany({
                where: { isActive: true },
                data: { isActive: false }
            });
            // Log security event for audit trail
            await this.logEvent({
                userId: adminId,
                eventType: 'ALL_IPS_UNBLOCKED',
                details: { clearedCount: result.count },
                riskScore: 0
            });
            logger_1.logger.warn({ adminId, clearedCount: result.count }, 'All blocked IPs cleared');
            return { success: true, clearedCount: result.count };
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to clear blocked IPs');
            return { success: false, clearedCount: 0, error: 'Failed to clear blocked IPs' };
        }
    }
    /**
     * Validate IP address format (IPv4 or IPv6)
     * @param ip - IP address string to validate
     * @returns true if valid IPv4 or IPv6 format
     */
    static isValidIPAddress(ip) {
        // IPv4 pattern
        const ipv4Regex = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        // Simplified IPv6 pattern (full and compressed formats)
        const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]+|::(ffff(:0{1,4})?:)?((25[0-5]|(2[0-4]|1?[0-9])?[0-9])\.){3}(25[0-5]|(2[0-4]|1?[0-9])?[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1?[0-9])?[0-9])\.){3}(25[0-5]|(2[0-4]|1?[0-9])?[0-9]))$/;
        return ipv4Regex.test(ip) || ipv6Regex.test(ip);
    }
}
exports.SecurityService = SecurityService;
//# sourceMappingURL=securityService.js.map