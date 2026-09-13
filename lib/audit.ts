import { prisma } from "@/lib/prisma";
import type { Session } from "next-auth";

/**
 * Registra una acción administrativa para la vista de auditoría (/admin/logs).
 * No debe interrumpir la operación principal si falla: se traga el error.
 */
export async function logAction(
  session: Session,
  action: string,
  entityType: string,
  entityId?: string,
  detail?: string
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name ?? session.user.email ?? "Desconocido",
        userRole: session.user.role,
        action,
        entityType,
        entityId,
        detail,
      },
    });
  } catch (error) {
    console.error("No se pudo registrar el log de auditoría:", error);
  }
}
