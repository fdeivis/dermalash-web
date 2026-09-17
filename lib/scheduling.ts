import { prisma } from "@/lib/prisma";
import type { AdminUser, Schedule, TimeOff, Appointment, Service, Client } from "@prisma/client";
import { startOfDay, endOfDay, peruParts, peruDayRange } from "@/lib/time";

export {
  timeToMinutes,
  minutesToTime,
  minutesToTime12,
  formatDateTime12,
  generateTimeOptions,
  startOfDay,
  endOfDay,
  addDaysUTC,
  peruToday,
  parseDateKey,
  parseDateTimeLocal,
  fromPeruParts,
  peruParts,
  peruDayRange,
} from "@/lib/time";

/** Profesionales que pueden tener turnos: Esteticistas, Encargados y Socios
 * activos (Encargado/Socio "atienden" simplemente si además tienen horario
 * cargado, igual que una Esteticista). */
export async function getSchedulableProfessionals() {
  return prisma.adminUser.findMany({
    where: { active: true, role: { in: ["ESTETICISTA", "ENCARGADO", "SOCIO"] } },
    orderBy: { name: "asc" },
  });
}

/** Aclara en la agenda/selects que esa persona es la Encargada o la Socia,
 * no otra esteticista más (relevante porque puede o no atender clientes). */
export function professionalLabel(p: { name: string; role: string }) {
  if (p.role === "ENCARGADO") return `${p.name} (Encargada)`;
  if (p.role === "SOCIO") return `${p.name} (Socia)`;
  return p.name;
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
 * día completa (ej. al validar una creación/reprogramación de turno).
 * `startAt`/`endAt` son instantes reales (hora de Perú ya convertida a UTC
 * por `buildRange`); se los pasa por `peruParts` para saber a qué día
 * calendario y a qué franja horaria de Perú corresponden. */
export async function getTimeOffForDay(adminUserId: string, startAt: Date, endAt: Date) {
  const startParts = peruParts(startAt);
  const dayKey = new Date(Date.UTC(startParts.year, startParts.month - 1, startParts.day));
  const timeOffs = await prisma.timeOff.findMany({
    where: {
      OR: [{ adminUserId }, { adminUserId: null }],
      startDate: { lte: endOfDay(dayKey) },
      endDate: { gte: startOfDay(dayKey) },
    },
  });
  const endParts = peruParts(endAt);
  const range = {
    startMinute: startParts.hour * 60 + startParts.minute,
    endMinute: endParts.hour * 60 + endParts.minute,
  };
  return findTimeOff(timeOffs, adminUserId, dayKey, range);
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
  // `day` es una fecha calendario neutra (ver peruToday/parseDateKey): para
  // los turnos (que guardan el instante real) hay que traducirla al rango
  // real [00:00, 24:00) de ESE día en hora de Perú, no en UTC.
  const dayOfWeek = day.getUTCDay();
  const { start: dayStart, end: dayEnd } = peruDayRange(day);
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
        startAt: { gte: dayStart, lte: dayEnd },
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

/** [startAt, endAt) debe caer dentro de algún bloque de horario del profesional ese día de semana. */
export function isWithinSchedule(schedule: Schedule[], startAt: Date, endAt: Date) {
  const startMinute = peruParts(startAt).hour * 60 + peruParts(startAt).minute;
  const { hour: endHour, minute: endMin } = peruParts(endAt);
  const endMinute = endHour * 60 + endMin;
  return schedule.some((s) => startMinute >= s.startMinute && endMinute <= s.endMinute);
}
