-- Purge all existing unified messages to start fresh with new ID system
-- This will clear both message tables to eliminate any ID mismatch issues

-- Delete all unified messages
DELETE FROM "UnifiedMessage";

-- Delete all conversation metadata
DELETE FROM "ConversationMeta";

-- Verify tables are empty
SELECT 
  (SELECT COUNT(*) FROM "UnifiedMessage") as message_count,
  (SELECT COUNT(*) FROM "ConversationMeta") as conversation_count;