-- DropTable: Remove legacy unified messaging tables (confirmed empty on both staging and production)
DROP TABLE IF EXISTS "UnifiedMessage";
DROP TABLE IF EXISTS "ConversationMeta";

-- DropEnum: Remove legacy unified message type enum
DROP TYPE IF EXISTS "UnifiedMessageType";
