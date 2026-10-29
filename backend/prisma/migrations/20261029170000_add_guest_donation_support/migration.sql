-- Make Payment.userId nullable to support guest (non-logged-in) donations and add guest contact fields
ALTER TABLE "Payment" ALTER COLUMN "userId" DROP NOT NULL;

ALTER TABLE "Payment" ADD COLUMN "guestEmail" TEXT;
ALTER TABLE "Payment" ADD COLUMN "guestName" TEXT;
