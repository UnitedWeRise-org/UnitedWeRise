/**
 * Image Content Moderation Types
 *
 * Defines interfaces and enums for Azure OpenAI Vision-based content moderation
 * Used throughout the photo upload and content analysis pipeline
 */

import { isProduction } from '../utils/environment';

export enum ModerationCategory {
  APPROVE = 'APPROVE',
  WARN = 'WARN',
  BLOCK = 'BLOCK'
}

export enum ContentType {
  CLEAN = 'CLEAN',
  MILD_VIOLENCE = 'MILD_VIOLENCE',
  GRAPHIC_NEWS = 'GRAPHIC_NEWS',
  MEDICAL_CONTENT = 'MEDICAL_CONTENT',
  POLITICAL_CONTENT = 'POLITICAL_CONTENT',
  DISTURBING_BUT_NEWSWORTHY = 'DISTURBING_BUT_NEWSWORTHY',
  PORNOGRAPHY = 'PORNOGRAPHY',
  EXTREME_VIOLENCE = 'EXTREME_VIOLENCE',
  ILLEGAL_CONTENT = 'ILLEGAL_CONTENT',
  UNKNOWN = 'UNKNOWN'
}

export interface ContentFlags {
  // Content safety flags from Azure Vision
  isAdult: boolean;
  isRacy: boolean;
  isGory: boolean;

  // Confidence scores (0.0 - 1.0)
  adultScore: number;
  racyScore: number;
  goreScore: number;

  // Custom analysis flags
  hasText: boolean;
  textContent?: string;
  isNewsworthy: boolean;
  isMedical: boolean;
  isPolitical: boolean;
}

export interface ModerationResult {
  // Final moderation decision
  category: ModerationCategory;
  approved: boolean;

  // Human-readable explanation
  reason: string;
  description: string;

  // Detailed analysis
  contentType: ContentType;
  contentFlags: ContentFlags;

  // Processing metadata
  confidence: number;
  processingTime: number;
  model: string;
  timestamp: Date;

  // Azure Vision API raw response (for debugging)
  rawResponse?: any;
}

export interface ModerationConfig {
  // Threshold configuration
  adultThreshold: number;
  racyThreshold: number;
  goreThreshold: number;

  // Newsworthy content handling
  allowNewsworthyContent: boolean;
  newsworthyThreshold: number;

  // Medical content handling
  allowMedicalContent: boolean;
  medicalThreshold: number;

  // Text analysis
  enableTextAnalysis: boolean;

  // Environment-specific settings
  isProduction: boolean;
  strictMode: boolean;
}

export interface VisionAnalysisRequest {
  imageBuffer: Buffer;
  mimeType: string;
  photoType: string;
  userId: string;
  config?: Partial<ModerationConfig>;
}

export interface VisionAnalysisResponse {
  // Azure Vision API response structure
  categories?: Array<{
    name: string;
    score: number;
  }>;

  adult?: {
    isAdultContent: boolean;
    isRacyContent: boolean;
    isGoryContent: boolean;
    adultScore: number;
    racyScore: number;
    goreScore: number;
  };

  description?: {
    tags: string[];
    captions: Array<{
      text: string;
      confidence: number;
    }>;
  };

  objects?: Array<{
    objectProperty: string;
    confidence: number;
    rectangle: {
      x: number;
      y: number;
      w: number;
      h: number;
    };
  }>;

  faces?: Array<{
    age: number;
    gender: string;
    faceRectangle: {
      left: number;
      top: number;
      width: number;
      height: number;
    };
  }>;

  color?: {
    dominantColorForeground: string;
    dominantColorBackground: string;
    dominantColors: string[];
    accentColor: string;
    isBwImg: boolean;
  };

  imageType?: {
    clipArtType: number;
    lineDrawingType: number;
  };

  // OCR/Text recognition
  readResult?: {
    pages: Array<{
      lines: Array<{
        text: string;
        boundingBox: number[];
      }>;
    }>;
  };
}

/**
 * Default moderation configuration
 */
export const DEFAULT_MODERATION_CONFIG: ModerationConfig = {
  adultThreshold: 0.5,
  racyThreshold: 0.4,
  goreThreshold: 0.3,
  allowNewsworthyContent: true,
  newsworthyThreshold: 0.7,
  allowMedicalContent: true,
  medicalThreshold: 0.6,
  enableTextAnalysis: true,
  isProduction: isProduction(),
  strictMode: isProduction()
};

/**
 * Content type classification helpers
 */
export const ADULT_CONTENT_TYPES = [
  ContentType.PORNOGRAPHY
];

export const VIOLENT_CONTENT_TYPES = [
  ContentType.MILD_VIOLENCE,
  ContentType.EXTREME_VIOLENCE,
  ContentType.GRAPHIC_NEWS,
  ContentType.DISTURBING_BUT_NEWSWORTHY
];

export const NEWSWORTHY_CONTENT_TYPES = [
  ContentType.GRAPHIC_NEWS,
  ContentType.POLITICAL_CONTENT,
  ContentType.DISTURBING_BUT_NEWSWORTHY
];

export const MEDICAL_CONTENT_TYPES = [
  ContentType.MEDICAL_CONTENT
];

export const BLOCKED_CONTENT_TYPES = [
  ContentType.PORNOGRAPHY,
  ContentType.EXTREME_VIOLENCE,
  ContentType.ILLEGAL_CONTENT
];