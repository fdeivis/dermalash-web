import { prisma } from "@/lib/prisma";
import { peruToday, addDaysUTC, peruDayRange, fromPeruParts } from "@/lib/scheduling";
import type { AppointmentStatus } from "@prisma/client";

const WEEKDAYS_SHORT = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MONTHS_SHORT = [
  "ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic",
];

export type Bucket = { label: string; start: Date; end: Date };

// `día` es un solo bucket ("hoy"): Expense.date es una fecha neutra a
// medianoche de Perú, sin hora real, así que desglosar egresos por hora del
// día daría un resultado engañoso (todo caería en la hora 0). Un solo
// bucket evita ese problema de raíz en vez de mostrar un dato incorrecto.
function dailyBuckets(days: number): Bucket[] {
  const today = peruToday();
  const buckets: Bucket[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = addDaysUTC(today, -i);
    const { start, end } = peruDayRange(day);
    const label =
      days <= 7
        ? `${WEEKDAYS_SHORT[day.getUTCDay()]} ${day.getUTCDate()}`
        : `${day.getUTCDate()}/${day.getUTCMonth() + 1}`;
    buckets.push({ label, start, end });
  }
  return buckets;
}

function monthlyBuckets(months: number): Bucket[] {
  const today = peruToday();
  const buckets: Bucket[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const totalMonth = today.getUTCMonth() - i;
    const year = today.getUTCFullYear() + Math.floor(totalMonth / 12);
    const month = ((totalMonth % 12) + 12) % 12;
    const start = fromPeruParts(year, month + 1, 1, 0, 0);
    const nextTotalMonth = totalMonth + 1;
    const nextYear = today.getUTCFullYear() + Math.floor(nextTotalMonth / 12);
    const nextMonth = ((nextTotalMonth % 12) + 12) % 12;
    const end = new Date(fromPeruParts(nextYear, nextMonth + 1, 1, 0, 0).getTime() - 1);
    buckets.push({ label: MONTHS_SHORT[month], start, end });
  }
  return buckets;
}

export type Period = "dia" | "semana" | "mes" | "6meses" | "anio";

export function buildBuckets(period: Period): Bucket[] {
  switch (period) {
    case "dia":
      return dailyBuckets(1);
    case "semana":
      return dailyBuckets(7);
    case "mes":
      return dailyBuckets(30);
    case "6meses":
      return monthlyBuckets(6);
    case "anio":
      return monthlyBuckets(12);
  }
}

function bucketIndexFor(buckets: Bucket[], instant: Date): number {
  return buckets.findIndex((b) => instant >= b.start && instant <= b.end);
}

export type TurnosBucket = { label: string; reservado: number; confirmadoAtendido: number; cancelado: number };

export async function getTurnosPorPeriodo(period: Period): Promise<TurnosBucket[]> {
  const buckets = buildBuckets(period);
  const range = { gte: buckets[0].start, lte: buckets[buckets.length - 1].end };

  const appointments = await prisma.appointment.findMany({
    where: { startAt: range },
    select: { startAt: true, status: true },
  });

  const result: TurnosBucket[] = buckets.map((b) => ({
    label: b.label,
    reservado: 0,
    confirmadoAtendido: 0,
    cancelado: 0,
  }));

  const CANCEL_STATUSES: AppointmentStatus[] = ["CANCELADO", "NO_ASISTIO"];
  for (const a of appointments) {
    const idx = bucketIndexFor(buckets, a.startAt);
    if (idx === -1) continue;
    if (a.status === "RESERVADO") result[idx].reservado++;
    else if (a.status === "CONFIRMADO" || a.status === "ATENDIDO") result[idx].confirmadoAtendido++;
    else if (CANCEL_STATUSES.includes(a.status)) result[idx].cancelado++;
  }
  return result;
}

export type VentasBucket = { label: string; total: number };

export async function getVentasPorPeriodo(period: Period): Promise<VentasBucket[]> {
  const buckets = buildBuckets(period);
  const range = { gte: buckets[0].start, lte: buckets[buckets.length - 1].end };

  const sessions = await prisma.clientSession.findMany({
    where: { sessionDate: range },
    select: { sessionDate: true, totalAmount: true },
  });

  const result: VentasBucket[] = buckets.map((b) => ({ label: b.label, total: 0 }));
  for (const s of sessions) {
    const idx = bucketIndexFor(buckets, s.sessionDate);
    if (idx === -1) continue;
    result[idx].total += Number(s.totalAmount);
  }
  return result;
}

export type IngresosEgresosBucket = { label: string; ingresos: number; egresos: number };

export async function getIngresosEgresosPorPeriodo(period: Period): Promise<IngresosEgresosBucket[]> {
  const buckets = buildBuckets(period);
  const range = { gte: buckets[0].start, lte: buckets[buckets.length - 1].end };

  const [incomes, expenses] = await Promise.all([
    prisma.income.findMany({ where: { occurredAt: range }, select: { occurredAt: true, amount: true } }),
    prisma.expense.findMany({ where: { date: range }, select: { date: true, amount: true } }),
  ]);

  const result: IngresosEgresosBucket[] = buckets.map((b) => ({ label: b.label, ingresos: 0, egresos: 0 }));
  for (const i of incomes) {
    const idx = bucketIndexFor(buckets, i.occurredAt);
    if (idx === -1) continue;
    result[idx].ingresos += Number(i.amount);
  }
  for (const e of expenses) {
    const idx = bucketIndexFor(buckets, e.date);
    if (idx === -1) continue;
    result[idx].egresos += Number(e.amount);
  }
  return result;
}
