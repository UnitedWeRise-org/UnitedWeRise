-- Add streetAddress2 field to support 2-line addresses
-- This script adds optional second address line support to all relevant tables

-- Add streetAddress2 to users table
ALTER TABLE users ADD COLUMN streetAddress2 VARCHAR(255);

-- Add streetAddress2 to candidates table
ALTER TABLE candidates ADD COLUMN streetAddress2 VARCHAR(255);

-- Add index for better query performance if needed
-- CREATE INDEX idx_users_street_address2 ON users(streetAddress2);
-- CREATE INDEX idx_candidates_street_address2 ON candidates(streetAddress2);

-- Update any views or procedures that might need to include the new field
-- (Add specific updates here if there are any views that need modification)

-- Comments for future reference:
-- - streetAddress2 is optional (can be NULL)
-- - Used for apartment, suite, unit, building, floor information
-- - Compatible with existing single-line streetAddress data
-- - No data migration needed - existing addresses remain in streetAddress field