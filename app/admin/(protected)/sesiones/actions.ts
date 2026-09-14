"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { professionalLabel } from "@/lib/scheduling";
import { resolveSessionPricing } from "@/lib/pricing";
import { logAction } from "@/lib/audit";
import { parseDateTimeLocal } from "@/lib/scheduling";

const sessionSchema = z.object({
  clientId: z.string().min(1, "Seleccioná un cliente"),
  attendedByUserId: z.string().min(1, "Seleccioná un profesional"),
  // string, no z.coerce.date(): ese coerce usa `new Date(valorDelInput)`, que
  // interpreta "YYYY-MM-DDTHH:MM" en el huso del servidor (UTC en Vercel) en
  // vez de en hora de Perú. Se convierte a mano más abajo con parseDateTimeLocal.
  sessionDate: z.string().min(1, "Elegí una fecha y hora"),
  serviceIds: z.array(z.string()).min(1, "Seleccioná al menos un servicio"),
  promotionIds: z.array(z.string()),
  totalAmount: z.coerce.number().nonnegative(),
  paymentMethod: z.enum(["EFECTIVO", "YAPE", "PLIN", "TARJETA", "TRANSFERENCIA", "OTRO"]),
  notes: z.string().max(2000, "Máximo 2000 caracteres").optional(),
  // Si la factura se origina desde (o se vincula a) un turno reservado,
  // queda vinculada y el turno pasa a Atendido en la misma operación — no
  // hay un botón manual separado para eso.
  appointmentId: z.string().optional(),
});

export async function createClientSession(formData: FormData) {
  const session = await requirePermission("sesiones.crear");
  const data = sessionSchema.parse({
    clientId: formData.get("clientId"),
    attendedByUserId: formData.get("attendedByUserId"),
    sessionDate: formData.get("sessionDate"),
    serviceIds: formData.getAll("serviceIds"),
    promotionIds: formData.getAll("promotionIds"),
    totalAmount: formData.get("totalAmount"),
    paymentMethod: formData.get("paymentMethod"),
    notes: formData.get("notes") || undefined,
    appointmentId: formData.get("appointmentId") || undefined,
  });

  const sessionDate = parseDateTimeLocal(data.sessionDate);

  // El precio/promoción se resuelve de nuevo acá (no se confía en lo que
  // mostró el formulario) para que el snapshot use siempre la fecha real de
  // la sesión, aunque el usuario la haya cambiado a una fecha pasada.
  const resolved = await resolveSessionPricing(data.serviceIds, data.promotionIds, sessionDate);

  const clientSession = await prisma.$transaction(async (tx) => {
    const created = await tx.clientSession.create({
      data: {
        clientId: data.clientId,
        attendedByUserId: data.attendedByUserId,
        sessionDate,
        totalAmount: data.totalAmount,
        paymentMethod: data.paymentMethod,
        notes: data.notes,
        appointmentId: data.appointmentId,
        createdByUserId: session.user.id,
        services: {
          create: resolved.lines.map((line) => ({
            serviceId: line.serviceId,
            promotionId: line.promotionId,
            priceApplied: line.priceApplied,
          })),
        },
      },
    });

    // 1:1 con sessionId único: evita generar el ingreso dos veces para la
    // misma sesión.
    await tx.income.create({
      data: {
        sessionId: created.id,
        amount: data.totalAmount,
        paymentMethod: data.paymentMethod,
        occurredAt: sessionDate,
      },
    });

    if (data.appointmentId) {
      await tx.appointment.update({
        where: { id: data.appointmentId },
        data: { status: "ATENDIDO" },
      });
    }

    return created;
  });
  await logAction(
    session,
    "sesion.crear",
    "ClientSession",
    clientSession.id,
    `S/ ${data.totalAmount}`
  );

  revalidatePath("/admin/sesiones");
  revalidatePath("/admin/clientes");
  revalidatePath("/admin/agenda");
  redirect("/admin/sesiones");
}

// Borrar una sesión cargada por error requiere el permiso "sesiones.eliminar"
// (administrable desde /admin/permisos; la Esteticista no lo tiene por
// defecto — sección 3 del diseño funcional). Si venía de un turno, ese turno
// vuelve a "Confirmado" en vez de quedar "Atendido" sin sesión real detrás.
export async function deleteClientSession(id: string) {
  const session = await requirePermission("sesiones.eliminar");

  const existing = await prisma.clientSession.findUniqueOrThrow({ where: { id } });

  await prisma.$transaction(async (tx) => {
    await tx.income.deleteMany({ where: { sessionId: id } });
    await tx.clientSessionService.deleteMany({ where: { sessionId: id } });
    await tx.clientSession.delete({ where: { id } });
    if (existing.appointmentId) {
      await tx.appointment.update({
        where: { id: existing.appointmentId },
        data: { status: "CONFIRMADO" },
      });
    }
  });
  await logAction(session, "sesion.eliminar", "ClientSession", id);

  revalidatePath("/admin/sesiones");
  revalidatePath("/admin/clientes");
  revalidatePath("/admin/agenda");
}

export type ClientOpenAppointment = {
  id: string;
  startAt: string;
  professionalId: string;
  professionalLabel: string;
  serviceIds: string[];
  serviceNames: string[];
};

/**
 * Turnos del cliente todavía sin factura (Reservado/Confirmado), para que el
 * formulario de factura pueda ofrecerlos como referencia y precargar sus
 * servicios al vincularlos.
 */
export async function getClientOpenAppointments(
  clientId: string
): Promise<ClientOpenAppointment[]> {
  await requirePermission("sesiones.crear");

  const appointments = await prisma.appointment.findMany({
    where: {
      clientId,
      status: { in: ["RESERVADO", "CONFIRMADO"] },
      session: null,
    },
    include: { services: { include: { service: true } }, professional: true },
    orderBy: { startAt: "asc" },
  });

  return appointments.map((a) => ({
    id: a.id,
    startAt: a.startAt.toISOString(),
    professionalId: a.professionalId,
    professionalLabel: professionalLabel(a.professional),
    serviceIds: a.services.map((s) => s.serviceId),
    serviceNames: a.services.map((s) => s.service.name),
  }));
}
