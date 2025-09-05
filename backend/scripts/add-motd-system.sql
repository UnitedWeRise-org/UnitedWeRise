-- Message of the Day (MOTD) System Tables
-- September 5, 2025

-- Create MessageOfTheDay table
CREATE TABLE "MessageOfTheDay" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "showToNewUsers" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageOfTheDay_pkey" PRIMARY KEY ("id")
);

-- Create MOTDDismissal table
CREATE TABLE "MOTDDismissal" (
    "id" TEXT NOT NULL,
    "motdId" TEXT NOT NULL,
    "userId" TEXT,
    "dismissalToken" TEXT,
    "dismissedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MOTDDismissal_pkey" PRIMARY KEY ("id")
);

-- Create MOTDView table
CREATE TABLE "MOTDView" (
    "id" TEXT NOT NULL,
    "motdId" TEXT NOT NULL,
    "userId" TEXT,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "MOTDView_pkey" PRIMARY KEY ("id")
);

-- Create MOTDLog table
CREATE TABLE "MOTDLog" (
    "id" TEXT NOT NULL,
    "motdId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "changes" JSONB,
    "performedById" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "MOTDLog_pkey" PRIMARY KEY ("id")
);

-- Create indexes for MessageOfTheDay
CREATE INDEX "MessageOfTheDay_isActive_startDate_endDate_idx" ON "MessageOfTheDay"("isActive", "startDate", "endDate");
CREATE INDEX "MessageOfTheDay_createdAt_idx" ON "MessageOfTheDay"("createdAt");

-- Create indexes and unique constraints for MOTDDismissal
CREATE UNIQUE INDEX "MOTDDismissal_motdId_userId_key" ON "MOTDDismissal"("motdId", "userId");
CREATE UNIQUE INDEX "MOTDDismissal_motdId_dismissalToken_key" ON "MOTDDismissal"("motdId", "dismissalToken");
CREATE INDEX "MOTDDismissal_userId_idx" ON "MOTDDismissal"("userId");
CREATE INDEX "MOTDDismissal_dismissalToken_idx" ON "MOTDDismissal"("dismissalToken");

-- Create indexes for MOTDView
CREATE INDEX "MOTDView_motdId_viewedAt_idx" ON "MOTDView"("motdId", "viewedAt");
CREATE INDEX "MOTDView_userId_viewedAt_idx" ON "MOTDView"("userId", "viewedAt");

-- Create indexes for MOTDLog
CREATE INDEX "MOTDLog_motdId_performedAt_idx" ON "MOTDLog"("motdId", "performedAt");
CREATE INDEX "MOTDLog_performedById_idx" ON "MOTDLog"("performedById");

-- Add foreign key constraints
ALTER TABLE "MessageOfTheDay" ADD CONSTRAINT "MessageOfTheDay_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MOTDDismissal" ADD CONSTRAINT "MOTDDismissal_motdId_fkey" FOREIGN KEY ("motdId") REFERENCES "MessageOfTheDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MOTDDismissal" ADD CONSTRAINT "MOTDDismissal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MOTDView" ADD CONSTRAINT "MOTDView_motdId_fkey" FOREIGN KEY ("motdId") REFERENCES "MessageOfTheDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MOTDView" ADD CONSTRAINT "MOTDView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MOTDLog" ADD CONSTRAINT "MOTDLog_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Insert initial MOTD
INSERT INTO "MessageOfTheDay" (
    "id",
    "title",
    "content",
    "isActive",
    "showToNewUsers",
    "createdById",
    "updatedAt"
) VALUES (
    'initial_motd_sept_2025',
    'Welcome to United We Rise!',
    'UnitedWeRise is a nonprofit platform connecting candidates directly with voters.<br><br>No party machines. No corporate money. Just people sharing ideas.<br><br>Together, we can elect leaders who actually represent us, not the Elites.<br><br>Join the movement to reclaim democracy, because United We Rise!<br><br>United We Rise is funded by our users. If you are able, please consider donating.<br><br>Operated by People United for Peaceful Revolution, Inc. a 501(c)(3) nonprofit.',
    true,
    true,
    (SELECT "id" FROM "User" WHERE "isAdmin" = true LIMIT 1),
    CURRENT_TIMESTAMP
);