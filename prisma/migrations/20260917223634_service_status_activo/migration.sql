-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('DRAFT', 'ACTIVO', 'PUBLISHED');

-- AlterTable: preservar los valores existentes (DRAFT/PUBLISHED se llaman
-- igual en el enum nuevo) en vez del drop+recreate que generó Prisma, que
-- hubiera perdido el estado de todos los servicios ya cargados.
ALTER TABLE "Service" ADD COLUMN "status_new" "ServiceStatus" NOT NULL DEFAULT 'DRAFT';
UPDATE "Service" SET "status_new" = "status"::text::"ServiceStatus";
ALTER TABLE "Service" DROP COLUMN "status";
ALTER TABLE "Service" RENAME COLUMN "status_new" TO "status";

-- CreateIndex
CREATE INDEX "Service_status_order_idx" ON "Service"("status", "order");
