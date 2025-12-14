-- Add thread linking columns to Post table
ALTER TABLE "Post" ADD COLUMN "thread_head_id" TEXT;
ALTER TABLE "Post" ADD COLUMN "thread_position" INTEGER NOT NULL DEFAULT 0;

-- Add foreign key for thread head relationship (SetNull on delete)
ALTER TABLE "Post" ADD CONSTRAINT "Post_thread_head_id_fkey" FOREIGN KEY ("thread_head_id") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index for thread queries
CREATE INDEX "Post_thread_head_id_thread_position_idx" ON "Post"("thread_head_id", "thread_position");

-- Add THREAD_DELETED to ActivityType enum
ALTER TYPE "ActivityType" ADD VALUE 'THREAD_DELETED';
