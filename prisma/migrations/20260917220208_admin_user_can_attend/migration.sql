-- AlterTable
ALTER TABLE "AdminUser" ADD COLUMN     "canAttend" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: Esteticista/Encargado ya atendían en producción (eran los
-- únicos roles filtrados en getSchedulableProfessionals antes de este
-- cambio), así que preservamos ese comportamiento. Socio/Admin quedan en
-- false: deben habilitarse a mano si corresponde.
UPDATE "AdminUser" SET "canAttend" = true WHERE "role" IN ('ESTETICISTA', 'ENCARGADO');
