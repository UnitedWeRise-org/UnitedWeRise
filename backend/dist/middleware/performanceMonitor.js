"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPerformanceMetrics = exports.performanceMiddleware = exports.performanceMonitor = void 0;
class PerformanceMonitor {
    constructor() {
        this.metrics = [];
        this.maxMetrics = 1000; // Keep last 1000 requests
        this.slowRequestThreshold = 1000; // 1 second
    }
    recordMetric(metric) {
        this.metrics.push(metric);
        // Keep only recent metrics
        if (this.metrics.length > this.maxMetrics) {
            this.metrics = this.metrics.slice(-this.maxMetrics);
        }
        // Log slow requests
        if (metric.duration > this.slowRequestThreshold) {
            console.warn(`⚠️ Slow request: ${metric.method} ${metric.path} took ${metric.duration}ms`, {
                duration: metric.duration,
                statusCode: metric.statusCode,
                userId: metric.userId
            });
        }
    }
    getMetrics() {
        return this.metrics;
    }
    getAverageResponseTime(path, minutes) {
        const cutoff = minutes ? new Date(Date.now() - minutes * 60 * 1000) : null;
        const relevantMetrics = this.metrics.filter(m => {
            const pathMatch = !path || m.path === path;
            const timeMatch = !cutoff || m.timestamp >= cutoff;
            return pathMatch && timeMatch;
        });
        if (relevantMetrics.length === 0)
            return 0;
        const total = relevantMetrics.reduce((sum, m) => sum + m.duration, 0);
        return Math.round(total / relevantMetrics.length);
    }
    getSlowRequests(threshold = 1000, minutes = 60) {
        const cutoff = new Date(Date.now() - minutes * 60 * 1000);
        return this.metrics.filter(m => m.duration > threshold &&
            m.timestamp >= cutoff).sort((a, b) => b.duration - a.duration);
    }
    getErrorRate(minutes = 60) {
        const cutoff = new Date(Date.now() - minutes * 60 * 1000);
        const recentMetrics = this.metrics.filter(m => m.timestamp >= cutoff);
        if (recentMetrics.length === 0)
            return 0;
        const errors = recentMetrics.filter(m => m.statusCode >= 400).length;
        return Math.round((errors / recentMetrics.length) * 100);
    }
    getTopEndpoints(minutes = 60) {
        const cutoff = new Date(Date.now() - minutes * 60 * 1000);
        const recentMetrics = this.metrics.filter(m => m.timestamp >= cutoff);
        const endpointStats = new Map();
        recentMetrics.forEach(m => {
            const key = `${m.method} ${m.path}`;
            const existing = endpointStats.get(key) || { count: 0, totalDuration: 0 };
            endpointStats.set(key, {
                count: existing.count + 1,
                totalDuration: existing.totalDuration + m.duration
            });
        });
        return Array.from(endpointStats.entries())
            .map(([path, stats]) => ({
            path,
            count: stats.count,
            avgDuration: Math.round(stats.totalDuration / stats.count)
        }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    }
    getPerformanceReport() {
        const last60Minutes = 60;
        return {
            summary: {
                totalRequests: this.metrics.length,
                averageResponseTime: this.getAverageResponseTime(undefined, last60Minutes),
                errorRate: this.getErrorRate(last60Minutes),
                slowRequests: this.getSlowRequests(1000, last60Minutes).length
            },
            topEndpoints: this.getTopEndpoints(last60Minutes),
            slowestRequests: this.getSlowRequests(2000, last60Minutes).slice(0, 5)
        };
    }
}
// Singleton instance
exports.performanceMonitor = new PerformanceMonitor();
// Middleware function
const performanceMiddleware = (req, res, next) => {
    const startTime = Date.now();
    // Store original end function
    const originalEnd = res.end;
    // Override end function to capture metrics
    res.end = function (chunk, encoding, cb) {
        const duration = Date.now() - startTime;
        // Record the metric
        exports.performanceMonitor.recordMetric({
            path: req.path,
            method: req.method,
            duration,
            statusCode: res.statusCode,
            timestamp: new Date(),
            userAgent: req.get('User-Agent'),
            userId: req.user?.id
        });
        // Call original end function with proper arguments
        return originalEnd.call(this, chunk, encoding, cb);
    };
    next();
};
exports.performanceMiddleware = performanceMiddleware;
// Admin endpoint helper
const getPerformanceMetrics = () => {
    return exports.performanceMonitor.getPerformanceReport();
};
exports.getPerformanceMetrics = getPerformanceMetrics;
//# sourceMappingURL=performanceMonitor.js.map