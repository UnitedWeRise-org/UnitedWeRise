-- Fix conversation IDs to use new simplified format
-- Old format: admin_candidate_${candidateProfileId}
-- New format: admin_${userId}

-- First, let's see what we're dealing with
SELECT COUNT(*) as old_format_messages 
FROM "UnifiedMessage" 
WHERE "conversationId" LIKE 'admin_candidate_%';

-- Update conversation IDs for admin-candidate messages
-- This assumes the conversation ID should be based on the non-admin participant
UPDATE "UnifiedMessage"
SET "conversationId" = CASE
    WHEN "senderId" = 'admin' THEN CONCAT('admin_', "recipientId")
    ELSE CONCAT('admin_', "senderId")
END
WHERE "type" = 'ADMIN_CANDIDATE' 
  AND "conversationId" LIKE 'admin_candidate_%';

-- Update ConversationMeta table to match
UPDATE "ConversationMeta"
SET "id" = REPLACE("id", 'admin_candidate_', 'admin_')
WHERE "id" LIKE 'admin_candidate_%'
  AND "type" = 'ADMIN_CANDIDATE';

-- Verify the updates
SELECT COUNT(*) as new_format_messages 
FROM "UnifiedMessage" 
WHERE "conversationId" LIKE 'admin_%' 
  AND "conversationId" NOT LIKE 'admin_candidate_%';