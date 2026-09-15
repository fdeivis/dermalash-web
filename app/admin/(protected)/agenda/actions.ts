"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAgendaManager, requirePermission } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { createAlert } from "@/lib/alerts";
import { peruParts } from "@/lib/scheduling";
import { createAppointmentCore, rescheduleAppointmentCore, cancelAppointmentCore } from "@/lib/appointments/service";

const appointmentSchema = z.object({
  clientId: z.string().min(1, "Seleccioná un cliente"),
  professionalId: z.string().min(1, "Seleccioná un profesional"),
  serviceIds: z.array(z.string()).min(1, "Seleccioná al menos un servicio"),
  date: z.string().min(1, "Elegí una fecha"),
  startTime: z.string().min(1, "Elegí un horario"),
  notes: z.string().max(2000).optional(),
  force: z.boolean().optional(),
});

function dateKeyOf(date: Date) {
  const { year, month, day } = peruParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseAppointmentForm(formData: FormData) {
  return appointmentSchema.parse({
    clientId: formData.get("clientId"),
    professionalId: formData.get("professionalId"),
    serviceIds: formData.getAll("serviceIds"),
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    notes: formData.get("notes") || undefined,
    force: formData.get("force") === "on",
  });
}

const ERROR_REDIRECT: Record<string, string> = {
  feriado: "feriado",
  "fuera-de-horario": "fuera-de-horario",
  solapado: "solapado",
  "servicio-invalido": "servicio-invalido",
};

export async function createAppointment(formData: FormData) {
  const session = await requireAgendaManager();
  let data: z.infer<typeof appointmentSchema>;
  try {
    data = parseAppointmentForm(formData);
  } catch (error) {
    // Sin esto, enviar el form con algún campo inválido (típicamente: ningún
    // servicio tildado, que un checkbox no puede exigir con `required`)
    // tira un ZodError sin capturar y el usuario ve la pantalla de error
    // genérica de Next.js en vez de un mensaje entendible.
    if (!(error instanceof z.ZodError)) throw error;
    const params = new URLSearchParams({
      error: "datos-invalidos",
      professionalId: String(formData.get("professionalId") ?? ""),
      date: String(formData.get("date") ?? ""),
      startTime: String(formData.get("startTime") ?? ""),
      clientId: String(formData.get("clientId") ?? ""),
    });
    formData.getAll("serviceIds").forEach((id) => params.append("serviceIds", String(id)));
    redirect(`/admin/agenda/nuevo?${params}`);
  }

  // Se preservan cliente y servicios en el redirect de error para no obligar
  // a recargarlos: solo cambia lo que efectivamente falló (horario/profesional).
  const redirectParams = new URLSearchParams({
    professionalId: data.professionalId,
    date: data.date,
    startTime: data.startTime,
    clientId: data.clientId,
  });
  data.serviceIds.forEach((id) => redirectParams.append("serviceIds", id));

  const result = await createAppointmentCore({
    clientId: data.clientId,
    professionalId: data.professionalId,
    serviceIds: data.serviceIds,
    date: data.date,
    startTime: data.startTime,
    notes: data.notes,
    createdByUserId: session.user.id,
    source: "MANUAL",
    allowForce: data.force,
  });

  if (!result.ok) {
    const errorKey = ERROR_REDIRECT[result.error] ?? "datos-invalidos";
    redirect(`/admin/agenda/nuevo?error=${errorKey}&${redirectParams}`);
  }

  const { appointment } = result;
  await logAction(session, "turno.crear", "Appointment", appointment.id, appointment.client.firstName);
  await createAlert(
    "TURNO_CREADO",
    `Turno creado para ${appointment.client.firstName} ${appointment.client.lastName}`,
    appointment.id
  );

  revalidatePath("/admin/agenda");
  redirect(`/admin/agenda?date=${data.date}`);
}

const rescheduleSchema = z.object({
  professionalId: z.string().min(1),
  date: z.string().min(1),
  startTime: z.string().min(1),
});

export async function rescheduleAppointment(id: string, formData: FormData) {
  const session = await requireAgendaManager();
  const data = rescheduleSchema.parse({
    professionalId: formData.get("professionalId"),
    date: formData.get("date"),
    startTime: formData.get("startTime"),
  });
  const force = formData.get("force") === "on";

  const before = await prisma.appointment.findUniqueOrThrow({ where: { id }, include: { client: true } });

  const result = await rescheduleAppointmentCore(id, {
    professionalId: data.professionalId,
    date: data.date,
    startTime: data.startTime,
    allowForce: force,
  });

  if (!result.ok) {
    if (result.error === "turno-atendido") {
      throw new Error("No se puede reprogramar un turno ya atendido");
    }
    const errorKey = ERROR_REDIRECT[result.error] ?? "datos-invalidos";
    redirect(`/admin/agenda/${id}?error=${errorKey}`);
  }

  const { appointment } = result;
  await logAction(
    session,
    "turno.reprogramar",
    "Appointment",
    id,
    `${before.startAt.toISOString()} -> ${appointment.startAt.toISOString()}`
  );
  await createAlert(
    "TURNO_MODIFICADO",
    `Turno de ${before.client.firstName} ${before.client.lastName} reprogramado`,
    id
  );

  revalidatePath("/admin/agenda");
  redirect(`/admin/agenda?date=${data.date}`);
}

export async function cancelAppointment(id: string, formData: FormData) {
  const session = await requireAgendaManager();
  const reason = String(formData.get("cancelReason") || "").slice(0, 500);

  const result = await cancelAppointmentCore(id, { reason });
  if (!result.ok) {
    throw new Error("No se puede cancelar un turno que ya tiene una factura registrada");
  }
  const { appointment } = result;

  await logAction(session, "turno.cancelar", "Appointment", id, reason || undefined);
  await createAlert(
    "TURNO_CANCELADO",
    `Turno de ${appointment.client.firstName} ${appointment.client.lastName} cancelado`,
    id
  );

  revalidatePath("/admin/agenda");
  redirect(`/admin/agenda?date=${dateKeyOf(appointment.startAt)}`);
}

export async function markNoShow(id: string) {
  const session = await requireAgendaManager();
  const existing = await prisma.appointment.findUniqueOrThrow({
    where: { id },
    include: { session: true },
  });
  if (existing.session) throw new Error("Este turno ya tiene una factura registrada");

  await prisma.appointment.update({ where: { id }, data: { status: "NO_ASISTIO" } });
  await logAction(session, "turno.no-asistio", "Appointment", id);

  revalidatePath("/admin/agenda");
}

export async function confirmAppointment(id: string) {
  const session = await requireAgendaManager();
  await prisma.appointment.update({ where: { id }, data: { status: "CONFIRMADO" } });
  await logAction(session, "turno.confirmar", "Appointment", id);
  revalidatePath("/admin/agenda");
}

/**
 * Borrado definitivo (distinto de cancelar): requiere el permiso
 * "agenda.eliminar" (administrable desde /admin/permisos). appointmentId
 * queda como texto plano en la alerta y en el log porque el registro deja
 * de existir.
 */
export async function deleteAppointment(id: string) {
  const session = await requirePermission("agenda.eliminar");
  const existing = await prisma.appointment.findUniqueOrThrow({
    where: { id },
    include: { client: true },
  });
  const dateKey = dateKeyOf(existing.startAt);

  await prisma.$transaction([
    prisma.appointmentService.deleteMany({ where: { appointmentId: id } }),
    prisma.appointment.delete({ where: { id } }),
  ]);
  await logAction(
    session,
    "turno.borrar",
    "Appointment",
    id,
    `${existing.client.firstName} ${existing.client.lastName} — ${existing.startAt.toISOString()}`
  );
  await createAlert(
    "TURNO_BORRADO",
    `Turno de ${existing.client.firstName} ${existing.client.lastName} borrado definitivamente`,
    undefined
  );

  redirect(`/admin/agenda?date=${dateKey}`);
}
