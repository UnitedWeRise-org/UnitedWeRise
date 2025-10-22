-- CreateTable
CREATE TABLE "public"."PageView" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "referrer" TEXT,
    "userId" TEXT,
    "isBot" BOOLEAN NOT NULL DEFAULT false,
    "isSuspicious" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionDuration" INTEGER,

    CONSTRAINT "PageView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DailyVisitStats" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "uniqueVisitors" INTEGER NOT NULL DEFAULT 0,
    "totalPageviews" INTEGER NOT NULL DEFAULT 0,
    "authenticatedVisits" INTEGER NOT NULL DEFAULT 0,
    "anonymousVisits" INTEGER NOT NULL DEFAULT 0,
    "botVisits" INTEGER NOT NULL DEFAULT 0,
    "signupsCount" INTEGER NOT NULL DEFAULT 0,
    "suspiciousActivityCount" INTEGER NOT NULL DEFAULT 0,
    "popularPages" JSONB,
    "avgSessionDuration" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyVisitStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."IPRateLimit" (
    "id" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "lastRequest" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blockedUntil" TIMESTAMP(3),
    "blockReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IPRateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AnalyticsConfig" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "rateLimitPerHour" INTEGER NOT NULL DEFAULT 100,
    "dataRetentionDays" INTEGER NOT NULL DEFAULT 30,
    "suspiciousThreshold" INTEGER NOT NULL DEFAULT 500,
    "blockDurationHours" INTEGER NOT NULL DEFAULT 24,
    "currentDailySalt" TEXT NOT NULL,
    "lastSaltRotation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trackingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalyticsConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PageView_ipHash_createdAt_idx" ON "public"."PageView"("ipHash", "createdAt");

-- CreateIndex
CREATE INDEX "PageView_path_createdAt_idx" ON "public"."PageView"("path", "createdAt");

-- CreateIndex
CREATE INDEX "PageView_userId_createdAt_idx" ON "public"."PageView"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PageView_createdAt_idx" ON "public"."PageView"("createdAt");

-- CreateIndex
CREATE INDEX "PageView_isBot_idx" ON "public"."PageView"("isBot");

-- CreateIndex
CREATE INDEX "PageView_isSuspicious_idx" ON "public"."PageView"("isSuspicious");

-- CreateIndex
CREATE UNIQUE INDEX "DailyVisitStats_date_key" ON "public"."DailyVisitStats"("date");

-- CreateIndex
CREATE INDEX "DailyVisitStats_date_idx" ON "public"."DailyVisitStats"("date");

-- CreateIndex
CREATE INDEX "IPRateLimit_ipHash_lastRequest_idx" ON "public"."IPRateLimit"("ipHash", "lastRequest");

-- CreateIndex
CREATE INDEX "IPRateLimit_blockedUntil_idx" ON "public"."IPRateLimit"("blockedUntil");

-- CreateIndex
CREATE UNIQUE INDEX "IPRateLimit_ipHash_key" ON "public"."IPRateLimit"("ipHash");

-- AddForeignKey
ALTER TABLE "public"."PageView" ADD CONSTRAINT "PageView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
