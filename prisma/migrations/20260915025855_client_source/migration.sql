-- CreateEnum
CREATE TYPE "ClientSource" AS ENUM ('WHATSAPP', 'INSTAGRAM', 'FACEBOOK', 'REFERIDO', 'PRESENCIAL', 'OTRO');

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "source" "ClientSource";
