-- Candidate Policy Platform System Migration
-- Creates tables for candidates to post structured policy positions

-- Policy Categories (standardized topics for comparison)
CREATE TABLE IF NOT EXISTS "PolicyCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "displayOrder" INTEGER DEFAULT 0,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);

-- Policy Positions by Candidates
CREATE TABLE IF NOT EXISTS "PolicyPosition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "candidateId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL, -- Short summary for comparison view
    "content" TEXT NOT NULL, -- Full detailed position
    "stance" TEXT, -- 'SUPPORT', 'OPPOSE', 'NEUTRAL', 'CONDITIONAL'
    "priority" INTEGER DEFAULT 5, -- 1-10 scale, how important to candidate
    "evidenceLinks" TEXT[], -- Supporting documentation URLs
    "keyPoints" TEXT[], -- Bullet points for quick comparison
    "embedding" DOUBLE PRECISION[], -- AI vector embedding for semantic comparison
    "isPublished" BOOLEAN DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "version" INTEGER DEFAULT 1, -- For tracking position changes
    "previousVersionId" TEXT, -- Reference to previous version
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "PolicyPosition_candidateId_fkey" 
        FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE,
    CONSTRAINT "PolicyPosition_categoryId_fkey" 
        FOREIGN KEY ("categoryId") REFERENCES "PolicyCategory"("id") ON DELETE RESTRICT,
    CONSTRAINT "PolicyPosition_previousVersionId_fkey" 
        FOREIGN KEY ("previousVersionId") REFERENCES "PolicyPosition"("id")
);

-- Policy Comparisons (for semantic similarity analysis)
CREATE TABLE IF NOT EXISTS "PolicyComparison" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "position1Id" TEXT NOT NULL,
    "position2Id" TEXT NOT NULL,
    "similarityScore" DOUBLE PRECISION NOT NULL, -- 0.0 to 1.0
    "agreementLevel" TEXT, -- 'AGREE', 'DISAGREE', 'PARTIAL', 'UNCLEAR'
    "keyDifferences" TEXT[],
    "analysisNotes" TEXT,
    "lastAnalyzed" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "PolicyComparison_position1Id_fkey" 
        FOREIGN KEY ("position1Id") REFERENCES "PolicyPosition"("id") ON DELETE CASCADE,
    CONSTRAINT "PolicyComparison_position2Id_fkey" 
        FOREIGN KEY ("position2Id") REFERENCES "PolicyPosition"("id") ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "PolicyPosition_candidateId_idx" ON "PolicyPosition"("candidateId");
CREATE INDEX IF NOT EXISTS "PolicyPosition_categoryId_idx" ON "PolicyPosition"("categoryId");
CREATE INDEX IF NOT EXISTS "PolicyPosition_isPublished_idx" ON "PolicyPosition"("isPublished");
CREATE INDEX IF NOT EXISTS "PolicyPosition_priority_idx" ON "PolicyPosition"("priority" DESC);
CREATE INDEX IF NOT EXISTS "PolicyComparison_similarity_idx" ON "PolicyComparison"("similarityScore" DESC);

-- Insert default policy categories
INSERT INTO "PolicyCategory" ("id", "name", "description", "icon", "displayOrder") VALUES
('cat_economy', 'Economy & Jobs', 'Economic policy, employment, business development', '💼', 1),
('cat_healthcare', 'Healthcare', 'Healthcare access, costs, and policy reform', '🏥', 2),
('cat_education', 'Education', 'K-12, higher education, and workforce training', '🎓', 3),
('cat_infrastructure', 'Infrastructure', 'Transportation, utilities, broadband, public works', '🏗️', 4),
('cat_environment', 'Environment', 'Climate change, conservation, clean energy', '🌱', 5),
('cat_housing', 'Housing', 'Affordable housing, development, homelessness', '🏠', 6),
('cat_justice', 'Criminal Justice', 'Law enforcement, courts, prison reform', '⚖️', 7),
('cat_immigration', 'Immigration', 'Border security, legal immigration, refugees', '🌍', 8),
('cat_taxes', 'Taxes & Budget', 'Tax policy, government spending, fiscal responsibility', '💰', 9),
('cat_social', 'Social Issues', 'Civil rights, equality, social programs', '👥', 10),
('cat_defense', 'Defense & Security', 'Military, national security, veterans affairs', '🛡️', 11),
('cat_technology', 'Technology & Privacy', 'Digital rights, AI regulation, cybersecurity', '💻', 12)
ON CONFLICT ("id") DO NOTHING;