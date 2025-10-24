"use strict";
/**
 * Image Content Moderation Types
 *
 * Defines interfaces and enums for Azure OpenAI Vision-based content moderation
 * Used throughout the photo upload and content analysis pipeline
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BLOCKED_CONTENT_TYPES = exports.MEDICAL_CONTENT_TYPES = exports.NEWSWORTHY_CONTENT_TYPES = exports.VIOLENT_CONTENT_TYPES = exports.ADULT_CONTENT_TYPES = exports.DEFAULT_MODERATION_CONFIG = exports.ContentType = exports.ModerationCategory = void 0;
const environment_1 = require("../utils/environment");
var ModerationCategory;
(function (ModerationCategory) {
    ModerationCategory["APPROVE"] = "APPROVE";
    ModerationCategory["WARN"] = "WARN";
    ModerationCategory["BLOCK"] = "BLOCK";
})(ModerationCategory || (exports.ModerationCategory = ModerationCategory = {}));
var ContentType;
(function (ContentType) {
    ContentType["CLEAN"] = "CLEAN";
    ContentType["MILD_VIOLENCE"] = "MILD_VIOLENCE";
    ContentType["GRAPHIC_NEWS"] = "GRAPHIC_NEWS";
    ContentType["MEDICAL_CONTENT"] = "MEDICAL_CONTENT";
    ContentType["POLITICAL_CONTENT"] = "POLITICAL_CONTENT";
    ContentType["DISTURBING_BUT_NEWSWORTHY"] = "DISTURBING_BUT_NEWSWORTHY";
    ContentType["PORNOGRAPHY"] = "PORNOGRAPHY";
    ContentType["EXTREME_VIOLENCE"] = "EXTREME_VIOLENCE";
    ContentType["ILLEGAL_CONTENT"] = "ILLEGAL_CONTENT";
    ContentType["UNKNOWN"] = "UNKNOWN";
})(ContentType || (exports.ContentType = ContentType = {}));
/**
 * Default moderation configuration
 */
exports.DEFAULT_MODERATION_CONFIG = {
    adultThreshold: 0.5,
    racyThreshold: 0.4,
    goreThreshold: 0.3,
    allowNewsworthyContent: true,
    newsworthyThreshold: 0.7,
    allowMedicalContent: true,
    medicalThreshold: 0.6,
    enableTextAnalysis: true,
    isProduction: (0, environment_1.isProduction)(),
    strictMode: (0, environment_1.isProduction)()
};
/**
 * Content type classification helpers
 */
exports.ADULT_CONTENT_TYPES = [
    ContentType.PORNOGRAPHY
];
exports.VIOLENT_CONTENT_TYPES = [
    ContentType.MILD_VIOLENCE,
    ContentType.EXTREME_VIOLENCE,
    ContentType.GRAPHIC_NEWS,
    ContentType.DISTURBING_BUT_NEWSWORTHY
];
exports.NEWSWORTHY_CONTENT_TYPES = [
    ContentType.GRAPHIC_NEWS,
    ContentType.POLITICAL_CONTENT,
    ContentType.DISTURBING_BUT_NEWSWORTHY
];
exports.MEDICAL_CONTENT_TYPES = [
    ContentType.MEDICAL_CONTENT
];
exports.BLOCKED_CONTENT_TYPES = [
    ContentType.PORNOGRAPHY,
    ContentType.EXTREME_VIOLENCE,
    ContentType.ILLEGAL_CONTENT
];
//# sourceMappingURL=moderation.js.map