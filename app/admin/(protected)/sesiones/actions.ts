"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth";
import { resolveSessionPricing } from "@/lib/pricing";
import { logAction } from "@/lib/audit";

const sessionSchema = z.object({
  clientId: z.string().min(1, "Seleccioná un cliente"),
  attendedByUserId: z.string().min(1, "Seleccioná un profesional"),
  sessionDate: z.coerce.date(),
  serviceIds: z.array(z.string()).min(1, "Seleccioná al menos un servicio"),
  totalAmount: z.coerce.number().nonnegative(),
  paymentMethod: z.enum(["EFECTIVO", "YAPE", "PLIN", "TARJETA", "TRANSFERENCIA", "OTRO"]),
  notes: z.string().max(2000, "Máximo 2000 caracteres").optional(),
});

export async function createClientSession(formData: FormData) {
  const session = await requireAdminSession();
  const data = sessionSchema.parse({
    clientId: formData.get("clientId"),
    attendedByUserId: formData.get("attendedByUserId"),
    sessionDate: formData.get("sessionDate"),
    serviceIds: formData.getAll("serviceIds"),
    totalAmount: formData.get("totalAmount"),
    paymentMethod: formData.get("paymentMethod"),
    notes: formData.get("notes") || undefined,
  });

  // El precio/promoción se resuelve de nuevo acá (no se confía en lo que
  // mostró el formulario) para que el snapshot use siempre la fecha real de
  // la sesión, aunque el usuario la haya cambiado a una fecha pasada.
  const resolved = await resolveSessionPricing(data.serviceIds, data.sessionDate);

  const clientSession = await prisma.$transaction(async (tx) => {
    const created = await tx.clientSession.create({
      data: {
        clientId: data.clientId,
        attendedByUserId: data.attendedByUserId,
        sessionDate: data.sessionDate,
        totalAmount: data.totalAmount,
        paymentMethod: data.paymentMethod,
        notes: data.notes,
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
        occurredAt: data.sessionDate,
      },
    });

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
  redirect("/admin/sesiones");
}

export async function deleteClientSession(id: string) {
  const session = await requireAdminSession();

  await prisma.$transaction([
    prisma.income.deleteMany({ where: { sessionId: id } }),
    prisma.clientSessionService.deleteMany({ where: { sessionId: id } }),
    prisma.clientSession.delete({ where: { id } }),
  ]);
  await logAction(session, "sesion.eliminar", "ClientSession", id);

  revalidatePath("/admin/sesiones");
  revalidatePath("/admin/clientes");
}
