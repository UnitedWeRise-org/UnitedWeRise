/**
 * Image Content Moderation Types
 *
 * Defines interfaces and enums for Azure OpenAI Vision-based content moderation
 * Used throughout the photo upload and content analysis pipeline
 */
export declare enum ModerationCategory {
    APPROVE = "APPROVE",
    WARN = "WARN",
    BLOCK = "BLOCK"
}
export declare enum ContentType {
    CLEAN = "CLEAN",
    MILD_VIOLENCE = "MILD_VIOLENCE",
    GRAPHIC_NEWS = "GRAPHIC_NEWS",
    MEDICAL_CONTENT = "MEDICAL_CONTENT",
    POLITICAL_CONTENT = "POLITICAL_CONTENT",
    DISTURBING_BUT_NEWSWORTHY = "DISTURBING_BUT_NEWSWORTHY",
    PORNOGRAPHY = "PORNOGRAPHY",
    EXTREME_VIOLENCE = "EXTREME_VIOLENCE",
    ILLEGAL_CONTENT = "ILLEGAL_CONTENT",
    UNKNOWN = "UNKNOWN"
}
export interface ContentFlags {
    isAdult: boolean;
    isRacy: boolean;
    isGory: boolean;
    adultScore: number;
    racyScore: number;
    goreScore: number;
    hasText: boolean;
    textContent?: string;
    isNewsworthy: boolean;
    isMedical: boolean;
    isPolitical: boolean;
}
export interface ModerationResult {
    category: ModerationCategory;
    approved: boolean;
    reason: string;
    description: string;
    contentType: ContentType;
    contentFlags: ContentFlags;
    confidence: number;
    processingTime: number;
    model: string;
    timestamp: Date;
    rawResponse?: any;
}
export interface ModerationConfig {
    adultThreshold: number;
    racyThreshold: number;
    goreThreshold: number;
    allowNewsworthyContent: boolean;
    newsworthyThreshold: number;
    allowMedicalContent: boolean;
    medicalThreshold: number;
    enableTextAnalysis: boolean;
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
export declare const DEFAULT_MODERATION_CONFIG: ModerationConfig;
/**
 * Content type classification helpers
 */
export declare const ADULT_CONTENT_TYPES: ContentType[];
export declare const VIOLENT_CONTENT_TYPES: ContentType[];
export declare const NEWSWORTHY_CONTENT_TYPES: ContentType[];
export declare const MEDICAL_CONTENT_TYPES: ContentType[];
export declare const BLOCKED_CONTENT_TYPES: ContentType[];
//# sourceMappingURL=moderation.d.ts.map