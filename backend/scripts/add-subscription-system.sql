-- Add Subscription System Migration
-- This adds support for user subscriptions with algorithmic boost priority

-- Create the Subscription table
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "subscribedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint to prevent duplicate subscriptions
CREATE UNIQUE INDEX "Subscription_subscriberId_subscribedId_key" ON "Subscription"("subscriberId", "subscribedId");

-- Create indexes for efficient querying
CREATE INDEX "Subscription_subscriberId_idx" ON "Subscription"("subscriberId");
CREATE INDEX "Subscription_subscribedId_idx" ON "Subscription"("subscribedId");

-- Add foreign key constraints
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_subscribedId_fkey" FOREIGN KEY ("subscribedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;