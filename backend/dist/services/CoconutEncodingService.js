"use strict";
/**
 * CoconutEncodingService
 *
 * Cloud video encoding service using Coconut.co REST API.
 * Supports two-phase encoding: Phase 1 (720p only) for fast unlock,
 * Phase 2 (720p + 360p) for full adaptive bitrate.
 *
 * Coconut encodes on their infrastructure and writes HLS output directly
 * to the Azure Blob Storage `videos-encoded` container.
 *
 * Feature-flagged behind VIDEO_ENCODING_SERVICE=coconut (default: ffmpeg).
 *
 * @module services/CoconutEncodingService
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.coconutEncodingService = exports.CoconutEncodingService = void 0;
const VideoStorageService_1 = require("./VideoStorageService");
const logger_1 = require("./logger");
// ========================================
// Constants
// ========================================
const COCONUT_API_URL = 'https://api.coconut.co/v2/jobs';
/** SAS URL expiry for input blob (minutes) */
const INPUT_SAS_EXPIRY_MINUTES = 60;
// ========================================
// CoconutEncodingService Class
// ========================================
class CoconutEncodingService {
    apiKey;
    webhookSecret;
    storageAccountName;
    storageAccountKey;
    webhookBaseUrl;
    constructor() {
        this.apiKey = process.env.COCONUT_API_KEY || '';
        this.webhookSecret = process.env.COCONUT_WEBHOOK_SECRET || '';
        this.storageAccountName = process.env.AZURE_STORAGE_ACCOUNT_NAME || '';
        // Extract account key from connection string (same pattern as VideoStorageService)
        const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING || '';
        const keyMatch = connectionString.match(/AccountKey=([^;]+)/);
        this.storageAccountKey = keyMatch ? keyMatch[1] : '';
        // Derive webhook base URL from environment
        const nodeEnv = process.env.NODE_ENV;
        if (nodeEnv === 'production') {
            this.webhookBaseUrl = 'https://api.unitedwerise.org';
        }
        else if (nodeEnv === 'staging') {
            this.webhookBaseUrl = 'https://dev-api.unitedwerise.org';
        }
        else {
            this.webhookBaseUrl = process.env.COCONUT_WEBHOOK_BASE_URL || 'http://localhost:3001';
        }
    }
    /**
     * Check if Coconut encoding is available (API key configured).
     */
    isAvailable() {
        return !!(this.apiKey && this.storageAccountName && this.storageAccountKey);
    }
    /**
     * Create Phase 1 encoding job (720p only).
     * Video becomes watchable after this phase completes.
     *
     * @param videoId - Video record ID
     * @param inputBlobName - Raw blob name (e.g., "videoId/original.mp4")
     * @returns Coconut job ID
     */
    async createPhase1Job(videoId, inputBlobName) {
        logger_1.logger.info({ videoId }, 'Creating Coconut Phase 1 job (720p)');
        const payload = this.buildJobPayload(videoId, inputBlobName, {
            phase: '1',
            variants: ['mp4:720p::maxrate=2500k']
        });
        const result = await this.submitJob(payload);
        logger_1.logger.info({ videoId, coconutJobId: result.id }, 'Coconut Phase 1 job created');
        return { jobId: result.id };
    }
    /**
     * Create Phase 2 encoding job (720p + 360p).
     * Overwrites Phase 1 manifest with multi-variant version.
     *
     * @param videoId - Video record ID
     * @param inputBlobName - Raw blob name
     * @returns Coconut job ID
     */
    async createPhase2Job(videoId, inputBlobName) {
        logger_1.logger.info({ videoId }, 'Creating Coconut Phase 2 job (720p + 360p)');
        const payload = this.buildJobPayload(videoId, inputBlobName, {
            phase: '2',
            variants: ['mp4:720p::maxrate=2500k', 'mp4:360p::maxrate=600k']
        });
        const result = await this.submitJob(payload);
        logger_1.logger.info({ videoId, coconutJobId: result.id }, 'Coconut Phase 2 job created');
        return { jobId: result.id };
    }
    /**
     * Build a Coconut job payload.
     */
    buildJobPayload(videoId, inputBlobName, options) {
        const inputUrl = VideoStorageService_1.videoStorageService.generateRawBlobSasUrl(inputBlobName, INPUT_SAS_EXPIRY_MINUTES);
        return {
            input: { url: inputUrl },
            storage: {
                service: 'azure',
                container: 'videos-encoded',
                path: `/${videoId}`,
                credentials: {
                    account: this.storageAccountName,
                    access_key: this.storageAccountKey
                }
            },
            outputs: {
                httpstream: {
                    hls: {
                        path: '/',
                        variants: options.variants
                    }
                }
            },
            notification: {
                type: 'http',
                url: `${this.webhookBaseUrl}/webhooks/coconut/${this.webhookSecret}`,
                events: true,
                metadata: false,
                params: {
                    video_id: videoId,
                    phase: options.phase,
                    input_blob_name: inputBlobName
                }
            }
        };
    }
    /**
     * Submit a job to the Coconut v2 API.
     */
    async submitJob(payload) {
        const authHeader = 'Basic ' + Buffer.from(this.apiKey + ':').toString('base64');
        const response = await fetch(COCONUT_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader
            },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const errorBody = await response.text();
            logger_1.logger.error({
                status: response.status,
                body: errorBody.slice(0, 500)
            }, 'Coconut API request failed');
            throw new Error(`Coconut API error ${response.status}: ${errorBody.slice(0, 200)}`);
        }
        return response.json();
    }
}
exports.CoconutEncodingService = CoconutEncodingService;
/** Singleton instance */
exports.coconutEncodingService = new CoconutEncodingService();
//# sourceMappingURL=CoconutEncodingService.js.map