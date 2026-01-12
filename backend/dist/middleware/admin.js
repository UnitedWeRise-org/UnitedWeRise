"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireSuperAdmin = exports.requireModerator = exports.requireAdmin = void 0;
const logger_1 = require("../services/logger");
const requireAdmin = async (req, res, next) => {
    if (!req.user?.isAdmin) {
        // Log role requirement for debugging, but don't expose to client
        logger_1.securityLogger.warn({ userId: req.user?.id || 'unknown', requiredRole: 'admin' }, 'Admin access denied');
        return res.status(403).json({
            success: false,
            error: 'Access denied'
        });
    }
    next();
};
exports.requireAdmin = requireAdmin;
const requireModerator = async (req, res, next) => {
    if (!req.user?.isModerator && !req.user?.isAdmin) {
        // Log role requirement for debugging, but don't expose to client
        logger_1.securityLogger.warn({ userId: req.user?.id || 'unknown', requiredRole: 'moderator' }, 'Moderator access denied');
        return res.status(403).json({
            success: false,
            error: 'Access denied'
        });
    }
    next();
};
exports.requireModerator = requireModerator;
const requireSuperAdmin = async (req, res, next) => {
    if (!req.user?.isSuperAdmin) {
        // Log role requirement for debugging, but don't expose to client
        logger_1.securityLogger.warn({ userId: req.user?.id || 'unknown', requiredRole: 'superAdmin' }, 'Super admin access denied');
        return res.status(403).json({
            success: false,
            error: 'Access denied'
        });
    }
    next();
};
exports.requireSuperAdmin = requireSuperAdmin;
//# sourceMappingURL=admin.js.map