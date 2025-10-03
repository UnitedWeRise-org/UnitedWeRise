/**
 * Layer 6: Photo Upload with Pipeline Architecture
 *
 * Purpose: Clean route handler using reusable PhotoPipeline service
 * Features: Authentication + File Validation + EXIF Stripping + AI Moderation + Database
 * Layers:
 *   - Layer 0: Basic file transport ✅
 *   - Layer 1: Authentication ✅
 *   - Layer 2: File validation ✅
 *   - Layer 3: EXIF stripping and WebP conversion ✅
 *   - Layer 4: AI content moderation ✅
 *   - Layer 5: Database persistence ✅
 *   - Layer 6: Pipeline architecture ✅
 * Architecture: All processing logic extracted to PhotoPipeline service for reusability
 */
declare const router: import("express-serve-static-core").Router;
export default router;
//# sourceMappingURL=index.d.ts.map