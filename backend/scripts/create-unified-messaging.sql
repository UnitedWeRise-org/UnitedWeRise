-- Create unified messaging tables without migrating existing data first
-- We'll migrate data in a separate step after tables are created

-- Create enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE "UnifiedMessageType" AS ENUM ('USER_USER', 'ADMIN_CANDIDATE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create UnifiedMessage table
CREATE TABLE IF NOT EXISTS "UnifiedMessage" (
    "id" TEXT NOT NULL,
    "type" "UnifiedMessageType" NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "conversationId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UnifiedMessage_pkey" PRIMARY KEY ("id")
);

-- Create ConversationMeta table
CREATE TABLE IF NOT EXISTS "ConversationMeta" (
    "id" TEXT NOT NULL,
    "type" "UnifiedMessageType" NOT NULL,
    "participants" TEXT[],
    "lastMessageAt" TIMESTAMP(3) NOT NULL,
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationMeta_pkey" PRIMARY KEY ("id")
);

-- Create indexes for UnifiedMessage
CREATE INDEX IF NOT EXISTS "UnifiedMessage_type_idx" ON "UnifiedMessage"("type");
CREATE INDEX IF NOT EXISTS "UnifiedMessage_senderId_idx" ON "UnifiedMessage"("senderId");
CREATE INDEX IF NOT EXISTS "UnifiedMessage_recipientId_idx" ON "UnifiedMessage"("recipientId");
CREATE INDEX IF NOT EXISTS "UnifiedMessage_conversationId_idx" ON "UnifiedMessage"("conversationId");
CREATE INDEX IF NOT EXISTS "UnifiedMessage_createdAt_idx" ON "UnifiedMessage"("createdAt");
CREATE INDEX IF NOT EXISTS "UnifiedMessage_type_senderId_recipientId_idx" ON "UnifiedMessage"("type", "senderId", "recipientId");

-- Create indexes for ConversationMeta
CREATE INDEX IF NOT EXISTS "ConversationMeta_type_idx" ON "ConversationMeta"("type");
CREATE INDEX IF NOT EXISTS "ConversationMeta_participants_idx" ON "ConversationMeta" USING GIN ("participants");
CREATE INDEX IF NOT EXISTS "ConversationMeta_lastMessageAt_idx" ON "ConversationMeta"("lastMessageAt");

-- Add updated_at trigger for UnifiedMessage
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW."updatedAt" = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_unified_message_updated_at ON "UnifiedMessage";
CREATE TRIGGER update_unified_message_updated_at 
    BEFORE UPDATE ON "UnifiedMessage" 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_conversation_meta_updated_at ON "ConversationMeta";
CREATE TRIGGER update_conversation_meta_updated_at 
    BEFORE UPDATE ON "ConversationMeta" 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();