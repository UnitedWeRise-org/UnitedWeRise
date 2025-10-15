"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkVerificationStatus = checkVerificationStatus;
const prisma_1 = require("../lib/prisma");
const VERIFICATION_GRACE_PERIOD_DAYS = 7;
async function checkVerificationStatus(req, res, next) {
    if (!req.user) {
        return next();
    }
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
            emailVerified: true,
            createdAt: true,
            isSuspended: true
        }
    });
    if (!user) {
        return next();
    }
    // Already verified - no action needed
    if (user.emailVerified) {
        return next();
    }
    const daysSinceRegistration = Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    // Suspend account if grace period expired
    if (daysSinceRegistration > VERIFICATION_GRACE_PERIOD_DAYS && !user.isSuspended) {
        await prisma_1.prisma.user.update({
            where: { id: req.user.id },
            data: {
                isSuspended: true,
                lockedUntil: null // Can unlock immediately upon verification
            }
        });
        return res.status(403).json({
            error: 'Account suspended',
            message: 'Your account has been suspended. Please verify your email address to continue.',
            verificationRequired: true,
            daysSinceRegistration
        });
    }
    // Within grace period - show warning but allow access
    res.locals.verificationWarning = {
        daysRemaining: VERIFICATION_GRACE_PERIOD_DAYS - daysSinceRegistration,
        message: `Please verify your email within ${VERIFICATION_GRACE_PERIOD_DAYS - daysSinceRegistration} days to avoid account suspension.`
    };
    next();
}
//# sourceMappingURL=verificationEnforcement.js.map