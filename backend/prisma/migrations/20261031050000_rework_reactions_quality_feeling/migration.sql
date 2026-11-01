-- Reaction rework: separate content quality from event/issue feeling.
-- ReactionSentiment LIKE/DISLIKE mapped to quality; ReactionStance AGREE/DISAGREE
-- mapped to feeling POSITIVE/NEGATIVE.

CREATE TYPE "ReactionQuality" AS ENUM ('LOVE', 'LIKE', 'MEH', 'DISLIKE');
CREATE TYPE "ReactionFeeling" AS ENUM ('VERY_POSITIVE', 'POSITIVE', 'NEUTRAL', 'NEGATIVE', 'VERY_NEGATIVE');

ALTER TABLE "Reaction"
ADD COLUMN "quality" "ReactionQuality",
ADD COLUMN "feeling" "ReactionFeeling";

UPDATE "Reaction"
SET
  "quality" = CASE
    WHEN "sentiment" = 'LIKE' THEN 'LIKE'::"ReactionQuality"
    WHEN "sentiment" = 'DISLIKE' THEN 'DISLIKE'::"ReactionQuality"
    ELSE NULL
  END,
  "feeling" = CASE
    WHEN "stance" = 'AGREE' THEN 'POSITIVE'::"ReactionFeeling"
    WHEN "stance" = 'DISAGREE' THEN 'NEGATIVE'::"ReactionFeeling"
    ELSE NULL
  END;

ALTER TABLE "Reaction"
DROP COLUMN "sentiment",
DROP COLUMN "stance";

DROP TYPE "ReactionSentiment";
DROP TYPE "ReactionStance";

-- Detailed counters on posts
ALTER TABLE "Post"
ADD COLUMN "loveCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "likeCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "mehCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "dislikeCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "veryPositiveCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "positiveCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "neutralFeelingCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "negativeCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "veryNegativeCount" INTEGER NOT NULL DEFAULT 0;

UPDATE "Post"
SET
  "likeCount" = "likesCount",
  "dislikeCount" = "dislikesCount",
  "positiveCount" = "agreesCount",
  "negativeCount" = "disagreesCount";

-- Detailed counters on comments
ALTER TABLE "Comment"
ADD COLUMN "loveCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "likeCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "mehCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "dislikeCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "veryPositiveCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "positiveCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "neutralFeelingCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "negativeCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "veryNegativeCount" INTEGER NOT NULL DEFAULT 0;

UPDATE "Comment"
SET
  "likeCount" = "likesCount",
  "dislikeCount" = "dislikesCount",
  "positiveCount" = "agreesCount",
  "negativeCount" = "disagreesCount";
