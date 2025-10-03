/**
 * Layer 3: Photo Upload with EXIF Stripping
 *
 * Purpose: Strip EXIF metadata and convert to WebP for privacy and efficiency
 * Features: Authentication + File Validation + EXIF Stripping + WebP Conversion
 * Layers:
 *   - Layer 0: Basic file transport ✅
 *   - Layer 1: Authentication ✅
 *   - Layer 2: File validation ✅
 *   - Layer 3: EXIF stripping and WebP conversion ✅
 * Logging: Every step logs with requestId for tracing
 */
declare const router: import("express-serve-static-core").Router;
export default router;
//# sourceMappingURL=index.d.ts.map