import { Request, Response, NextFunction } from 'express';
interface PerformanceMetrics {
    path: string;
    method: string;
    duration: number;
    statusCode: number;
    timestamp: Date;
    userAgent?: string;
    userId?: string;
}
declare class PerformanceMonitor {
    private metrics;
    private readonly maxMetrics;
    private readonly slowRequestThreshold;
    recordMetric(metric: PerformanceMetrics): void;
    getMetrics(): PerformanceMetrics[];
    getAverageResponseTime(path?: string, minutes?: number): number;
    getSlowRequests(threshold?: number, minutes?: number): PerformanceMetrics[];
    getErrorRate(minutes?: number): number;
    getTopEndpoints(minutes?: number): Array<{
        path: string;
        count: number;
        avgDuration: number;
    }>;
    getPerformanceReport(): {
        summary: {
            totalRequests: number;
            averageResponseTime: number;
            errorRate: number;
            slowRequests: number;
        };
        topEndpoints: Array<{
            path: string;
            count: number;
            avgDuration: number;
        }>;
        slowestRequests: PerformanceMetrics[];
    };
}
export declare const performanceMonitor: PerformanceMonitor;
export declare const performanceMiddleware: (req: Request, res: Response, next: NextFunction) => void;
export declare const getPerformanceMetrics: () => {
    summary: {
        totalRequests: number;
        averageResponseTime: number;
        errorRate: number;
        slowRequests: number;
    };
    topEndpoints: Array<{
        path: string;
        count: number;
        avgDuration: number;
    }>;
    slowestRequests: PerformanceMetrics[];
};
export {};
//# sourceMappingURL=performanceMonitor.d.ts.map