-- CreateTable: VerificationBalance
DO $$ BEGIN
  CREATE TABLE "VerificationBalance" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "totalPurchased" INTEGER NOT NULL DEFAULT 0,
    "totalConsumed" INTEGER NOT NULL DEFAULT 0,
    "dailyCap" INTEGER NOT NULL DEFAULT 500,
    "dailyConsumed" INTEGER NOT NULL DEFAULT 0,
    "dailyResetDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "autoReplenish" BOOLEAN NOT NULL DEFAULT false,
    "stripeCustomerId" TEXT,
    "stripePaymentMethodId" TEXT,
    "notificationEmail" TEXT,
    "usageAlertSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationBalance_pkey" PRIMARY KEY ("id")
  );
EXCEPTION WHEN duplicate_table THEN
  RAISE NOTICE 'Table VerificationBalance already exists, skipping';
END $$;

-- CreateTable: VerificationPurchase
DO $$ BEGIN
  CREATE TABLE "VerificationPurchase" (
    "id" TEXT NOT NULL,
    "balanceId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "stripeSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationPurchase_pkey" PRIMARY KEY ("id")
  );
EXCEPTION WHEN duplicate_table THEN
  RAISE NOTICE 'Table VerificationPurchase already exists, skipping';
END $$;

-- CreateIndex: VerificationBalance.candidateId (unique)
DO $$ BEGIN
  CREATE UNIQUE INDEX "VerificationBalance_candidateId_key" ON "VerificationBalance"("candidateId");
EXCEPTION WHEN duplicate_table THEN
  RAISE NOTICE 'Index VerificationBalance_candidateId_key already exists, skipping';
END $$;

-- CreateIndex: VerificationBalance.candidateId
DO $$ BEGIN
  CREATE INDEX "VerificationBalance_candidateId_idx" ON "VerificationBalance"("candidateId");
EXCEPTION WHEN duplicate_table THEN
  RAISE NOTICE 'Index VerificationBalance_candidateId_idx already exists, skipping';
END $$;

-- CreateIndex: VerificationPurchase.stripeSessionId (unique)
DO $$ BEGIN
  CREATE UNIQUE INDEX "VerificationPurchase_stripeSessionId_key" ON "VerificationPurchase"("stripeSessionId");
EXCEPTION WHEN duplicate_table THEN
  RAISE NOTICE 'Index VerificationPurchase_stripeSessionId_key already exists, skipping';
END $$;

-- CreateIndex: VerificationPurchase.balanceId
DO $$ BEGIN
  CREATE INDEX "VerificationPurchase_balanceId_idx" ON "VerificationPurchase"("balanceId");
EXCEPTION WHEN duplicate_table THEN
  RAISE NOTICE 'Index VerificationPurchase_balanceId_idx already exists, skipping';
END $$;

-- CreateIndex: VerificationPurchase.stripeSessionId
DO $$ BEGIN
  CREATE INDEX "VerificationPurchase_stripeSessionId_idx" ON "VerificationPurchase"("stripeSessionId");
EXCEPTION WHEN duplicate_table THEN
  RAISE NOTICE 'Index VerificationPurchase_stripeSessionId_idx already exists, skipping';
END $$;

-- AddForeignKey: VerificationBalance -> Candidate
DO $$ BEGIN
  ALTER TABLE "VerificationBalance" ADD CONSTRAINT "VerificationBalance_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Foreign key VerificationBalance_candidateId_fkey already exists, skipping';
END $$;

-- AddForeignKey: VerificationPurchase -> VerificationBalance
DO $$ BEGIN
  ALTER TABLE "VerificationPurchase" ADD CONSTRAINT "VerificationPurchase_balanceId_fkey" FOREIGN KEY ("balanceId") REFERENCES "VerificationBalance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Foreign key VerificationPurchase_balanceId_fkey already exists, skipping';
END $$;
