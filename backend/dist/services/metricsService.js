"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsService = void 0;
const prisma_1 = require("../lib/prisma");
const logger_1 = require("./logger");
class MetricsService {
    prisma;
    metrics = new Map();
    counters = new Map();
    histograms = new Map();
    gauges = new Map();
    startTime;
    constructor() {
        this.prisma = prisma_1.prisma;
        this.startTime = Date.now();
        this.initializeMetrics();
        this.startPeriodicCollection();
    }
    initializeMetrics() {
        // Initialize counters
        this.counters.set('http_requests_total', 0);
        this.counters.set('http_errors_total', 0);
        this.counters.set('auth_attempts_total', 0);
        this.counters.set('auth_failures_total', 0);
        this.counters.set('posts_created_total', 0);
        this.counters.set('comments_created_total', 0);
        this.counters.set('reports_submitted_total', 0);
        this.counters.set('users_registered_total', 0);
        this.counters.set('emails_sent_total', 0);
        this.counters.set('sms_sent_total', 0);
        // Initialize gauges
        this.gauges.set('active_connections', 0);
        this.gauges.set('memory_usage_bytes', 0);
        this.gauges.set('cpu_usage_percent', 0);
        this.gauges.set('database_connections', 0);
        this.gauges.set('pending_reports', 0);
        this.gauges.set('active_users', 0);
        // Initialize histograms
        this.histograms.set('http_request_duration_seconds', []);
        this.histograms.set('database_query_duration_seconds', []);
    }
    startPeriodicCollection() {
        // Collect system metrics every 30 seconds
        setInterval(async () => {
            await this.collectSystemMetrics();
            await this.collectDatabaseMetrics();
            await this.collectApplicationMetrics();
        }, 30000);
        // Clean old histogram data every 5 minutes
        setInterval(() => {
            this.cleanOldHistogramData();
        }, 300000);
    }
    async collectSystemMetrics() {
        try {
            const memUsage = process.memoryUsage();
            this.gauges.set('memory_usage_bytes', memUsage.heapUsed);
            this.gauges.set('memory_heap_total_bytes', memUsage.heapTotal);
            this.gauges.set('memory_external_bytes', memUsage.external);
            const cpuUsage = process.cpuUsage();
            this.gauges.set('cpu_user_seconds_total', cpuUsage.user / 1000000);
            this.gauges.set('cpu_system_seconds_total', cpuUsage.system / 1000000);
            this.gauges.set('uptime_seconds', Math.floor((Date.now() - this.startTime) / 1000));
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to collect system metrics');
        }
    }
    async collectDatabaseMetrics() {
        try {
            // Active database connections would typically be collected from connection pool
            // This is a simplified version
            this.gauges.set('database_connections', 1);
            // Note: Report table not yet implemented in database
            // const pendingReports = await this.prisma.report.count({
            //   where: { status: 'PENDING' }
            // });
            // this.gauges.set('pending_reports', pendingReports);
            // Collect active users (users active in last hour)
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            const activeUsers = await this.prisma.user.count({
                where: { lastSeenAt: { gte: oneHourAgo } }
            });
            this.gauges.set('active_users', activeUsers);
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to collect database metrics');
        }
    }
    async collectApplicationMetrics() {
        try {
            // Collect additional application-specific metrics
            const totalUsers = await this.prisma.user.count();
            this.gauges.set('total_users', totalUsers);
            const totalPosts = await this.prisma.post.count();
            this.gauges.set('total_posts', totalPosts);
            const totalComments = await this.prisma.comment.count();
            this.gauges.set('total_comments', totalComments);
            const suspendedUsers = await this.prisma.user.count({
                where: { isSuspended: true }
            });
            this.gauges.set('suspended_users', suspendedUsers);
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to collect application metrics');
        }
    }
    cleanOldHistogramData() {
        const maxAge = 300000; // 5 minutes
        const cutoff = Date.now() - maxAge;
        this.histograms.forEach((values, key) => {
            // Remove values older than 5 minutes (simplified)
            if (values.length > 1000) {
                this.histograms.set(key, values.slice(-500));
            }
        });
    }
    // Counter methods
    incrementCounter(name, labels, value = 1) {
        const current = this.counters.get(name) || 0;
        this.counters.set(name, current + value);
        this.recordMetric({
            name,
            value: current + value,
            timestamp: Date.now(),
            labels
        });
    }
    // Gauge methods
    setGauge(name, value, labels) {
        this.gauges.set(name, value);
        this.recordMetric({
            name,
            value,
            timestamp: Date.now(),
            labels
        });
    }
    // Histogram methods
    observeHistogram(name, value, labels) {
        const values = this.histograms.get(name) || [];
        values.push(value);
        this.histograms.set(name, values);
        this.recordMetric({
            name,
            value,
            timestamp: Date.now(),
            labels
        });
    }
    recordMetric(metric) {
        const metrics = this.metrics.get(metric.name) || [];
        metrics.push(metric);
        // Keep only last 1000 data points per metric
        if (metrics.length > 1000) {
            metrics.splice(0, metrics.length - 1000);
        }
        this.metrics.set(metric.name, metrics);
    }
    // Express middleware for automatic request metrics
    requestMetricsMiddleware() {
        return (req, res, next) => {
            const startTime = Date.now();
            // Increment request counter
            this.incrementCounter('http_requests_total', {
                method: req.method,
                route: req.route?.path || req.path,
                status_code: '0' // Will be updated in finish event
            });
            // Track response
            res.on('finish', () => {
                const duration = (Date.now() - startTime) / 1000;
                // Record response time
                this.observeHistogram('http_request_duration_seconds', duration, {
                    method: req.method,
                    route: req.route?.path || req.path,
                    status_code: res.statusCode.toString()
                });
                // Increment error counter for 4xx/5xx responses
                if (res.statusCode >= 400) {
                    this.incrementCounter('http_errors_total', {
                        method: req.method,
                        route: req.route?.path || req.path,
                        status_code: res.statusCode.toString()
                    });
                }
            });
            next();
        };
    }
    // Business logic metrics
    trackUserRegistration(userId) {
        this.incrementCounter('users_registered_total');
        logger_1.logger.info({ userId }, '[METRICS] User registered');
    }
    trackPostCreated(postId, userId) {
        this.incrementCounter('posts_created_total');
        logger_1.logger.info({ postId, userId }, '[METRICS] Post created');
    }
    trackCommentCreated(commentId, postId, userId) {
        this.incrementCounter('comments_created_total');
        logger_1.logger.info({ commentId, postId, userId }, '[METRICS] Comment created');
    }
    trackReportSubmitted(reportId, targetType, reason) {
        this.incrementCounter('reports_submitted_total', {
            target_type: targetType,
            reason: reason.toLowerCase()
        });
        logger_1.logger.info({ reportId, targetType, reason }, '[METRICS] Report submitted');
    }
    trackAuthAttempt(email, success) {
        this.incrementCounter('auth_attempts_total', { success: success.toString() });
        if (!success) {
            this.incrementCounter('auth_failures_total');
        }
        logger_1.logger.info({ email, success }, '[METRICS] Auth attempt');
    }
    trackEmailSent(type, recipient) {
        this.incrementCounter('emails_sent_total', { type });
        logger_1.logger.info({ type, recipient }, '[METRICS] Email sent');
    }
    trackSMSSent(phoneNumber) {
        this.incrementCounter('sms_sent_total');
        logger_1.logger.info({ phoneNumber }, '[METRICS] SMS sent');
    }
    trackModerationAction(action, targetType, moderatorId) {
        this.incrementCounter('moderation_actions_total', {
            action: action.toLowerCase(),
            target_type: targetType.toLowerCase()
        });
        logger_1.logger.info({ action, targetType, moderatorId }, '[METRICS] Moderation action');
    }
    // Database query tracking
    trackDatabaseQuery(query, duration) {
        this.observeHistogram('database_query_duration_seconds', duration / 1000, {
            query_type: this.getQueryType(query)
        });
        this.incrementCounter('database_queries_total', {
            query_type: this.getQueryType(query)
        });
    }
    getQueryType(query) {
        const normalized = query.toLowerCase().trim();
        if (normalized.startsWith('select'))
            return 'select';
        if (normalized.startsWith('insert'))
            return 'insert';
        if (normalized.startsWith('update'))
            return 'update';
        if (normalized.startsWith('delete'))
            return 'delete';
        return 'other';
    }
    // Prometheus-style metrics export
    getPrometheusMetrics() {
        let output = '';
        // Add counters
        this.counters.forEach((value, name) => {
            output += `# TYPE ${name} counter\n`;
            output += `${name} ${value}\n\n`;
        });
        // Add gauges
        this.gauges.forEach((value, name) => {
            output += `# TYPE ${name} gauge\n`;
            output += `${name} ${value}\n\n`;
        });
        // Add histograms (simplified)
        this.histograms.forEach((values, name) => {
            if (values.length > 0) {
                const sum = values.reduce((a, b) => a + b, 0);
                const count = values.length;
                const sorted = [...values].sort((a, b) => a - b);
                output += `# TYPE ${name} histogram\n`;
                output += `${name}_sum ${sum}\n`;
                output += `${name}_count ${count}\n`;
                output += `${name}_bucket{le="0.1"} ${sorted.filter(v => v <= 0.1).length}\n`;
                output += `${name}_bucket{le="0.5"} ${sorted.filter(v => v <= 0.5).length}\n`;
                output += `${name}_bucket{le="1.0"} ${sorted.filter(v => v <= 1.0).length}\n`;
                output += `${name}_bucket{le="5.0"} ${sorted.filter(v => v <= 5.0).length}\n`;
                output += `${name}_bucket{le="+Inf"} ${count}\n\n`;
            }
        });
        return output;
    }
    // JSON metrics export for custom dashboards
    getJSONMetrics() {
        return {
            timestamp: Date.now(),
            counters: Object.fromEntries(this.counters),
            gauges: Object.fromEntries(this.gauges),
            histograms: Object.fromEntries(Array.from(this.histograms.entries()).map(([name, values]) => [
                name,
                {
                    count: values.length,
                    sum: values.reduce((a, b) => a + b, 0),
                    avg: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
                    min: values.length > 0 ? Math.min(...values) : 0,
                    max: values.length > 0 ? Math.max(...values) : 0
                }
            ]))
        };
    }
    // Health check metrics
    getHealthMetrics() {
        return {
            status: 'healthy',
            uptime: Math.floor((Date.now() - this.startTime) / 1000),
            memory: {
                used: this.gauges.get('memory_usage_bytes') || 0,
                total: this.gauges.get('memory_heap_total_bytes') || 0
            },
            requests: {
                total: this.counters.get('http_requests_total') || 0,
                errors: this.counters.get('http_errors_total') || 0,
                errorRate: this.calculateErrorRate()
            },
            database: {
                connections: this.gauges.get('database_connections') || 0,
                queries: this.counters.get('database_queries_total') || 0
            },
            users: {
                total: this.gauges.get('total_users') || 0,
                active: this.gauges.get('active_users') || 0,
                suspended: this.gauges.get('suspended_users') || 0
            },
            moderation: {
                pendingReports: this.gauges.get('pending_reports') || 0,
                reportsSubmitted: this.counters.get('reports_submitted_total') || 0
            }
        };
    }
    calculateErrorRate() {
        const totalRequests = this.counters.get('http_requests_total') || 0;
        const totalErrors = this.counters.get('http_errors_total') || 0;
        if (totalRequests === 0)
            return 0;
        return (totalErrors / totalRequests) * 100;
    }
}
exports.metricsService = new MetricsService();
//# sourceMappingURL=metricsService.js.map