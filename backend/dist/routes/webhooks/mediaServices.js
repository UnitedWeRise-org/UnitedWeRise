"use strict";
/**
 * Azure Media Services Webhook Handler
 *
 * Handles job completion events from Azure Media Services encoding pipeline.
 * Updates video records with encoding status and streaming URLs.
 *
 * Event Grid subscription should point to:
 * POST /webhooks/media-services
 *
 * @module routes/webhooks/mediaServices
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const VideoEncodingService_1 = require("../../services/VideoEncodingService");
const videoContentModerationService_1 = require("../../services/videoContentModerationService");
const prisma_js_1 = require("../../lib/prisma.js");
const logger_1 = require("../../services/logger");
const router = express_1.default.Router();
// ========================================
// Webhook Endpoint
// ========================================
/**
 * @swagger
 * /webhooks/media-services:
 *   post:
 *     tags: [Webhooks]
 *     summary: Azure Media Services job event handler
 *     description: |
 *       Receives job state change events from Azure Media Services via Event Grid.
 *       Updates video encoding status and populates streaming URLs on completion.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 eventType:
 *                   type: string
 *                 subject:
 *                   type: string
 *                 data:
 *                   type: object
 *     responses:
 *       200:
 *         description: Event processed
 *       400:
 *         description: Invalid event format
 */
router.post('/', async (req, res) => {
    try {
        // Handle Event Grid validation handshake
        if (req.headers['aeg-event-type'] === 'SubscriptionValidation') {
            const events = req.body;
            if (events && events.length > 0 && events[0].data?.validationCode) {
                logger_1.logger.info('Responding to Event Grid validation request');
                return res.json({
                    validationResponse: events[0].data.validationCode
                });
            }
        }
        // Process events
        const events = req.body;
        if (!Array.isArray(events)) {
            return res.status(400).json({ error: 'Invalid event format' });
        }
        for (const event of events) {
            await processEvent(event);
        }
        res.status(200).json({ success: true });
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Failed to process Media Services webhook');
        res.status(500).json({ error: 'Internal server error' });
    }
});
// ========================================
// Event Processing
// ========================================
async function processEvent(event) {
    logger_1.logger.info({
        eventId: event.id,
        eventType: event.eventType,
        subject: event.subject
    }, 'Processing Media Services event');
    // Only handle job state change events
    if (!event.eventType.includes('JobStateChange')) {
        return;
    }
    // Extract job name from subject
    // Subject format: /subscriptions/.../jobs/job-{videoId}
    const jobNameMatch = event.subject.match(/jobs\/([^/]+)$/);
    if (!jobNameMatch) {
        logger_1.logger.warn({ subject: event.subject }, 'Could not extract job name from subject');
        return;
    }
    const jobName = jobNameMatch[1];
    const data = event.data;
    // Extract video ID from job name (job-{videoId})
    const videoId = jobName.replace('job-', '');
    logger_1.logger.info({
        jobName,
        videoId,
        previousState: data.previousState,
        newState: data.state
    }, 'Job state changed');
    switch (data.state) {
        case 'Processing':
            await handleProcessing(videoId);
            break;
        case 'Finished':
            await handleFinished(videoId, jobName);
            break;
        case 'Error':
        case 'Canceled':
            await handleFailed(videoId, data.state);
            break;
        default:
            logger_1.logger.info({ state: data.state }, 'Ignoring job state');
    }
}
async function handleProcessing(videoId) {
    await prisma_js_1.prisma.video.update({
        where: { id: videoId },
        data: {
            encodingStatus: 'ENCODING',
            encodingStartedAt: new Date()
        }
    });
    logger_1.logger.info({ videoId }, 'Video encoding started');
}
async function handleFinished(videoId, jobName) {
    try {
        await VideoEncodingService_1.videoEncodingService.handleJobComplete(videoId, jobName, true);
        logger_1.logger.info({ videoId, jobName }, 'Video encoding completed successfully');
        // Trigger moderation after encoding completes
        await triggerModeration(videoId);
    }
    catch (error) {
        logger_1.logger.error({ error, videoId, jobName }, 'Failed to handle encoding completion');
        await prisma_js_1.prisma.video.update({
            where: { id: videoId },
            data: {
                encodingStatus: 'FAILED',
                encodingError: error instanceof Error ? error.message : 'Failed to process encoding completion'
            }
        });
    }
}
async function handleFailed(videoId, state) {
    await prisma_js_1.prisma.video.update({
        where: { id: videoId },
        data: {
            encodingStatus: 'FAILED',
            encodingCompletedAt: new Date(),
            encodingError: `Encoding job ${state.toLowerCase()}`
        }
    });
    logger_1.logger.error({ videoId, state }, 'Video encoding failed');
}
async function triggerModeration(videoId) {
    try {
        // Queue video for moderation
        await videoContentModerationService_1.videoContentModerationService.queueModeration(videoId);
        logger_1.logger.info({ videoId }, 'Video moderation completed');
    }
    catch (error) {
        logger_1.logger.error({ error, videoId }, 'Video moderation failed');
        // In development, auto-approve on error
        const isDevelopment = process.env.NODE_ENV !== 'production';
        if (isDevelopment) {
            await prisma_js_1.prisma.video.update({
                where: { id: videoId },
                data: {
                    moderationStatus: 'APPROVED',
                    audioStatus: 'PASS'
                }
            });
            logger_1.logger.info({ videoId }, 'Auto-approved video moderation (development fallback)');
        }
    }
}
exports.default = router;
//# sourceMappingURL=mediaServices.js.map