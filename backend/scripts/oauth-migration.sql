-- OAuth Provider Migration Script
-- Adds OAuth provider support to the database schema

-- First, make password field nullable for OAuth-only accounts
ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;

-- Create OAuth provider enum
CREATE TYPE "OAuthProvider" AS ENUM ('GOOGLE', 'MICROSOFT', 'APPLE');

-- Create UserOAuthProvider table
CREATE TABLE "UserOAuthProvider" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "OAuthProvider" NOT NULL,
    "providerId" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "picture" TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserOAuthProvider_pkey" PRIMARY KEY ("id")
);

-- Create unique constraints
ALTER TABLE "UserOAuthProvider" ADD CONSTRAINT "UserOAuthProvider_provider_providerId_key" UNIQUE ("provider", "providerId");
ALTER TABLE "UserOAuthProvider" ADD CONSTRAINT "UserOAuthProvider_userId_provider_key" UNIQUE ("userId", "provider");

-- Create indexes for performance
CREATE INDEX "UserOAuthProvider_userId_idx" ON "UserOAuthProvider"("userId");
CREATE INDEX "UserOAuthProvider_provider_providerId_idx" ON "UserOAuthProvider"("provider", "providerId");

-- Add foreign key constraint
ALTER TABLE "UserOAuthProvider" ADD CONSTRAINT "UserOAuthProvider_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add comments for documentation
COMMENT ON TABLE "UserOAuthProvider" IS 'OAuth provider connections for user accounts';
COMMENT ON COLUMN "UserOAuthProvider"."providerId" IS 'Unique ID from the OAuth provider';
COMMENT ON COLUMN "UserOAuthProvider"."accessToken" IS 'OAuth access token (encrypted)';
COMMENT ON COLUMN "UserOAuthProvider"."refreshToken" IS 'OAuth refresh token (encrypted)';

-- Insert test data for development (optional - uncomment for testing)
/*
-- Example OAuth provider entries for test users
INSERT INTO "UserOAuthProvider" ("id", "userId", "provider", "providerId", "email", "name") 
VALUES 
    ('oauth_test_google_1', (SELECT id FROM "User" WHERE email = 'test@test.com' LIMIT 1), 'GOOGLE', 'google_123456789', 'test@test.com', 'Test User'),
    ('oauth_test_microsoft_1', (SELECT id FROM "User" WHERE email = 'test@test.com' LIMIT 1), 'MICROSOFT', 'microsoft_123456789', 'test@test.com', 'Test User')
ON CONFLICT DO NOTHING;
*/

-- Performance optimization: Update statistics
ANALYZE "UserOAuthProvider";