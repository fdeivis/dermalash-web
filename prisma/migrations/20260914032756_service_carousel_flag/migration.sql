-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "carouselImage" TEXT,
ADD COLUMN     "showInCarousel" BOOLEAN NOT NULL DEFAULT false;

-- Preservar el carrusel de la home: los servicios ya publicados quedan
-- marcados como visibles en el carrusel; de acá en más es opt-in por
-- servicio (el default de la columna es false).
UPDATE "Service" SET "showInCarousel" = true WHERE "status" = 'PUBLISHED';
