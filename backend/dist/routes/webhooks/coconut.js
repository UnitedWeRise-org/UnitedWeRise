"use strict";
/**
 * Coconut.co Webhook Handler
 *
 * Handles encoding job completion events from Coconut.co.
 * Supports two-phase encoding:
 * - Phase 1 (720p): Sets video to READY, triggers moderation, kicks off Phase 2
 * - Phase 2 (720p+360p): Updates manifest with both tiers
 *
 * Security: Webhook URL includes a secret token in the path for validation,
 * since Coconut does not sign webhook payloads.
 *
 * Endpoint: POST /webhooks/coconut/:secret
 *
 * @module routes/webhooks/coconut
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const prisma_js_1 = require("../../lib/prisma.js");
const videoContentModerationService_1 = require("../../services/videoContentModerationService");
const CoconutEncodingService_1 = require("../../services/CoconutEncodingService");
const logger_1 = require("../../services/logger");
const router = express_1.default.Router();
// ========================================
// Webhook Endpoint
// ========================================
/**
 * @swagger
 * /webhooks/coconut/{secret}:
 *   post:
 *     tags: [Webhooks]
 *     summary: Coconut.co encoding webhook
 *     description: |
 *       Receives encoding job completion events from Coconut.co.
 *       The secret path parameter validates the webhook source.
 *       Do not call this endpoint directly.
 *     parameters:
 *       - in: path
 *         name: secret
 *         required: true
 *         schema:
 *           type: string
 *         description: Webhook validation secret
 *     responses:
 *       200:
 *         description: Event acknowledged
 *       403:
 *         description: Invalid webhook secret
 */
router.post('/:secret', async (req, res) => {
    try {
        // Validate webhook secret
        const expectedSecret = process.env.COCONUT_WEBHOOK_SECRET;
        if (!expectedSecret || req.params.secret !== expectedSecret) {
            logger_1.logger.warn('Coconut webhook received with invalid secret');
            return res.status(403).json({ error: 'Forbidden' });
        }
        const payload = req.body;
        // Custom params are sent as URL query strings by Coconut (not in POST body)
        const videoId = req.query.video_id;
        const phase = req.query.phase;
        const inputBlobName = req.query.input_blob_name;
        logger_1.logger.info({
            event: payload.event,
            coconutJobId: payload.job_id,
            videoId,
            phase
        }, 'Coconut webhook received');
        // Respond immediately to prevent Coconut retry
        res.status(200).json({ ok: true });
        // Process event asynchronously
        if (!videoId) {
            logger_1.logger.warn({ event: payload.event }, 'Coconut webhook missing video_id in metadata');
            return;
        }
        await processCoconutEvent(payload, videoId, phase || '1', inputBlobName);
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Coconut webhook handler error');
        // Still return 200 if not already sent to prevent retries
        if (!res.headersSent) {
            res.status(200).json({ ok: true });
        }
    }
});
// ========================================
// Event Processing
// ========================================
/**
 * Process a Coconut webhook event.
 */
async function processCoconutEvent(payload, videoId, phase, inputBlobName) {
    switch (payload.event) {
        case 'job.completed':
            if (phase === '1') {
                await handlePhase1Completed(videoId, payload, inputBlobName);
            }
            else if (phase === '2') {
                await handlePhase2Completed(videoId);
            }
            break;
        case 'job.failed':
            await handleJobFailed(videoId, phase, payload);
            break;
        case 'output.completed':
            logger_1.logger.info({ videoId, phase }, 'Coconut output completed (informational)');
            break;
        case 'output.failed':
            logger_1.logger.warn({ videoId, phase, errors: payload.errors }, 'Coconut output failed');
            break;
        default:
            logger_1.logger.info({ videoId, event: payload.event }, 'Ignoring Coconut event');
    }
}
/**
 * Handle Phase 1 completion (720p ready).
 * - Set video to READY + PARTIAL
 * - Trigger content moderation
 * - Kick off Phase 2 encoding
 */
async function handlePhase1Completed(videoId, payload, inputBlobName) {
    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME || '';
    const cdnEndpoint = process.env.AZURE_CDN_ENDPOINT;
    // Build manifest URL (Coconut generates master.m3u8)
    const hlsManifestUrl = cdnEndpoint
        ? `${cdnEndpoint}/${videoId}/master.m3u8`
        : `https://${accountName}.blob.core.windows.net/videos-encoded/${videoId}/master.m3u8`;
    // Update video to READY (watchable at 720p)
    await prisma_js_1.prisma.video.update({
        where: { id: videoId },
        data: {
            encodingStatus: 'READY',
            encodingCompletedAt: new Date(),
            hlsManifestUrl,
            mp4Url: null,
            encodingTiersStatus: 'PARTIAL'
        }
    });
    logger_1.logger.info({ videoId, hlsManifestUrl }, 'Phase 1 complete — video is watchable at 720p');
    // Trigger content moderation (non-fatal)
    try {
        await videoContentModerationService_1.videoContentModerationService.queueModeration(videoId);
    }
    catch (error) {
        logger_1.logger.error({ error, videoId }, 'Content moderation failed after Coconut Phase 1');
        // Auto-approve in non-production (same pattern as FFmpeg worker)
        if (process.env.NODE_ENV !== 'production') {
            await prisma_js_1.prisma.video.update({
                where: { id: videoId },
                data: { moderationStatus: 'APPROVED', audioStatus: 'PASS' }
            });
        }
    }
    // Kick off Phase 2 (720p + 360p) — non-fatal
    if (inputBlobName) {
        try {
            const phase2Result = await CoconutEncodingService_1.coconutEncodingService.createPhase2Job(videoId, inputBlobName);
            logger_1.logger.info({ videoId, coconutJobId: phase2Result.jobId }, 'Phase 2 Coconut job created');
        }
        catch (error) {
            logger_1.logger.warn({ error, videoId }, 'Failed to create Phase 2 Coconut job — video remains at 720p');
            await prisma_js_1.prisma.video.update({
                where: { id: videoId },
                data: { encodingTiersStatus: 'PARTIAL_FAILED' }
            });
        }
    }
    else {
        logger_1.logger.warn({ videoId }, 'No input_blob_name in metadata — cannot create Phase 2 job');
        await prisma_js_1.prisma.video.update({
            where: { id: videoId },
            data: { encodingTiersStatus: 'PARTIAL_FAILED' }
        });
    }
}
/**
 * Handle Phase 2 completion (720p + 360p manifest ready).
 */
async function handlePhase2Completed(videoId) {
    await prisma_js_1.prisma.video.update({
        where: { id: videoId },
        data: { encodingTiersStatus: 'ALL' }
    });
    logger_1.logger.info({ videoId }, 'Phase 2 complete — all encoding tiers ready');
}
/**
 * Handle job failure.
 */
async function handleJobFailed(videoId, phase, payload) {
    const errorMsg = payload.errors
        ? JSON.stringify(payload.errors).slice(0, 500)
        : 'Coconut encoding job failed';
    if (phase === '1') {
        // Phase 1 failure: video is not watchable
        await prisma_js_1.prisma.video.update({
            where: { id: videoId },
            data: {
                encodingStatus: 'FAILED',
                encodingCompletedAt: new Date(),
                encodingError: `Coconut Phase 1 failed: ${errorMsg}`,
                encodingTiersStatus: 'NONE'
            }
        });
        logger_1.logger.error({ videoId, errors: payload.errors }, 'Coconut Phase 1 encoding failed');
    }
    else {
        // Phase 2 failure: video stays watchable at 720p
        await prisma_js_1.prisma.video.update({
            where: { id: videoId },
            data: { encodingTiersStatus: 'PARTIAL_FAILED' }
        });
        logger_1.logger.warn({ videoId, errors: payload.errors }, 'Coconut Phase 2 failed — video remains at 720p');
    }
}
exports.default = router;
//# sourceMappingURL=coconut.js.map