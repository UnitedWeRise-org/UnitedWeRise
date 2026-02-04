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

import { videoStorageService } from './VideoStorageService';
import { logger } from './logger';

// ========================================
// Types
// ========================================

interface CoconutJobPayload {
  input: { url: string };
  storage: {
    service: string;
    container: string;
    path: string;
    credentials: {
      account: string;
      access_key: string;
    };
  };
  outputs: {
    httpstream: {
      hls: {
        path: string;
        variants: string[];
      };
    };
  };
  notification: {
    type: string;
    url: string;
    events: boolean;
    metadata: Record<string, string>;
  };
}

interface CoconutJobResponse {
  id: number;
  status: string;
  [key: string]: any;
}

// ========================================
// Constants
// ========================================

const COCONUT_API_URL = 'https://api.coconut.co/v2/jobs';

/** SAS URL expiry for input blob (minutes) */
const INPUT_SAS_EXPIRY_MINUTES = 60;

// ========================================
// CoconutEncodingService Class
// ========================================

export class CoconutEncodingService {
  private readonly apiKey: string;
  private readonly webhookSecret: string;
  private readonly storageAccountName: string;
  private readonly storageAccountKey: string;
  private readonly webhookBaseUrl: string;

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
    } else if (nodeEnv === 'staging') {
      this.webhookBaseUrl = 'https://dev-api.unitedwerise.org';
    } else {
      this.webhookBaseUrl = process.env.COCONUT_WEBHOOK_BASE_URL || 'http://localhost:3001';
    }
  }

  /**
   * Check if Coconut encoding is available (API key configured).
   */
  isAvailable(): boolean {
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
  async createPhase1Job(videoId: string, inputBlobName: string): Promise<{ jobId: number }> {
    logger.info({ videoId }, 'Creating Coconut Phase 1 job (720p)');

    const payload = this.buildJobPayload(videoId, inputBlobName, {
      phase: '1',
      variants: ['mp4:720p::maxrate=2500k']
    });

    const result = await this.submitJob(payload);

    logger.info({ videoId, coconutJobId: result.id }, 'Coconut Phase 1 job created');
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
  async createPhase2Job(videoId: string, inputBlobName: string): Promise<{ jobId: number }> {
    logger.info({ videoId }, 'Creating Coconut Phase 2 job (720p + 360p)');

    const payload = this.buildJobPayload(videoId, inputBlobName, {
      phase: '2',
      variants: ['mp4:720p::maxrate=2500k', 'mp4:360p::maxrate=600k']
    });

    const result = await this.submitJob(payload);

    logger.info({ videoId, coconutJobId: result.id }, 'Coconut Phase 2 job created');
    return { jobId: result.id };
  }

  /**
   * Build a Coconut job payload.
   */
  private buildJobPayload(
    videoId: string,
    inputBlobName: string,
    options: { phase: string; variants: string[] }
  ): CoconutJobPayload {
    const inputUrl = videoStorageService.generateRawBlobSasUrl(inputBlobName, INPUT_SAS_EXPIRY_MINUTES);

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
        metadata: {
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
  private async submitJob(payload: CoconutJobPayload): Promise<CoconutJobResponse> {
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
      logger.error({
        status: response.status,
        body: errorBody.slice(0, 500)
      }, 'Coconut API request failed');
      throw new Error(`Coconut API error ${response.status}: ${errorBody.slice(0, 200)}`);
    }

    return response.json() as Promise<CoconutJobResponse>;
  }
}

/** Singleton instance */
export const coconutEncodingService = new CoconutEncodingService();
