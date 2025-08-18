"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = exports.requireAuth = void 0;
const auth_1 = require("../utils/auth");
const client_1 = require("@prisma/client");
const sessionManager_1 = require("../services/sessionManager");
const prisma = new client_1.PrismaClient();
const requireAuth = async (req, res, next) => {
    var _a;
    try {
        const token = (_a = req.header('Authorization')) === null || _a === void 0 ? void 0 : _a.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }
        const decoded = (0, auth_1.verifyToken)(token);
        if (!decoded) {
            return res.status(401).json({ error: 'Invalid token.' });
        }
        // Check if token is blacklisted
        const tokenId = `${decoded.userId}_${token.slice(-10)}`; // Use last 10 chars as token ID
        if (await sessionManager_1.sessionManager.isTokenBlacklisted(tokenId)) {
            return res.status(401).json({ error: 'Token has been revoked.' });
        }
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, email: true, username: true, firstName: true, lastName: true, isModerator: true, isAdmin: true }
        });
        if (!user) {
            return res.status(401).json({ error: 'User not found.' });
        }
        req.user = user;
        // Update session activity if available
        const sessionId = req.header('X-Session-ID');
        if (sessionId) {
            await sessionManager_1.sessionManager.updateSessionActivity(sessionId);
        }
        next();
    }
    catch (error) {
        console.error('Auth middleware error:', error);
        res.status(401).json({ error: 'Invalid token.' });
    }
};
exports.requireAuth = requireAuth;
const requireAdmin = async (req, res, next) => {
    var _a;
    if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.isAdmin)) {
        return res.status(403).json({ error: 'Admin access required.' });
    }
    next();
};
exports.requireAdmin = requireAdmin;
