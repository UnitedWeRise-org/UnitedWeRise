-- AlterTable: Add viewToken field to MOTDView (conditionally - table may not exist in fresh deployments)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'MOTDView') THEN
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'MOTDView' AND column_name = 'viewToken') THEN
            ALTER TABLE "public"."MOTDView" ADD COLUMN "viewToken" TEXT;
        END IF;
    END IF;
END $$;

-- CreateIndex: Add index on viewToken for efficient lookups (conditionally)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'MOTDView') THEN
        CREATE INDEX IF NOT EXISTS "MOTDView_viewToken_idx" ON "public"."MOTDView"("viewToken");
    END IF;
END $$;

-- CreateIndex: Add unique constraint on (motdId, userId) to prevent duplicate authenticated views (conditionally)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'MOTDView') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'MOTDView_motdId_userId_key') THEN
            CREATE UNIQUE INDEX "MOTDView_motdId_userId_key" ON "public"."MOTDView"("motdId", "userId");
        END IF;
    END IF;
END $$;

-- CreateIndex: Add unique constraint on (motdId, viewToken) to prevent duplicate anonymous views (conditionally)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'MOTDView') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'MOTDView_motdId_viewToken_key') THEN
            CREATE UNIQUE INDEX "MOTDView_motdId_viewToken_key" ON "public"."MOTDView"("motdId", "viewToken");
        END IF;
    END IF;
END $$;
