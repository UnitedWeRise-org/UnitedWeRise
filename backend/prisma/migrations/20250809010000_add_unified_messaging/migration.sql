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

-- NOTE: Data migration statements removed (Dec 2025)
-- The INSERT statements that migrated data from Message and CandidateAdminMessage
-- tables were removed because:
-- 1. Data migration already executed on production and staging databases
-- 2. Prisma's shadow database validation cannot run these on empty databases
-- 3. This allows `prisma migrate dev` to work for creating new migrations