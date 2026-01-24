-- CreateTable
CREATE TABLE "Video" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT,
    "videoType" TEXT NOT NULL DEFAULT 'REEL',
    "originalUrl" TEXT NOT NULL,
    "originalBlobName" TEXT NOT NULL,
    "hlsManifestUrl" TEXT,
    "mp4Url" TEXT,
    "thumbnailUrl" TEXT,
    "duration" DOUBLE PRECISION NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "aspectRatio" TEXT NOT NULL,
    "originalSize" INTEGER NOT NULL,
    "originalMimeType" TEXT NOT NULL,
    "encodingStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "encodingError" TEXT,
    "encodingStartedAt" TIMESTAMP(3),
    "encodingCompletedAt" TIMESTAMP(3),
    "moderationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "moderationReason" TEXT,
    "moderationConfidence" DOUBLE PRECISION,
    "audioStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "audioMuted" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "shareCount" INTEGER NOT NULL DEFAULT 0,
    "caption" TEXT,
    "hashtags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "publishStatus" TEXT NOT NULL DEFAULT 'DRAFT',
    "scheduledPublishAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Video_userId_idx" ON "Video"("userId");

-- CreateIndex
CREATE INDEX "Video_postId_idx" ON "Video"("postId");

-- CreateIndex
CREATE INDEX "Video_videoType_idx" ON "Video"("videoType");

-- CreateIndex
CREATE INDEX "Video_encodingStatus_idx" ON "Video"("encodingStatus");

-- CreateIndex
CREATE INDEX "Video_moderationStatus_idx" ON "Video"("moderationStatus");

-- CreateIndex
CREATE INDEX "Video_publishStatus_idx" ON "Video"("publishStatus");

-- CreateIndex
CREATE INDEX "Video_scheduledPublishAt_idx" ON "Video"("scheduledPublishAt");

-- CreateIndex
CREATE INDEX "Video_createdAt_idx" ON "Video"("createdAt");

-- CreateIndex
CREATE INDEX "Video_publishedAt_idx" ON "Video"("publishedAt");

-- CreateIndex
CREATE INDEX "Video_viewCount_idx" ON "Video"("viewCount");

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
