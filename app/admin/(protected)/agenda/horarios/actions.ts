"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAgendaManager } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { timeToMinutes } from "@/lib/scheduling";

const scheduleSchema = z.object({
  adminUserId: z.string().min(1),
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
});

export async function createSchedule(formData: FormData) {
  const session = await requireAgendaManager();
  const data = scheduleSchema.parse({
    adminUserId: formData.get("adminUserId"),
    dayOfWeek: formData.get("dayOfWeek"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
  });
  const startMinute = timeToMinutes(data.startTime);
  const endMinute = timeToMinutes(data.endTime);
  if (endMinute <= startMinute) throw new Error("El horario de fin debe ser posterior al de inicio");

  await prisma.schedule.create({
    data: {
      adminUserId: data.adminUserId,
      dayOfWeek: data.dayOfWeek,
      startMinute,
      endMinute,
    },
  });
  await logAction(session, "horario.crear", "Schedule", data.adminUserId);

  revalidatePath("/admin/agenda/horarios");
}

export async function deleteSchedule(id: string) {
  const session = await requireAgendaManager();
  await prisma.schedule.delete({ where: { id } });
  await logAction(session, "horario.eliminar", "Schedule", id);

  revalidatePath("/admin/agenda/horarios");
}

const timeOffSchema = z.object({
  // "ALL" = excepción global (feriado): aplica a todos los profesionales,
  // no a uno en particular.
  adminUserId: z.string().min(1),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  // Opcionales: si se cargan ambas, la ausencia es por horas (ej. permiso de
  // media mañana) en vez de todo el día.
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  reason: z.string().max(500).optional(),
});

export async function createTimeOff(formData: FormData) {
  const session = await requireAgendaManager();
  const data = timeOffSchema.parse({
    adminUserId: formData.get("adminUserId"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    startTime: formData.get("startTime") || undefined,
    endTime: formData.get("endTime") || undefined,
    reason: formData.get("reason") || undefined,
  });
  if (data.endDate < data.startDate) throw new Error("La fecha de fin debe ser igual o posterior a la de inicio");
  if (Boolean(data.startTime) !== Boolean(data.endTime)) {
    throw new Error("Completa tanto la hora de inicio como la de fin, o deja ambas vacías");
  }
  const startMinute = data.startTime ? timeToMinutes(data.startTime) : null;
  const endMinute = data.endTime ? timeToMinutes(data.endTime) : null;
  if (startMinute !== null && endMinute !== null && endMinute <= startMinute) {
    throw new Error("La hora de fin debe ser posterior a la de inicio");
  }

  const adminUserId = data.adminUserId === "ALL" ? null : data.adminUserId;
  // Prisma solo acepta el FK opcional vía la relación `connect` en el
  // "checked" create input; pasar `adminUserId` directo con valor `null`
  // (feriado global) falla en runtime pidiendo el objeto `adminUser`.
  await prisma.timeOff.create({
    data: {
      startDate: data.startDate,
      endDate: data.endDate,
      startMinute,
      endMinute,
      reason: data.reason,
      ...(adminUserId ? { adminUser: { connect: { id: adminUserId } } } : {}),
    },
  });
  await logAction(session, "ausencia.crear", "TimeOff", adminUserId ?? undefined, data.reason);

  revalidatePath("/admin/agenda/horarios");
  revalidatePath("/admin/agenda");
}

export async function deleteTimeOff(id: string) {
  const session = await requireAgendaManager();
  await prisma.timeOff.delete({ where: { id } });
  await logAction(session, "ausencia.eliminar", "TimeOff", id);

  revalidatePath("/admin/agenda/horarios");
  revalidatePath("/admin/agenda");
}
