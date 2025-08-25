-- Add candidate-admin direct messaging system
-- This script can be run safely on production without losing data

-- Create the AdminMessageType enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AdminMessageType') THEN
        CREATE TYPE "AdminMessageType" AS ENUM (
            'SUPPORT_REQUEST',
            'STATUS_INQUIRY', 
            'TECHNICAL_ISSUE',
            'POLICY_QUESTION',
            'FEATURE_REQUEST',
            'APPEAL_MESSAGE',
            'GENERAL'
        );
    END IF;
END $$;

-- Create the AdminMessagePriority enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AdminMessagePriority') THEN
        CREATE TYPE "AdminMessagePriority" AS ENUM (
            'LOW',
            'NORMAL',
            'HIGH',
            'URGENT'
        );
    END IF;
END $$;

-- Create the CandidateAdminMessage table
CREATE TABLE IF NOT EXISTS "CandidateAdminMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "candidateId" TEXT NOT NULL,
    "senderId" TEXT,
    "isFromAdmin" BOOLEAN NOT NULL DEFAULT false,
    "messageType" "AdminMessageType" NOT NULL DEFAULT 'GENERAL',
    "priority" "AdminMessagePriority" NOT NULL DEFAULT 'NORMAL',
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "readBy" TEXT,
    "threadId" TEXT,
    "replyToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "CandidateAdminMessage_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CandidateAdminMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CandidateAdminMessage_readBy_fkey" FOREIGN KEY ("readBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CandidateAdminMessage_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "CandidateAdminMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS "CandidateAdminMessage_candidateId_createdAt_idx" ON "CandidateAdminMessage"("candidateId", "createdAt");
CREATE INDEX IF NOT EXISTS "CandidateAdminMessage_threadId_idx" ON "CandidateAdminMessage"("threadId");
CREATE INDEX IF NOT EXISTS "CandidateAdminMessage_isRead_priority_idx" ON "CandidateAdminMessage"("isRead", "priority");
CREATE INDEX IF NOT EXISTS "CandidateAdminMessage_messageType_createdAt_idx" ON "CandidateAdminMessage"("messageType", "createdAt");

-- Create trigger to update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_candidate_admin_message_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_candidate_admin_message_updated_at ON "CandidateAdminMessage";
CREATE TRIGGER update_candidate_admin_message_updated_at
    BEFORE UPDATE ON "CandidateAdminMessage"
    FOR EACH ROW
    EXECUTE FUNCTION update_candidate_admin_message_updated_at();