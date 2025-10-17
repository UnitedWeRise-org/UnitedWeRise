-- CreateIndex
CREATE INDEX "TopicPost_postId_idx" ON "TopicPost"("postId");

-- CreateIndex
CREATE INDEX "Notification_senderId_idx" ON "Notification"("senderId");

-- CreateIndex
CREATE INDEX "CandidateAdminMessage_senderId_createdAt_idx" ON "CandidateAdminMessage"("senderId", "createdAt");
