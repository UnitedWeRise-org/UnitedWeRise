-- Clear test Stripe customer records to allow live mode customer creation
-- IMPORTANT: This will clear ALL Stripe customer records from the database
-- Users will have new Stripe customers created when they make their first live payment

-- Delete all existing Stripe customer records
DELETE FROM "StripeCustomer";

-- Optional: If you want to see how many records were deleted
-- SELECT COUNT(*) FROM "StripeCustomer";

-- Note: This does not affect user accounts, only the Stripe customer associations