-- Nuclear Photo System Removal Migration
-- This migration completely removes all photo-related tables and enums from the database
-- Created: 2025-10-02
-- Author: DATABASE MIGRATION AGENT

BEGIN;

-- ============================================================================
-- STEP 1: Drop dependent tables (respecting foreign key constraints)
-- ============================================================================

-- Drop ImageModerationReview (depends on ImageModerationResult)
DROP TABLE IF EXISTS "ImageModerationReview" CASCADE;
COMMENT ON TABLE "ImageModerationReview" IS 'DROPPED: Photo moderation review system removed';

-- Drop ImageModerationResult (depends on Photo)
DROP TABLE IF EXISTS "ImageModerationResult" CASCADE;
COMMENT ON TABLE "ImageModerationResult" IS 'DROPPED: Photo moderation result tracking removed';

-- Drop PhotoPrivacyRequest (depends on Photo and User)
DROP TABLE IF EXISTS "PhotoPrivacyRequest" CASCADE;
COMMENT ON TABLE "PhotoPrivacyRequest" IS 'DROPPED: Photo privacy request system removed';

-- Drop PhotoTag (depends on Photo and User)
DROP TABLE IF EXISTS "PhotoTag" CASCADE;
COMMENT ON TABLE "PhotoTag" IS 'DROPPED: Photo tagging system removed';

-- Drop Photo (main photo table)
DROP TABLE IF EXISTS "Photo" CASCADE;
COMMENT ON TABLE "Photo" IS 'DROPPED: Photo storage and management system removed';

-- ============================================================================
-- STEP 2: Drop photo-related enums
-- ============================================================================

-- Drop PhotoType enum
DROP TYPE IF EXISTS "PhotoType" CASCADE;

-- Drop PhotoPurpose enum
DROP TYPE IF EXISTS "PhotoPurpose" CASCADE;

-- Drop PhotoTagStatus enum
DROP TYPE IF EXISTS "PhotoTagStatus" CASCADE;

-- Drop PhotoPrivacyRequestType enum
DROP TYPE IF EXISTS "PhotoPrivacyRequestType" CASCADE;

-- Drop PhotoPrivacyRequestStatus enum
DROP TYPE IF EXISTS "PhotoPrivacyRequestStatus" CASCADE;

-- Drop ModerationStatus enum
DROP TYPE IF EXISTS "ModerationStatus" CASCADE;

-- Drop ModerationCategory enum
DROP TYPE IF EXISTS "ModerationCategory" CASCADE;

-- Drop ModerationDecision enum
DROP TYPE IF EXISTS "ModerationDecision" CASCADE;

-- ============================================================================
-- STEP 3: Optional cleanup - Reset user photo tagging settings
-- ============================================================================
-- These fields in the User table are no longer functional without the photo system
-- We set them to their default values to avoid confusion

UPDATE "User"
SET
  "allowTagsByFriendsOnly" = false,
  "photoTaggingEnabled" = true,
  "requireTagApproval" = true
WHERE
  "allowTagsByFriendsOnly" != false
  OR "photoTaggingEnabled" != true
  OR "requireTagApproval" != true;

-- ============================================================================
-- STEP 4: Clean up notification types related to photos
-- ============================================================================
-- Remove any existing notifications for photo tagging (these are now orphaned)

DELETE FROM "Notification"
WHERE "type" IN ('PHOTO_TAG_REQUEST', 'PHOTO_TAG_APPROVED', 'PHOTO_TAG_DECLINED', 'PRIVACY_REQUEST');

COMMIT;

-- ============================================================================
-- MIGRATION SUMMARY
-- ============================================================================
-- Tables Dropped:
--   1. ImageModerationReview
--   2. ImageModerationResult
--   3. PhotoPrivacyRequest
--   4. PhotoTag
--   5. Photo
--
-- Enums Dropped:
--   1. PhotoType
--   2. PhotoPurpose
--   3. PhotoTagStatus
--   4. PhotoPrivacyRequestType
--   5. PhotoPrivacyRequestStatus
--   6. ModerationStatus
--   7. ModerationCategory
--   8. ModerationDecision
--
-- Data Cleanup:
--   - Reset user photo tagging settings to defaults
--   - Removed photo-related notifications
--
-- Note: User.avatar and User.backgroundImage fields remain (these store URLs, not photo table references)
-- Note: Post.imageUrl and Message.imageUrl fields remain (direct URL storage, not photo table references)
-- ============================================================================
