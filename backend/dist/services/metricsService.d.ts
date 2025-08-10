import { Request, Response } from 'express';
declare class MetricsService {
    private prisma;
    private metrics;
    private counters;
    private histograms;
    private gauges;
    private startTime;
    constructor();
    private initializeMetrics;
    private startPeriodicCollection;
    private collectSystemMetrics;
    private collectDatabaseMetrics;
    private collectApplicationMetrics;
    private cleanOldHistogramData;
    incrementCounter(name: string, labels?: Record<string, string>, value?: number): void;
    setGauge(name: string, value: number, labels?: Record<string, string>): void;
    observeHistogram(name: string, value: number, labels?: Record<string, string>): void;
    private recordMetric;
    requestMetricsMiddleware(): (req: Request, res: Response, next: Function) => void;
    trackUserRegistration(userId: string): void;
    trackPostCreated(postId: string, userId: string): void;
    trackCommentCreated(commentId: string, postId: string, userId: string): void;
    trackReportSubmitted(reportId: string, targetType: string, reason: string): void;
    trackAuthAttempt(email: string, success: boolean): void;
    trackEmailSent(type: string, recipient: string): void;
    trackSMSSent(phoneNumber: string): void;
    trackModerationAction(action: string, targetType: string, moderatorId: string): void;
    trackDatabaseQuery(query: string, duration: number): void;
    private getQueryType;
    getPrometheusMetrics(): string;
    getJSONMetrics(): {
        timestamp: number;
        counters: {
            [k: string]: number;
        };
        gauges: {
            [k: string]: number;
        };
        histograms: {
            [k: string]: {
                count: number;
                sum: number;
                avg: number;
                min: number;
                max: number;
            };
        };
    };
    getHealthMetrics(): {
        status: string;
        uptime: number;
        memory: {
            used: number;
            total: number;
        };
        requests: {
            total: number;
            errors: number;
            errorRate: number;
        };
        database: {
            connections: number;
            queries: number;
        };
        users: {
            total: number;
            active: number;
            suspended: number;
        };
        moderation: {
            pendingReports: number;
            reportsSubmitted: number;
        };
    };
    private calculateErrorRate;
}
export declare const metricsService: MetricsService;
export {};
//# sourceMappingURL=metricsService.d.ts.map