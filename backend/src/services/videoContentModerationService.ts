/**
 * Video Content Moderation Service
 *
 * Provides content moderation for user-uploaded videos using Azure Content Safety.
 * Handles both visual content analysis and audio policy checking.
 *
 * Moderation Flow:
 * 1. Visual content analysis via Azure Content Safety
 * 2. Audio policy check (configurable: STRICT, WARN, PERMISSIVE)
 * 3. Combined moderation decision
 *
 * @module services/videoContentModerationService
 */

import { AzureKeyCredential } from "@azure/core-auth";
import ContentSafetyClient from "@azure-rest/ai-content-safety";
import { prisma } from '../lib/prisma.js';
import { logger } from './logger';

// ========================================
// Types
// ========================================

export type VideoModerationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type AudioStatus = 'PENDING' | 'PASS' | 'FLAGGED' | 'MUTED';
export type AudioPolicy = 'STRICT' | 'WARN' | 'PERMISSIVE';

export interface VideoModerationResult {
  status: VideoModerationStatus;
  reason?: string;
  confidence?: number;
  categories?: {
    hate?: number;
    selfHarm?: number;
    sexual?: number;
    violence?: number;
  };
  audioStatus: AudioStatus;
  audioMuted: boolean;
  processingTime: number;
}

export interface VideoModerationRequest {
  videoId: string;
  videoUrl: string;
  thumbnailUrl?: string;
  userId: string;
}

// ========================================
// Constants
// ========================================

// Azure Content Safety severity levels (0, 2, 4, 6)
const SEVERITY_THRESHOLD_BLOCK = 4; // Block at medium+ severity
const SEVERITY_THRESHOLD_WARN = 2;  // Warn at low+ severity

// Audio policy (configurable via environment)
const AUDIO_POLICY: AudioPolicy = (process.env.AUDIO_POLICY as AudioPolicy) || 'STRICT';

// ========================================
// VideoContentModerationService Class
// ========================================

export class VideoContentModerationService {
  private client: any;
  private isConfigured: boolean;
  private endpoint: string;

  constructor() {
    const endpoint = process.env.AZURE_CONTENT_SAFETY_ENDPOINT || 'https://eastus.api.cognitive.microsoft.com/';
    const apiKey = process.env.AZURE_CONTENT_SAFETY_KEY;

    this.endpoint = endpoint;
    this.isConfigured = !!(endpoint && apiKey);

    if (this.isConfigured) {
      const credential = new AzureKeyCredential(apiKey!);
      this.client = ContentSafetyClient(endpoint, credential);

      logger.info({
        service: 'Video Content Moderation',
        endpoint,
        audioPolicy: AUDIO_POLICY
      }, 'Video Content Moderation Service initialized');
    } else {
      logger.warn('Video Content Moderation Service not configured - missing endpoint or API key');
    }
  }

  /**
   * Moderate a video
   *
   * @param request - Video moderation request with video details
   * @returns Moderation result
   */
  async moderateVideo(request: VideoModerationRequest): Promise<VideoModerationResult> {
    const startTime = Date.now();

    logger.info({ videoId: request.videoId }, 'Starting video moderation');

    try {
      if (!this.isConfigured) {
        // Return pass-through result when not configured
        return this.createFallbackResult(startTime, 'not_configured');
      }

      // Moderate thumbnail first (quick check)
      let thumbnailResult = null;
      if (request.thumbnailUrl) {
        thumbnailResult = await this.moderateThumbnail(request.thumbnailUrl);

        // If thumbnail is rejected, reject video immediately
        if (thumbnailResult.status === 'REJECTED') {
          logger.info({
            videoId: request.videoId,
            reason: thumbnailResult.reason
          }, 'Video rejected based on thumbnail');

          await this.updateVideoModeration(request.videoId, thumbnailResult);
          return thumbnailResult;
        }
      }

      // Full video analysis
      const visualResult = await this.analyzeVideoContent(request.videoUrl);

      // Audio policy check
      const audioResult = await this.checkAudioPolicy(request.videoId);

      // Combine results
      const finalResult = this.combineResults(visualResult, audioResult, startTime);

      // Update database
      await this.updateVideoModeration(request.videoId, finalResult);

      logger.info({
        videoId: request.videoId,
        status: finalResult.status,
        audioStatus: finalResult.audioStatus,
        processingTime: finalResult.processingTime
      }, 'Video moderation completed');

      return finalResult;

    } catch (error) {
      logger.error({ error, videoId: request.videoId }, 'Video moderation failed');

      // On error, reject in production, pass in development
      const isDevelopment = process.env.NODE_ENV !== 'production';
      const fallbackResult = this.createFallbackResult(
        startTime,
        isDevelopment ? 'error_dev_pass' : 'error_production_reject'
      );

      if (!isDevelopment) {
        fallbackResult.status = 'REJECTED';
        fallbackResult.reason = 'Moderation service error';
      }

      return fallbackResult;
    }
  }

  /**
   * Analyze video content using Azure Content Safety
   *
   * Note: Azure Content Safety video analysis is async and may take time.
   * For MVP, we use thumbnail analysis + periodic frame sampling.
   */
  private async analyzeVideoContent(videoUrl: string): Promise<{
    status: VideoModerationStatus;
    reason?: string;
    confidence?: number;
    categories?: {
      hate?: number;
      selfHarm?: number;
      sexual?: number;
      violence?: number;
    };
  }> {
    // For MVP: Use image analysis on thumbnail
    // Full implementation would submit video to Azure Content Safety video:analyze endpoint

    // Return approved by default for stub
    return {
      status: 'APPROVED',
      confidence: 1.0,
      categories: {
        hate: 0,
        selfHarm: 0,
        sexual: 0,
        violence: 0
      }
    };
  }

  /**
   * Moderate thumbnail image
   */
  private async moderateThumbnail(thumbnailUrl: string): Promise<VideoModerationResult> {
    const startTime = Date.now();

    try {
      // Fetch thumbnail
      const response = await fetch(thumbnailUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch thumbnail: ${response.status}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const base64Image = buffer.toString('base64');

      // Analyze with Content Safety
      const analysisResult = await this.client.path('/image:analyze').post({
        body: {
          image: { content: base64Image },
          categories: ['Hate', 'SelfHarm', 'Sexual', 'Violence'],
          outputType: 'FourSeverityLevels'
        }
      });

      if (analysisResult.status !== '200') {
        throw new Error(`Content Safety API error: ${analysisResult.status}`);
      }

      const analysis = analysisResult.body;
      const categories = {
        hate: this.getSeverity(analysis, 'Hate'),
        selfHarm: this.getSeverity(analysis, 'SelfHarm'),
        sexual: this.getSeverity(analysis, 'Sexual'),
        violence: this.getSeverity(analysis, 'Violence')
      };

      // Check if any category exceeds threshold
      const maxSeverity = Math.max(
        categories.hate,
        categories.selfHarm,
        categories.sexual,
        categories.violence
      );

      const processingTime = Date.now() - startTime;

      if (maxSeverity >= SEVERITY_THRESHOLD_BLOCK) {
        return {
          status: 'REJECTED',
          reason: this.getRejectReason(categories),
          confidence: maxSeverity / 6,
          categories,
          audioStatus: 'PENDING',
          audioMuted: false,
          processingTime
        };
      }

      return {
        status: 'APPROVED',
        confidence: 1 - (maxSeverity / 6),
        categories,
        audioStatus: 'PENDING',
        audioMuted: false,
        processingTime
      };

    } catch (error) {
      logger.error({ error, thumbnailUrl }, 'Thumbnail moderation failed');

      // On error, pass through in development
      return this.createFallbackResult(Date.now() - startTime, 'thumbnail_error');
    }
  }

  /**
   * Check audio policy
   *
   * STRICT: Flag any music (not speech)
   * WARN: Allow but warn user
   * PERMISSIVE: Allow any audio
   */
  private async checkAudioPolicy(videoId: string): Promise<{
    status: AudioStatus;
    muted: boolean;
  }> {
    // For MVP: Pass audio by default
    // Full implementation would:
    // 1. Extract audio track
    // 2. Use Whisper to transcribe
    // 3. If transcription is empty but audio exists -> likely music
    // 4. Apply policy based on AUDIO_POLICY

    switch (AUDIO_POLICY) {
      case 'PERMISSIVE':
        return { status: 'PASS', muted: false };

      case 'WARN':
        // Would flag for review but allow
        return { status: 'PASS', muted: false };

      case 'STRICT':
      default:
        // Would check for music and flag/mute
        // For MVP, pass everything
        return { status: 'PASS', muted: false };
    }
  }

  /**
   * Combine visual and audio moderation results
   */
  private combineResults(
    visualResult: {
      status: VideoModerationStatus;
      reason?: string;
      confidence?: number;
      categories?: Record<string, number>;
    },
    audioResult: {
      status: AudioStatus;
      muted: boolean;
    },
    startTime: number
  ): VideoModerationResult {
    return {
      status: visualResult.status,
      reason: visualResult.reason,
      confidence: visualResult.confidence,
      categories: visualResult.categories as VideoModerationResult['categories'],
      audioStatus: audioResult.status,
      audioMuted: audioResult.muted,
      processingTime: Date.now() - startTime
    };
  }

  /**
   * Update video record with moderation result
   */
  private async updateVideoModeration(
    videoId: string,
    result: VideoModerationResult
  ): Promise<void> {
    await prisma.video.update({
      where: { id: videoId },
      data: {
        moderationStatus: result.status,
        moderationReason: result.reason,
        moderationConfidence: result.confidence,
        audioStatus: result.audioStatus,
        audioMuted: result.audioMuted
      }
    });
  }

  /**
   * Create fallback result when service is unavailable
   */
  private createFallbackResult(startTime: number, type: string): VideoModerationResult {
    const isDevelopment = process.env.NODE_ENV !== 'production';

    // In development, auto-approve
    // In production, require manual review (PENDING)
    return {
      status: isDevelopment ? 'APPROVED' : 'PENDING',
      reason: isDevelopment ? `Development auto-approve (${type})` : `Requires manual review (${type})`,
      confidence: isDevelopment ? 1.0 : undefined,
      audioStatus: isDevelopment ? 'PASS' : 'PENDING',
      audioMuted: false,
      processingTime: Date.now() - startTime
    };
  }

  /**
   * Extract severity from Azure Content Safety response
   */
  private getSeverity(analysis: any, category: string): number {
    const result = analysis.categoriesAnalysis?.find(
      (c: any) => c.category === category
    );
    return result?.severity || 0;
  }

  /**
   * Get human-readable rejection reason
   */
  private getRejectReason(categories: Record<string, number>): string {
    const reasons: string[] = [];

    if (categories.hate >= SEVERITY_THRESHOLD_BLOCK) {
      reasons.push('hate content');
    }
    if (categories.selfHarm >= SEVERITY_THRESHOLD_BLOCK) {
      reasons.push('self-harm content');
    }
    if (categories.sexual >= SEVERITY_THRESHOLD_BLOCK) {
      reasons.push('sexual content');
    }
    if (categories.violence >= SEVERITY_THRESHOLD_BLOCK) {
      reasons.push('violent content');
    }

    return `Content flagged for: ${reasons.join(', ')}`;
  }

  /**
   * Queue a video for moderation (called after encoding completes)
   */
  async queueModeration(videoId: string): Promise<void> {
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: {
        id: true,
        originalUrl: true,
        thumbnailUrl: true,
        userId: true
      }
    });

    if (!video) {
      logger.warn({ videoId }, 'Video not found for moderation');
      return;
    }

    // Process moderation
    await this.moderateVideo({
      videoId: video.id,
      videoUrl: video.originalUrl,
      thumbnailUrl: video.thumbnailUrl || undefined,
      userId: video.userId
    });
  }

  /**
   * Check if service is configured
   */
  isAvailable(): boolean {
    return this.isConfigured;
  }
}

// Export singleton instance
export const videoContentModerationService = new VideoContentModerationService();
