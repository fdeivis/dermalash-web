import { prisma } from "@/lib/prisma";
import type { AppointmentSource } from "@prisma/client";
import {
  hasOverlap,
  isWithinSchedule,
  getTimeOffForDay,
  getDayAgenda,
  getSchedulableProfessionals,
  professionalLabel,
  fromPeruParts,
  peruParts,
  peruToday,
  parseDateKey,
  addDaysUTC,
  minutesToTime,
} from "@/lib/scheduling";

/**
 * Lógica de negocio de turnos, extraída de las Server Actions del panel
 * (`app/admin/(protected)/agenda/actions.ts`) para que el agente de IA
 * (MVP4) pueda invocarla sin pasar por `requireAgendaManager()` (que exige
 * una sesión de admin logueado, algo que no existe en un webhook de
 * WhatsApp ni en el chat simulado). Estas funciones no saben nada de quién
 * las llama ni de auth: eso lo resuelve cada punto de entrada (la Server
 * Action del panel, o `runAssistantTurn` para la IA).
 */

export type AppointmentActionError =
  | "solapado"
  | "fuera-de-horario"
  | "feriado"
  | "servicio-invalido"
  | "turno-atendido"
  | "turno-con-factura";

export type AppointmentActionResult<T> = { ok: true; appointment: T } | { ok: false; error: AppointmentActionError };

const APPOINTMENT_DETAILS_INCLUDE = {
  client: true,
  professional: true,
  services: { include: { service: true } },
} as const;

type AppointmentWithDetails = Awaited<ReturnType<typeof prisma.appointment.findFirstOrThrow<{
  include: typeof APPOINTMENT_DETAILS_INCLUDE;
}>>>;

// `date`/`startTime` vienen pensados en hora de Perú, por eso pasan por
// fromPeruParts en vez de un new Date() directo (que interpretaría la hora
// en el huso del servidor).
function buildRange(date: string, startTime: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [h, m] = startTime.split(":").map(Number);
  return fromPeruParts(year, month, day, h, m);
}

async function resolveServicesAndEnd(serviceIds: string[], startAt: Date) {
  const services = await prisma.service.findMany({ where: { id: { in: serviceIds } } });
  if (services.length !== serviceIds.length) return null;
  const totalMinutes = services.reduce((sum, s) => sum + s.durationMinutes, 0);
  const endAt = new Date(startAt.getTime() + totalMinutes * 60_000);
  return { services, endAt };
}

export type CreateAppointmentInput = {
  clientId: string;
  professionalId: string;
  serviceIds: string[];
  date: string; // "YYYY-MM-DD", hora de Perú
  startTime: string; // "HH:MM", hora de Perú
  notes?: string;
  createdByUserId: string;
  source: AppointmentSource;
  // Solo la Server Action del panel (uso humano) puede pasar `true` cuando
  // el admin tildó "Forzar". Las tools de la IA ni siquiera tienen este
  // campo en su input — es una restricción estructural, no de prompt.
  allowForce?: boolean;
};

export async function createAppointmentCore(
  input: CreateAppointmentInput
): Promise<AppointmentActionResult<AppointmentWithDetails>> {
  const startAt = buildRange(input.date, input.startTime);
  const resolved = await resolveServicesAndEnd(input.serviceIds, startAt);
  if (!resolved) return { ok: false, error: "servicio-invalido" };
  const { services, endAt } = resolved;

  const dayOfWeek = peruParts(startAt).weekday;
  const [schedule, timeOff] = await Promise.all([
    prisma.schedule.findMany({ where: { adminUserId: input.professionalId, dayOfWeek } }),
    getTimeOffForDay(input.professionalId, startAt, endAt),
  ]);
  const withinSchedule = isWithinSchedule(schedule, startAt, endAt);
  const force = input.allowForce ?? false;

  if (timeOff && !force) return { ok: false, error: "feriado" };
  if (!withinSchedule && !force) return { ok: false, error: "fuera-de-horario" };
  if (await hasOverlap(input.professionalId, startAt, endAt)) return { ok: false, error: "solapado" };

  const appointment = await prisma.appointment.create({
    data: {
      clientId: input.clientId,
      professionalId: input.professionalId,
      startAt,
      endAt,
      notes: input.notes,
      forcedOutsideSchedule: !withinSchedule || Boolean(timeOff),
      createdByUserId: input.createdByUserId,
      source: input.source,
      services: { create: services.map((s) => ({ serviceId: s.id })) },
    },
    include: APPOINTMENT_DETAILS_INCLUDE,
  });

  return { ok: true, appointment };
}

export type RescheduleAppointmentInput = {
  professionalId: string;
  date: string;
  startTime: string;
  allowForce?: boolean;
};

export async function rescheduleAppointmentCore(
  id: string,
  input: RescheduleAppointmentInput
): Promise<AppointmentActionResult<AppointmentWithDetails>> {
  const existing = await prisma.appointment.findUniqueOrThrow({
    where: { id },
    include: APPOINTMENT_DETAILS_INCLUDE,
  });
  if (existing.status === "ATENDIDO") return { ok: false, error: "turno-atendido" };

  const startAt = buildRange(input.date, input.startTime);
  const totalMinutes = existing.services.reduce((sum, l) => sum + l.service.durationMinutes, 0);
  const endAt = new Date(startAt.getTime() + totalMinutes * 60_000);

  const dayOfWeek = peruParts(startAt).weekday;
  const [schedule, timeOff] = await Promise.all([
    prisma.schedule.findMany({ where: { adminUserId: input.professionalId, dayOfWeek } }),
    getTimeOffForDay(input.professionalId, startAt, endAt),
  ]);
  const withinSchedule = isWithinSchedule(schedule, startAt, endAt);
  const force = input.allowForce ?? false;

  if (timeOff && !force) return { ok: false, error: "feriado" };
  if (!withinSchedule && !force) return { ok: false, error: "fuera-de-horario" };
  if (await hasOverlap(input.professionalId, startAt, endAt, id)) return { ok: false, error: "solapado" };

  const appointment = await prisma.appointment.update({
    where: { id },
    data: {
      professionalId: input.professionalId,
      startAt,
      endAt,
      status: existing.status === "RESERVADO" ? "RESERVADO" : "CONFIRMADO",
      forcedOutsideSchedule: !withinSchedule || Boolean(timeOff),
    },
    include: APPOINTMENT_DETAILS_INCLUDE,
  });

  return { ok: true, appointment };
}

export async function cancelAppointmentCore(
  id: string,
  input: { reason?: string }
): Promise<AppointmentActionResult<AppointmentWithDetails>> {
  const existing = await prisma.appointment.findUniqueOrThrow({
    where: { id },
    include: { ...APPOINTMENT_DETAILS_INCLUDE, session: true },
  });
  if (existing.session) return { ok: false, error: "turno-con-factura" };

  const appointment = await prisma.appointment.update({
    where: { id },
    data: { status: "CANCELADO", cancelReason: input.reason || undefined },
    include: APPOINTMENT_DETAILS_INCLUDE,
  });

  return { ok: true, appointment };
}

export type AvailableDaySlots = {
  date: string;
  weekday: string;
  professionalId: string;
  professionalName: string;
  slots: string[];
};

const SLOT_STEP_MINUTES = 30;
const WEEKDAYS_ES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

function toDateKey(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function minutesSincePeruMidnight(instant: Date) {
  const { hour, minute } = peruParts(instant);
  return hour * 60 + minute;
}

/**
 * Franjas realmente libres para un conjunto de servicios, reusando la misma
 * fuente de verdad que la grilla visual de la Agenda (`getDayAgenda`): sin
 * calendario paralelo para la IA.
 */
export async function getAvailableSlots(input: {
  serviceIds: string[];
  professionalId?: string;
  fromDateKey?: string;
  days?: number;
}): Promise<{ ok: true; days: AvailableDaySlots[] } | { ok: false; error: "servicio-invalido" }> {
  const services = await prisma.service.findMany({ where: { id: { in: input.serviceIds } } });
  if (services.length !== input.serviceIds.length) return { ok: false, error: "servicio-invalido" };
  const totalMinutes = services.reduce((sum, s) => sum + s.durationMinutes, 0);
  const days = input.days ?? 10;

  const results: AvailableDaySlots[] = [];
  let day = input.fromDateKey ? parseDateKey(input.fromDateKey) : peruToday();
  const now = new Date();

  for (let i = 0; i < days; i++) {
    const dayAgendas = await getDayAgenda(day);
    const relevant = input.professionalId
      ? dayAgendas.filter((d) => d.professional.id === input.professionalId)
      : dayAgendas;

    for (const d of relevant) {
      if (d.onTimeOff && d.onTimeOff.startMinute === null) continue; // ausencia todo el día

      const busyRanges = d.appointments
        .filter((a) => a.status !== "CANCELADO" && a.status !== "NO_ASISTIO")
        .map((a) => ({ start: minutesSincePeruMidnight(a.startAt), end: minutesSincePeruMidnight(a.endAt) }));

      const slots: string[] = [];
      for (const block of d.schedule) {
        for (let start = block.startMinute; start + totalMinutes <= block.endMinute; start += SLOT_STEP_MINUTES) {
          const end = start + totalMinutes;
          // Un horario de "hoy" que ya pasó no es una franja real, aunque
          // esté dentro del horario de trabajo (ej. son las 8pm y el
          // horario llega hasta las 6pm... pero si llegara hasta más
          // tarde, una franja de las 2pm ya pasó igual).
          const slotStart = fromPeruParts(
            day.getUTCFullYear(),
            day.getUTCMonth() + 1,
            day.getUTCDate(),
            Math.floor(start / 60),
            start % 60
          );
          if (slotStart <= now) continue;
          const overlapsBusy = busyRanges.some((b) => start < b.end && b.start < end);
          const overlapsTimeOff =
            d.onTimeOff &&
            d.onTimeOff.startMinute !== null &&
            d.onTimeOff.endMinute !== null &&
            start < d.onTimeOff.endMinute &&
            d.onTimeOff.startMinute < end;
          if (!overlapsBusy && !overlapsTimeOff) slots.push(minutesToTime(start));
        }
      }
      if (slots.length > 0) {
        results.push({
          date: toDateKey(day),
          weekday: WEEKDAYS_ES[day.getUTCDay()],
          professionalId: d.professional.id,
          professionalName: professionalLabel(d.professional),
          slots,
        });
      }
    }
    day = addDaysUTC(day, 1);
  }

  return { ok: true, days: results };
}

export type TimeRange = { desde: string; hasta: string };
export type AvailableDayUnion = { date: string; weekday: string; ranges: TimeRange[] };

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Convierte una lista de horarios sueltos (cada 30 min, cada uno un posible
 * inicio del servicio) en rangos continuos — "9:00 a 12:00" en vez de
 * enumerar 9:00, 9:30, 10:00, 10:30, 11:00. Se calcula acá, no se le pide al
 * modelo que lo infiera de una lista larga: mostró errores reales (saltear
 * horarios que sí estaban libres, como si "resumiera" a ojo en vez de
 * agrupar de verdad).
 *
 * El "hasta" de cada rango sale de sumarle la DURACIÓN DEL SERVICIO al
 * último inicio válido (no el paso de 30 min): si el último horario en que
 * se puede EMPEZAR es 11:00 y el servicio dura 60 min, el bloque real
 * termina a las 12:00, no a las 11:30 — sumar solo el paso subestimaba la
 * disponibilidad real en cualquier servicio de más de 30 minutos (que es
 * casi todos).
 */
function collapseToRanges(sortedTimes: string[], serviceDurationMinutes: number): TimeRange[] {
  const ranges: TimeRange[] = [];
  let start: string | null = null;
  let prevMinutes = 0;

  for (let i = 0; i < sortedTimes.length; i++) {
    const minutes = timeToMinutes(sortedTimes[i]);
    if (start === null) {
      start = sortedTimes[i];
    } else if (minutes - prevMinutes > SLOT_STEP_MINUTES) {
      ranges.push({ desde: start, hasta: minutesToTime(prevMinutes + serviceDurationMinutes) });
      start = sortedTimes[i];
    }
    prevMinutes = minutes;
  }
  if (start !== null) ranges.push({ desde: start, hasta: minutesToTime(prevMinutes + serviceDurationMinutes) });
  return ranges;
}

/**
 * Igual que `getAvailableSlots`, pero sin exponer qué profesional está
 * libre en cada franja: solo la unión de horarios donde AL MENOS una
 * esteticista tiene lugar. Quién atiende es información interna del
 * negocio — el cliente elige un horario, no una persona (sección 8.1 del
 * diseño funcional: "el sistema ofrece el primer profesional disponible").
 */
export async function getAvailableSlotsUnion(input: {
  serviceIds: string[];
  fromDateKey?: string;
  days?: number;
}): Promise<{ ok: true; days: AvailableDayUnion[] } | { ok: false; error: "servicio-invalido" }> {
  const [services, perProfessional] = await Promise.all([
    prisma.service.findMany({ where: { id: { in: input.serviceIds } } }),
    getAvailableSlots(input),
  ]);
  if (!perProfessional.ok) return perProfessional;
  const totalMinutes = services.reduce((sum, s) => sum + s.durationMinutes, 0);

  const byDate = new Map<string, { weekday: string; slots: Set<string> }>();
  for (const day of perProfessional.days) {
    const entry = byDate.get(day.date) ?? { weekday: day.weekday, slots: new Set<string>() };
    day.slots.forEach((s) => entry.slots.add(s));
    byDate.set(day.date, entry);
  }

  const days = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => {
      const sorted = [...v.slots].sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
      return { date, weekday: v.weekday, ranges: collapseToRanges(sorted, totalMinutes) };
    });
  return { ok: true, days };
}

/**
 * Para un horario puntual ya elegido por el cliente, encuentra qué
 * profesional está realmente libre (para asignarla al crear/reprogramar el
 * turno) sin que el cliente haya tenido que verla ni elegirla.
 */
export async function findAvailableProfessional(input: {
  serviceIds: string[];
  date: string;
  startTime: string;
}): Promise<{ professionalId: string; professionalName: string } | null> {
  const result = await getAvailableSlots({ serviceIds: input.serviceIds, fromDateKey: input.date, days: 1 });
  if (!result.ok) return null;
  // Varias esteticistas pueden estar libres a la misma hora: se elige al
  // azar entre todas, no siempre la primera de la lista (para repartir la
  // carga de trabajo en vez de sobrecargar a una sola).
  const matches = result.days.filter((d) => d.date === input.date && d.slots.includes(input.startTime));
  if (matches.length === 0) return null;
  const chosen = matches[Math.floor(Math.random() * matches.length)];
  return { professionalId: chosen.professionalId, professionalName: chosen.professionalName };
}

export { getSchedulableProfessionals };
