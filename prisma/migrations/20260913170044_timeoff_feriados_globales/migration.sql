-- DropForeignKey
ALTER TABLE "TimeOff" DROP CONSTRAINT "TimeOff_adminUserId_fkey";

-- AlterTable
ALTER TABLE "TimeOff" ALTER COLUMN "adminUserId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "TimeOff" ADD CONSTRAINT "TimeOff_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

