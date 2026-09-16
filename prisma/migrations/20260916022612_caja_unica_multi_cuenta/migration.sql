-- CreateTable
CREATE TABLE "CashSessionAccount" (
    "id" TEXT NOT NULL,
    "cashSessionId" TEXT NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "openingAmount" DECIMAL(10,2) NOT NULL,
    "expectedAmount" DECIMAL(10,2),
    "actualAmount" DECIMAL(10,2),
    "difference" DECIMAL(10,2),

    CONSTRAINT "CashSessionAccount_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CashSessionAccount" ADD CONSTRAINT "CashSessionAccount_cashSessionId_fkey" FOREIGN KEY ("cashSessionId") REFERENCES "CashSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Antes de dropear las columnas viejas de CashSession (paymentMethod era
-- 1:1 con la sesion), cada fila existente se convierte en su propia
-- CashSessionAccount para no perder el historial ya cargado.
INSERT INTO "CashSessionAccount" ("id", "cashSessionId", "paymentMethod", "openingAmount", "expectedAmount", "actualAmount", "difference")
SELECT gen_random_uuid()::text, "id", "paymentMethod", "openingAmount", "expectedAmount", "actualAmount", "difference"
FROM "CashSession";

-- DropIndex
DROP INDEX "CashSession_paymentMethod_closedAt_idx";

-- AlterTable
ALTER TABLE "CashSession" DROP COLUMN "actualAmount",
DROP COLUMN "difference",
DROP COLUMN "expectedAmount",
DROP COLUMN "openingAmount",
DROP COLUMN "paymentMethod";

-- CreateIndex
CREATE UNIQUE INDEX "CashSessionAccount_cashSessionId_paymentMethod_key" ON "CashSessionAccount"("cashSessionId", "paymentMethod");

-- CreateIndex
CREATE INDEX "CashSession_closedAt_idx" ON "CashSession"("closedAt");
