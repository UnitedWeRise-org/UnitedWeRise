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

-- Drop ImageModerationResult (depends on Photo)
DROP TABLE IF EXISTS "ImageModerationResult" CASCADE;

-- Drop PhotoPrivacyRequest (depends on Photo and User)
DROP TABLE IF EXISTS "PhotoPrivacyRequest" CASCADE;

-- Drop PhotoTag (depends on Photo and User)
DROP TABLE IF EXISTS "PhotoTag" CASCADE;

-- Drop Photo (main photo table)
DROP TABLE IF EXISTS "Photo" CASCADE;

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
-- STEP 3 & 4: Data cleanup statements removed (Dec 2025)
-- ============================================================================
-- The UPDATE and DELETE statements were removed because:
-- 1. Data cleanup already executed on production and staging databases
-- 2. Prisma's shadow database may not have these columns/data
-- 3. This allows `prisma migrate dev` to work for creating new migrations

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
