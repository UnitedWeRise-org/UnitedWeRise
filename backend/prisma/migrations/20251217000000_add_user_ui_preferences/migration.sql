-- AlterTable: Add uiPreferences JSON field to User model for storing UI preferences
-- like dismissed modals, collapsed panels, theme choices, etc.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "uiPreferences" JSONB;
