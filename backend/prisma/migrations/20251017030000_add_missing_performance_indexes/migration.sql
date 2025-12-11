-- CreateIndex
CREATE INDEX IF NOT EXISTS "TopicPost_postId_idx" ON "TopicPost"("postId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Notification_senderId_idx" ON "Notification"("senderId");

-- CreateIndex (conditionally - table may not exist in fresh deployments)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'CandidateAdminMessage') THEN
        CREATE INDEX IF NOT EXISTS "CandidateAdminMessage_senderId_createdAt_idx" ON "CandidateAdminMessage"("senderId", "createdAt");
    END IF;
END $$;
