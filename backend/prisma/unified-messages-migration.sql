-- Unified messaging system migration
-- This creates a new unified messages table and migrates existing data

-- Create unified messages table
CREATE TABLE "UnifiedMessage" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL CHECK ("type" IN ('USER_USER', 'ADMIN_CANDIDATE')),
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "conversationId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnifiedMessage_pkey" PRIMARY KEY ("id")
);

-- Create indexes for performance
CREATE INDEX "UnifiedMessage_type_idx" ON "UnifiedMessage"("type");
CREATE INDEX "UnifiedMessage_senderId_idx" ON "UnifiedMessage"("senderId");
CREATE INDEX "UnifiedMessage_recipientId_idx" ON "UnifiedMessage"("recipientId");
CREATE INDEX "UnifiedMessage_conversationId_idx" ON "UnifiedMessage"("conversationId");
CREATE INDEX "UnifiedMessage_createdAt_idx" ON "UnifiedMessage"("createdAt");

-- Migrate existing USER_USER messages from Message table
INSERT INTO "UnifiedMessage" (
    "id",
    "type", 
    "senderId",
    "recipientId", 
    "content",
    "conversationId",
    "isRead",
    "createdAt",
    "updatedAt"
)
SELECT 
    "id",
    'USER_USER' as "type",
    "senderId",
    "recipientId",
    "content",
    "conversationId",
    "isRead",
    "createdAt",
    "updatedAt"
FROM "Message";

-- Migrate existing ADMIN_CANDIDATE messages from CandidateAdminMessage table
INSERT INTO "UnifiedMessage" (
    "id",
    "type",
    "senderId", 
    "recipientId",
    "content",
    "isRead",
    "createdAt",
    "updatedAt",
    "metadata"
)
SELECT 
    "id",
    'ADMIN_CANDIDATE' as "type",
    CASE 
        WHEN "isFromAdmin" = true THEN 'admin'
        ELSE "candidateId"
    END as "senderId",
    CASE 
        WHEN "isFromAdmin" = true THEN "candidateId" 
        ELSE 'admin'
    END as "recipientId",
    "message" as "content",
    "isRead",
    "createdAt",
    "updatedAt",
    jsonb_build_object('isFromAdmin', "isFromAdmin") as "metadata"
FROM "CandidateAdminMessage";

-- Create conversation metadata table for efficient lookups
CREATE TABLE "ConversationMeta" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL CHECK ("type" IN ('USER_USER', 'ADMIN_CANDIDATE')),
    "participants" TEXT[],
    "lastMessageAt" TIMESTAMP(3) NOT NULL,
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversationMeta_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ConversationMeta_type_idx" ON "ConversationMeta"("type");
CREATE INDEX "ConversationMeta_participants_idx" ON "ConversationMeta" USING GIN ("participants");

-- Populate conversation metadata from existing conversations
INSERT INTO "ConversationMeta" (
    "id",
    "type",
    "participants", 
    "lastMessageAt",
    "unreadCount",
    "createdAt",
    "updatedAt"
)
SELECT 
    COALESCE("conversationId", 
        CASE WHEN "type" = 'ADMIN_CANDIDATE' 
        THEN 'admin_' || "recipientId" 
        ELSE "senderId" || '_' || "recipientId" END
    ) as "id",
    "type",
    CASE WHEN "type" = 'ADMIN_CANDIDATE'
        THEN ARRAY['admin', CASE WHEN "senderId" = 'admin' THEN "recipientId" ELSE "senderId" END]
        ELSE ARRAY["senderId", "recipientId"]
    END as "participants",
    MAX("createdAt") as "lastMessageAt",
    COUNT(CASE WHEN "isRead" = false THEN 1 END)::INTEGER as "unreadCount",
    MIN("createdAt") as "createdAt",
    MAX("updatedAt") as "updatedAt"
FROM "UnifiedMessage"
GROUP BY 
    COALESCE("conversationId", 
        CASE WHEN "type" = 'ADMIN_CANDIDATE' 
        THEN 'admin_' || "recipientId" 
        ELSE "senderId" || '_' || "recipientId" END
    ), "type";

COMMIT;