-- CreateEnum
CREATE TYPE "UnifiedMessageType" AS ENUM ('USER_USER', 'ADMIN_CANDIDATE');

-- CreateTable
CREATE TABLE "UnifiedMessage" (
    "id" TEXT NOT NULL,
    "type" "UnifiedMessageType" NOT NULL,
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

-- CreateTable
CREATE TABLE "ConversationMeta" (
    "id" TEXT NOT NULL,
    "type" "UnifiedMessageType" NOT NULL,
    "participants" TEXT[],
    "lastMessageAt" TIMESTAMP(3) NOT NULL,
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversationMeta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UnifiedMessage_type_idx" ON "UnifiedMessage"("type");

-- CreateIndex
CREATE INDEX "UnifiedMessage_senderId_idx" ON "UnifiedMessage"("senderId");

-- CreateIndex
CREATE INDEX "UnifiedMessage_recipientId_idx" ON "UnifiedMessage"("recipientId");

-- CreateIndex
CREATE INDEX "UnifiedMessage_conversationId_idx" ON "UnifiedMessage"("conversationId");

-- CreateIndex
CREATE INDEX "UnifiedMessage_createdAt_idx" ON "UnifiedMessage"("createdAt");

-- CreateIndex
CREATE INDEX "UnifiedMessage_type_senderId_recipientId_idx" ON "UnifiedMessage"("type", "senderId", "recipientId");

-- CreateIndex
CREATE INDEX "ConversationMeta_type_idx" ON "ConversationMeta"("type");

-- CreateIndex
CREATE INDEX "ConversationMeta_participants_idx" ON "ConversationMeta" USING GIN ("participants");

-- CreateIndex
CREATE INDEX "ConversationMeta_lastMessageAt_idx" ON "ConversationMeta"("lastMessageAt");

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
    'USER_USER'::"UnifiedMessageType" as "type",
    "senderId",
    "recipientId",
    "content",
    "conversationId",
    COALESCE("isRead", false) as "isRead",
    "createdAt",
    "updatedAt"
FROM "Message"
WHERE "senderId" IS NOT NULL AND "recipientId" IS NOT NULL;

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
    'ADMIN_CANDIDATE'::"UnifiedMessageType" as "type",
    CASE 
        WHEN "isFromAdmin" = true THEN 'admin'
        ELSE "candidateId"
    END as "senderId",
    CASE 
        WHEN "isFromAdmin" = true THEN "candidateId" 
        ELSE 'admin'
    END as "recipientId",
    COALESCE("message", "content", '') as "content",
    COALESCE("isRead", false) as "isRead",
    "createdAt",
    "updatedAt",
    jsonb_build_object('isFromAdmin', "isFromAdmin") as "metadata"
FROM "CandidateAdminMessage"
WHERE "candidateId" IS NOT NULL;

-- Create conversation metadata from existing conversations
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
        THEN 'admin_candidate_' || (
            CASE WHEN "senderId" = 'admin' THEN "recipientId" ELSE "senderId" END
        )
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
        THEN 'admin_candidate_' || (
            CASE WHEN "senderId" = 'admin' THEN "recipientId" ELSE "senderId" END
        )
        ELSE "senderId" || '_' || "recipientId" END
    ), "type";