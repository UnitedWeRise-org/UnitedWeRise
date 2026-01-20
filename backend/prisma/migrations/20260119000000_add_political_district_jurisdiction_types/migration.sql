-- AddPoliticalDistrictJurisdictionTypes
-- Adds CONGRESSIONAL, STATE_SENATE, STATE_HOUSE to JurisdictionType enum
-- for organization jurisdiction based on political boundaries

-- Add CONGRESSIONAL value to JurisdictionType enum
ALTER TYPE "JurisdictionType" ADD VALUE IF NOT EXISTS 'CONGRESSIONAL';

-- Add STATE_SENATE value to JurisdictionType enum
ALTER TYPE "JurisdictionType" ADD VALUE IF NOT EXISTS 'STATE_SENATE';

-- Add STATE_HOUSE value to JurisdictionType enum
ALTER TYPE "JurisdictionType" ADD VALUE IF NOT EXISTS 'STATE_HOUSE';
