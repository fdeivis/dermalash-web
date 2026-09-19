"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
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
  month: z.string().optional(),
});

// `throw new Error(...)` acá tiraba a la pantalla de error genérica de
// Next.js en vez de mostrar un mensaje entendible en la propia página —
// mismo patrón de redirect con `?error=` que ya usan el resto de los
// formularios del panel (ver agenda/actions.ts, sesiones/actions.ts).
function horariosUrl(error: string, month?: string) {
  const params = new URLSearchParams({ error });
  if (month) params.set("month", month);
  return `/admin/agenda/horarios?${params}`;
}

export async function createSchedule(formData: FormData) {
  const session = await requireAgendaManager();
  const data = scheduleSchema.parse({
    adminUserId: formData.get("adminUserId"),
    dayOfWeek: formData.get("dayOfWeek"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    month: formData.get("month") || undefined,
  });
  const startMinute = timeToMinutes(data.startTime);
  const endMinute = timeToMinutes(data.endTime);
  if (endMinute <= startMinute) redirect(horariosUrl("horario-fin-invalido", data.month));

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
  month: z.string().optional(),
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
    month: formData.get("month") || undefined,
  });
  if (data.endDate < data.startDate) redirect(horariosUrl("ausencia-fecha-invalida", data.month));
  if (Boolean(data.startTime) !== Boolean(data.endTime)) {
    redirect(horariosUrl("ausencia-horas-incompletas", data.month));
  }
  const startMinute = data.startTime ? timeToMinutes(data.startTime) : null;
  const endMinute = data.endTime ? timeToMinutes(data.endTime) : null;
  if (startMinute !== null && endMinute !== null && endMinute <= startMinute) {
    redirect(horariosUrl("ausencia-horario-invalido", data.month));
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
