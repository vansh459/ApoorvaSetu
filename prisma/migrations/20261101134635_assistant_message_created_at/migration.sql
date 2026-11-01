-- DropIndex
DROP INDEX "assistant_messages_userId_idx";

-- AlterTable
ALTER TABLE "assistant_messages" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "assistant_messages_userId_createdAt_idx" ON "assistant_messages"("userId", "createdAt");
