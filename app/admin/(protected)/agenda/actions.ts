"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAgendaManager, requireAdminRole } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { createAlert } from "@/lib/alerts";
import { hasOverlap, isWithinSchedule, getTimeOffForDay, fromPeruParts, peruParts } from "@/lib/scheduling";

const appointmentSchema = z.object({
  clientId: z.string().min(1, "Seleccioná un cliente"),
  professionalId: z.string().min(1, "Seleccioná un profesional"),
  serviceIds: z.array(z.string()).min(1, "Seleccioná al menos un servicio"),
  date: z.string().min(1, "Elegí una fecha"),
  startTime: z.string().min(1, "Elegí un horario"),
  notes: z.string().max(2000).optional(),
  force: z.boolean().optional(),
});

// `date`/`startTime` vienen pensados en hora de Perú (lo que tipeó/eligió la
// persona), por eso pasan por fromPeruParts en vez de un new Date()/setHours
// directo, que interpretaría la hora en el huso del servidor (UTC en
// Vercel) y la correría 5 horas.
function buildRange(date: string, startTime: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [h, m] = startTime.split(":").map(Number);
  return fromPeruParts(year, month, day, h, m);
}

function dateKeyOf(date: Date) {
  const { year, month, day } = peruParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

async function resolveServicesAndEnd(serviceIds: string[], startAt: Date) {
  const services = await prisma.service.findMany({ where: { id: { in: serviceIds } } });
  if (services.length !== serviceIds.length) throw new Error("Servicio inválido");
  const totalMinutes = services.reduce((sum, s) => sum + s.durationMinutes, 0);
  const endAt = new Date(startAt.getTime() + totalMinutes * 60_000);
  return { services, endAt };
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

export async function createAppointment(formData: FormData) {
  const session = await requireAgendaManager();
  const data = parseAppointmentForm(formData);
  const startAt = buildRange(data.date, data.startTime);
  const { services, endAt } = await resolveServicesAndEnd(data.serviceIds, startAt);

  const dayOfWeek = peruParts(startAt).weekday;
  const [schedule, timeOff] = await Promise.all([
    prisma.schedule.findMany({ where: { adminUserId: data.professionalId, dayOfWeek } }),
    getTimeOffForDay(data.professionalId, startAt, endAt),
  ]);
  const withinSchedule = isWithinSchedule(schedule, startAt, endAt);
  // Se preservan cliente y servicios en el redirect de error para no obligar
  // a recargarlos: solo cambia lo que efectivamente falló (horario/profesional).
  const redirectParams = new URLSearchParams({
    professionalId: data.professionalId,
    date: data.date,
    startTime: data.startTime,
    clientId: data.clientId,
  });
  data.serviceIds.forEach((id) => redirectParams.append("serviceIds", id));
  if (timeOff && !data.force) {
    redirect(`/admin/agenda/nuevo?error=feriado&${redirectParams}`);
  }
  if (!withinSchedule && !data.force) {
    redirect(`/admin/agenda/nuevo?error=fuera-de-horario&${redirectParams}`);
  }

  if (await hasOverlap(data.professionalId, startAt, endAt)) {
    redirect(`/admin/agenda/nuevo?error=solapado&${redirectParams}`);
  }

  const appointment = await prisma.appointment.create({
    data: {
      clientId: data.clientId,
      professionalId: data.professionalId,
      startAt,
      endAt,
      notes: data.notes,
      forcedOutsideSchedule: !withinSchedule || Boolean(timeOff),
      createdByUserId: session.user.id,
      services: { create: services.map((s) => ({ serviceId: s.id })) },
    },
    include: { client: true },
  });

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

  const existing = await prisma.appointment.findUniqueOrThrow({
    where: { id },
    include: { services: { include: { service: true } }, client: true, session: true },
  });
  if (existing.status === "ATENDIDO") {
    throw new Error("No se puede reprogramar un turno ya atendido");
  }

  const startAt = buildRange(data.date, data.startTime);
  const totalMinutes = existing.services.reduce((sum, l) => sum + l.service.durationMinutes, 0);
  const endAt = new Date(startAt.getTime() + totalMinutes * 60_000);

  const dayOfWeek = peruParts(startAt).weekday;
  const [schedule, timeOff] = await Promise.all([
    prisma.schedule.findMany({ where: { adminUserId: data.professionalId, dayOfWeek } }),
    getTimeOffForDay(data.professionalId, startAt, endAt),
  ]);
  const withinSchedule = isWithinSchedule(schedule, startAt, endAt);
  if (timeOff && !force) {
    redirect(`/admin/agenda/${id}?error=feriado`);
  }
  if (!withinSchedule && !force) {
    redirect(`/admin/agenda/${id}?error=fuera-de-horario`);
  }
  if (await hasOverlap(data.professionalId, startAt, endAt, id)) {
    redirect(`/admin/agenda/${id}?error=solapado`);
  }

  await prisma.appointment.update({
    where: { id },
    data: {
      professionalId: data.professionalId,
      startAt,
      endAt,
      status: existing.status === "RESERVADO" ? "RESERVADO" : "CONFIRMADO",
      forcedOutsideSchedule: !withinSchedule || Boolean(timeOff),
    },
  });
  await logAction(
    session,
    "turno.reprogramar",
    "Appointment",
    id,
    `${existing.startAt.toISOString()} -> ${startAt.toISOString()}`
  );
  await createAlert(
    "TURNO_MODIFICADO",
    `Turno de ${existing.client.firstName} ${existing.client.lastName} reprogramado`,
    id
  );

  revalidatePath("/admin/agenda");
  redirect(`/admin/agenda?date=${data.date}`);
}

export async function cancelAppointment(id: string, formData: FormData) {
  const session = await requireAgendaManager();
  const reason = String(formData.get("cancelReason") || "").slice(0, 500);

  const existing = await prisma.appointment.findUniqueOrThrow({
    where: { id },
    include: { client: true, session: true },
  });
  if (existing.session) {
    throw new Error("No se puede cancelar un turno que ya tiene una sesión registrada");
  }

  await prisma.appointment.update({
    where: { id },
    data: { status: "CANCELADO", cancelReason: reason || undefined },
  });
  await logAction(session, "turno.cancelar", "Appointment", id, reason || undefined);
  await createAlert(
    "TURNO_CANCELADO",
    `Turno de ${existing.client.firstName} ${existing.client.lastName} cancelado`,
    id
  );

  revalidatePath("/admin/agenda");
  redirect(`/admin/agenda?date=${dateKeyOf(existing.startAt)}`);
}

export async function markNoShow(id: string) {
  const session = await requireAgendaManager();
  const existing = await prisma.appointment.findUniqueOrThrow({
    where: { id },
    include: { session: true },
  });
  if (existing.session) throw new Error("Este turno ya tiene una sesión registrada");

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
 * Borrado definitivo (distinto de cancelar): exclusivo de Administrador.
 * appointmentId queda como texto plano en la alerta y en el log porque el
 * registro deja de existir.
 */
export async function deleteAppointment(id: string) {
  const session = await requireAdminRole();
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
