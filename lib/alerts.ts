import { prisma } from "@/lib/prisma";
import type { AlertType, AppointmentSource } from "@prisma/client";

/**
 * Registra una alerta en la bandeja del panel (sección 8.6 del diseño
 * funcional). No debe interrumpir la operación principal si falla.
 */
export async function createAlert(
  type: AlertType,
  message: string,
  appointmentId?: string,
  source: AppointmentSource = "MANUAL"
) {
  try {
    await prisma.alert.create({
      data: { type, message, appointmentId, source },
    });
  } catch (error) {
    console.error("No se pudo registrar la alerta:", error);
  }
}
