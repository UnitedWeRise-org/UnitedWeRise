-- CreateTable: Public key storage for end-to-end encrypted messaging
CREATE TABLE "PublicKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Fast lookup of all public keys for a user
CREATE INDEX "PublicKey_userId_idx" ON "PublicKey"("userId");

-- CreateIndex: One key per device per user
CREATE UNIQUE INDEX "PublicKey_userId_deviceId_key" ON "PublicKey"("userId", "deviceId");

-- AddForeignKey: Cascade delete public keys when user is deleted
ALTER TABLE "PublicKey" ADD CONSTRAINT "PublicKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Add E2EE fields to Message model
ALTER TABLE "Message" ADD COLUMN "isEncrypted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Message" ADD COLUMN "senderPublicKeyId" TEXT;
