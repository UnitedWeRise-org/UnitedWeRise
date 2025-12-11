-- AlterTable: Drop priority column from MessageOfTheDay (conditionally - table may not exist in fresh deployments)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'MessageOfTheDay') THEN
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'MessageOfTheDay' AND column_name = 'priority') THEN
            ALTER TABLE "public"."MessageOfTheDay" DROP COLUMN "priority";
        END IF;
    END IF;
END $$;

-- DropEnum: Remove MOTDPriority enum type (conditionally - may not exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MOTDPriority') THEN
        DROP TYPE "public"."MOTDPriority";
    END IF;
END $$;
