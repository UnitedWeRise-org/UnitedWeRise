-- Migration: Add profile privacy fields to User table
-- Date: 2025-01-20
-- Description: Adds maritalStatus and profilePrivacySettings fields to support granular profile privacy controls

-- Add maritalStatus field
ALTER TABLE "User" ADD COLUMN "maritalStatus" TEXT;

-- Add profilePrivacySettings field with default privacy settings
ALTER TABLE "User" ADD COLUMN "profilePrivacySettings" JSONB DEFAULT '{"bio":"public","website":"public","city":"followers","state":"followers","maritalStatus":"friends","phoneNumber":"private","politicalParty":"public"}'::jsonb;

-- Update existing users to have default privacy settings if they don't already have them
UPDATE "User"
SET "profilePrivacySettings" = '{"bio":"public","website":"public","city":"followers","state":"followers","maritalStatus":"friends","phoneNumber":"private","politicalParty":"public"}'::jsonb
WHERE "profilePrivacySettings" IS NULL;