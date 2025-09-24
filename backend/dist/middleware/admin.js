"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireSuperAdmin = exports.requireModerator = exports.requireAdmin = void 0;
const requireAdmin = async (req, res, next) => {
    if (!req.user?.isAdmin) {
        return res.status(403).json({
            success: false,
            error: 'Admin access required'
        });
    }
    next();
};
exports.requireAdmin = requireAdmin;
const requireModerator = async (req, res, next) => {
    if (!req.user?.isModerator && !req.user?.isAdmin) {
        return res.status(403).json({
            success: false,
            error: 'Moderator access required'
        });
    }
    next();
};
exports.requireModerator = requireModerator;
const requireSuperAdmin = async (req, res, next) => {
    if (!req.user?.isSuperAdmin) {
        return res.status(403).json({
            success: false,
            error: 'Super admin access required'
        });
    }
    next();
};
exports.requireSuperAdmin = requireSuperAdmin;
//# sourceMappingURL=admin.js.map