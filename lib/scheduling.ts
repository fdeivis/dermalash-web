import { prisma } from "@/lib/prisma";
import type { AdminUser, Schedule, TimeOff, Appointment, Service, Client } from "@prisma/client";
import { startOfDay, endOfDay } from "@/lib/time";

export {
  timeToMinutes,
  minutesToTime,
  minutesToTime12,
  formatDateTime12,
  generateTimeOptions,
  startOfDay,
  endOfDay,
} from "@/lib/time";

/** Profesionales que pueden tener turnos: Esteticistas y Encargados activos
 * (un Encargado "atiende" simplemente si además tiene horario cargado). */
export async function getSchedulableProfessionals() {
  return prisma.adminUser.findMany({
    where: { active: true, role: { in: ["ESTETICISTA", "ENCARGADO"] } },
    orderBy: { name: "asc" },
  });
}

/** Aclara en la agenda/selects que esa persona es la Encargada, no otra
 * esteticista más (relevante porque puede o no atender clientes). */
export function professionalLabel(p: { name: string; role: string }) {
  return p.role === "ENCARGADO" ? `${p.name} (Encargada)` : p.name;
}

// adminUserId null en el TimeOff = aplica a todos los profesionales (ej. un
// feriado), no solo a quien lo tenga asignado. startMinute/endMinute null =
// todo el día; si están cargados, solo bloquea esa franja (ej. permiso de
// media mañana). Sin `range`, se pregunta "¿hay algo ese día?" (para el
// badge de la grilla); con `range`, se pregunta por un bloque puntual.
export function findTimeOff(
  timeOffs: TimeOff[],
  adminUserId: string,
  day: Date,
  range?: { startMinute: number; endMinute: number }
) {
  const dayStart = startOfDay(day).getTime();
  return (
    timeOffs.find((t) => {
      const applies = t.adminUserId === adminUserId || t.adminUserId === null;
      const coversDay =
        startOfDay(t.startDate).getTime() <= dayStart && startOfDay(t.endDate).getTime() >= dayStart;
      if (!applies || !coversDay) return false;
      if (t.startMinute === null || t.endMinute === null) return true;
      if (!range) return true;
      return range.startMinute < t.endMinute && t.startMinute < range.endMinute;
    }) ?? null
  );
}

/** Variante de `findTimeOff` para cuando no se tiene ya cargada la agenda del
 * día completa (ej. al validar una creación/reprogramación de turno). */
export async function getTimeOffForDay(adminUserId: string, startAt: Date, endAt: Date) {
  const timeOffs = await prisma.timeOff.findMany({
    where: {
      OR: [{ adminUserId }, { adminUserId: null }],
      startDate: { lte: endOfDay(startAt) },
      endDate: { gte: startOfDay(startAt) },
    },
  });
  const range = {
    startMinute: startAt.getHours() * 60 + startAt.getMinutes(),
    endMinute: endAt.getHours() * 60 + endAt.getMinutes(),
  };
  return findTimeOff(timeOffs, adminUserId, startAt, range);
}

export type AppointmentWithDetails = Appointment & {
  services: { service: Service }[];
  client: Client;
};

export type DayAgenda = {
  professional: AdminUser;
  schedule: Schedule[];
  onTimeOff: TimeOff | null;
  timeOffs: TimeOff[];
  appointments: AppointmentWithDetails[];
};

/**
 * Fuente única de disponibilidad para un día: horario semanal, excepciones y
 * turnos ya tomados. La usa tanto la grilla del panel (MVP3) como, más
 * adelante, el asistente de WhatsApp (MVP4) para no tener un calendario
 * paralelo.
 */
export async function getDayAgenda(day: Date): Promise<DayAgenda[]> {
  const dayOfWeek = day.getDay();
  const [professionals, schedules, timeOffs, appointments] = await Promise.all([
    getSchedulableProfessionals(),
    prisma.schedule.findMany({ where: { dayOfWeek } }),
    prisma.timeOff.findMany({
      where: { startDate: { lte: endOfDay(day) }, endDate: { gte: startOfDay(day) } },
    }),
    // Se traen todos los estados, incluidos Cancelado/No asistió: la grilla
    // los muestra igual (para que quede visible qué pasó), pero no ocupan
    // el horario — eso lo decide la propia página al armar cada celda.
    prisma.appointment.findMany({
      where: {
        startAt: { gte: startOfDay(day), lte: endOfDay(day) },
      },
      include: { services: { include: { service: true } }, client: true },
      orderBy: { startAt: "asc" },
    }),
  ]);

  return professionals.map((professional) => ({
    professional,
    schedule: schedules
      .filter((s) => s.adminUserId === professional.id)
      .sort((a, b) => a.startMinute - b.startMinute),
    onTimeOff: findTimeOff(timeOffs, professional.id, day),
    timeOffs,
    appointments: appointments.filter((a) => a.professionalId === professional.id),
  }));
}

/** Nunca dos turnos superpuestos para el mismo profesional (regla dura, sección 8.3). */
export async function hasOverlap(
  professionalId: string,
  startAt: Date,
  endAt: Date,
  excludeAppointmentId?: string
) {
  const overlapping = await prisma.appointment.findFirst({
    where: {
      professionalId,
      status: { notIn: ["CANCELADO", "NO_ASISTIO"] },
      id: excludeAppointmentId ? { not: excludeAppointmentId } : undefined,
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
  });
  return Boolean(overlapping);
}

/** [startAt, endAt) debe caer dentro de algún bloque de horario del profesional ese día de semana. */
export function isWithinSchedule(schedule: Schedule[], startAt: Date, endAt: Date) {
  const startMinute = startAt.getHours() * 60 + startAt.getMinutes();
  const endMinute = endAt.getHours() * 60 + endAt.getMinutes();
  return schedule.some((s) => startMinute >= s.startMinute && endMinute <= s.endMinute);
}
