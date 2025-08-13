-- Migration: Add feedback analysis fields to Post table
-- Created: 2025-01-12
-- Purpose: Enable AI-powered detection of site feedback, suggestions, and concerns

-- Add feedback detection fields to existing Post table
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "containsFeedback" BOOLEAN DEFAULT false;
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "feedbackType" TEXT;
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "feedbackCategory" TEXT;
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "feedbackPriority" TEXT;
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "feedbackConfidence" REAL;
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "feedbackSummary" TEXT;
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "feedbackStatus" TEXT DEFAULT 'new';

-- Create index for efficient feedback queries
CREATE INDEX IF NOT EXISTS "idx_post_feedback" ON "Post" ("containsFeedback", "feedbackType", "feedbackPriority");
CREATE INDEX IF NOT EXISTS "idx_post_feedback_status" ON "Post" ("feedbackStatus") WHERE "containsFeedback" = true;

-- Add comments for documentation
COMMENT ON COLUMN "Post"."containsFeedback" IS 'AI-detected flag indicating if post contains site feedback/suggestions';
COMMENT ON COLUMN "Post"."feedbackType" IS 'Type: suggestion, bug_report, concern, feature_request';
COMMENT ON COLUMN "Post"."feedbackCategory" IS 'Category: ui_ux, performance, functionality, accessibility, moderation';
COMMENT ON COLUMN "Post"."feedbackPriority" IS 'Priority: low, medium, high, critical';
COMMENT ON COLUMN "Post"."feedbackConfidence" IS 'AI confidence score (0.0-1.0) for feedback detection';
COMMENT ON COLUMN "Post"."feedbackSummary" IS 'AI-generated summary of the feedback content';
COMMENT ON COLUMN "Post"."feedbackStatus" IS 'Status: new, acknowledged, in_progress, resolved, dismissed';