-- CreateTable
CREATE TABLE "ApplicationError" (
    "id" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "errorType" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "details" JSONB,
    "stack" TEXT,
    "userId" TEXT,
    "requestId" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationError_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApplicationError_service_createdAt_idx" ON "ApplicationError"("service", "createdAt");

-- CreateIndex
CREATE INDEX "ApplicationError_errorType_idx" ON "ApplicationError"("errorType");

-- CreateIndex
CREATE INDEX "ApplicationError_userId_idx" ON "ApplicationError"("userId");

-- CreateIndex
CREATE INDEX "ApplicationError_resolved_idx" ON "ApplicationError"("resolved");

-- CreateIndex
CREATE INDEX "ApplicationError_createdAt_idx" ON "ApplicationError"("createdAt");

-- AddForeignKey
ALTER TABLE "ApplicationError" ADD CONSTRAINT "ApplicationError_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
