import { Request, Response, NextFunction } from 'express';
import { logger } from '../services/logger';

interface PerformanceMetrics {
  path: string;
  method: string;
  duration: number;
  statusCode: number;
  timestamp: Date;
  userAgent?: string;
  userId?: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private readonly maxMetrics = 1000; // Keep last 1000 requests
  private readonly slowRequestThreshold = 1000; // 1 second

  recordMetric(metric: PerformanceMetrics) {
    this.metrics.push(metric);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log slow requests
    if (metric.duration > this.slowRequestThreshold) {
      logger.warn({
        method: metric.method,
        path: metric.path,
        duration: metric.duration,
        statusCode: metric.statusCode,
        userId: metric.userId,
        event: 'slow_request'
      }, 'Slow request detected');
    }
  }

  getMetrics() {
    return this.metrics;
  }

  getAverageResponseTime(path?: string, minutes?: number): number {
    const cutoff = minutes ? new Date(Date.now() - minutes * 60 * 1000) : null;

    const relevantMetrics = this.metrics.filter(m => {
      const pathMatch = !path || m.path === path;
      const timeMatch = !cutoff || m.timestamp >= cutoff;
      return pathMatch && timeMatch;
    });

    if (relevantMetrics.length === 0) return 0;

    const total = relevantMetrics.reduce((sum, m) => sum + m.duration, 0);
    return Math.round(total / relevantMetrics.length);
  }

  getSlowRequests(threshold: number = 1000, minutes: number = 60): PerformanceMetrics[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);

    return this.metrics.filter(m =>
      m.duration > threshold &&
      m.timestamp >= cutoff
    ).sort((a, b) => b.duration - a.duration);
  }

  getErrorRate(minutes: number = 60): number {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    const recentMetrics = this.metrics.filter(m => m.timestamp >= cutoff);

    if (recentMetrics.length === 0) return 0;

    const errors = recentMetrics.filter(m => m.statusCode >= 400).length;
    return Math.round((errors / recentMetrics.length) * 100);
  }

  getTopEndpoints(minutes: number = 60): Array<{path: string, count: number, avgDuration: number}> {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    const recentMetrics = this.metrics.filter(m => m.timestamp >= cutoff);

    const endpointStats = new Map<string, {count: number, totalDuration: number}>();

    recentMetrics.forEach(m => {
      const key = `${m.method} ${m.path}`;
      const existing = endpointStats.get(key) || {count: 0, totalDuration: 0};
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

  getPerformanceReport(): {
    summary: {
      totalRequests: number;
      averageResponseTime: number;
      errorRate: number;
      slowRequests: number;
    };
    topEndpoints: Array<{path: string, count: number, avgDuration: number}>;
    slowestRequests: PerformanceMetrics[];
  } {
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
export const performanceMonitor = new PerformanceMonitor();

// Middleware function
export const performanceMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Store original end function
  const originalEnd = res.end;

  // Override end function to capture metrics
  res.end = function(chunk?: any, encoding?: any, cb?: any) {
    const duration = Date.now() - startTime;

    // Record the metric
    performanceMonitor.recordMetric({
      path: req.path,
      method: req.method,
      duration,
      statusCode: res.statusCode,
      timestamp: new Date(),
      userAgent: req.get('User-Agent'),
      userId: (req as any).user?.id
    });

    // Call original end function with proper arguments
    return originalEnd.call(this, chunk, encoding, cb);
  };

  next();
};

// Admin endpoint helper
export const getPerformanceMetrics = () => {
  return performanceMonitor.getPerformanceReport();
};