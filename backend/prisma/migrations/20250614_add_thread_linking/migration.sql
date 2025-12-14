-- Add thread linking columns to Post table
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "thread_head_id" TEXT;
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "thread_position" INTEGER NOT NULL DEFAULT 0;

-- Add foreign key for thread head relationship (SetNull on delete)
-- Use DO block to make constraint creation idempotent
DO $$ BEGIN
    ALTER TABLE "Post" ADD CONSTRAINT "Post_thread_head_id_fkey" FOREIGN KEY ("thread_head_id") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Add index for thread queries (IF NOT EXISTS for idempotency)
CREATE INDEX IF NOT EXISTS "Post_thread_head_id_thread_position_idx" ON "Post"("thread_head_id", "thread_position");

-- NOTE: Enum values (THREAD_DELETED) are handled by pre-migration script
-- DO NOT add ALTER TYPE ADD VALUE here - it conflicts with pre-migration sync
