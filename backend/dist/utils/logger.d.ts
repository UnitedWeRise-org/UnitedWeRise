/**
 * Simple logger utility for the backend
 */
interface Logger {
    info: (message: string, ...args: any[]) => void;
    warn: (message: string, ...args: any[]) => void;
    error: (message: string, ...args: any[]) => void;
    debug: (message: string, ...args: any[]) => void;
}
declare const logger: Logger;
export default logger;
//# sourceMappingURL=logger.d.ts.map