-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('MONTO', 'PORCENTAJE');

-- AlterTable
ALTER TABLE "AppointmentService" ADD COLUMN     "priceAtBooking" DECIMAL(10,2),
ADD COLUMN     "promotionAtBookingId" TEXT;

-- Los turnos ya existentes no tienen forma de saber que precio se les cotizo
-- en su momento; se rellenan con el precio actual del servicio como mejor
-- aproximacion antes de volver la columna obligatoria.
UPDATE "AppointmentService" a
SET "priceAtBooking" = s."price"
FROM "Service" s
WHERE a."serviceId" = s."id";

ALTER TABLE "AppointmentService" ALTER COLUMN "priceAtBooking" SET NOT NULL;

-- AlterTable
ALTER TABLE "ClientSession" ADD COLUMN     "discountReason" TEXT,
ADD COLUMN     "discountType" "DiscountType",
ADD COLUMN     "discountValue" DECIMAL(10,2);

-- AddForeignKey
ALTER TABLE "AppointmentService" ADD CONSTRAINT "AppointmentService_promotionAtBookingId_fkey" FOREIGN KEY ("promotionAtBookingId") REFERENCES "Promotion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
