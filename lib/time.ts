// Helpers puros de fecha/hora, sin dependencia de Prisma, para poder
// importarlos también desde componentes cliente (ej. AppointmentForm) sin
// arrastrar el cliente de base de datos al bundle del navegador.
//
// Perú es UTC-5 todo el año (sin horario de verano). El servidor (Vercel)
// corre en UTC: si se usan `new Date(\`\${d}T00:00:00\`)`, `.setHours()`,
// `.getHours()`, etc. tal cual, esos métodos interpretan la fecha/hora en el
// huso del proceso, no en el de Perú, y un turno cargado como "hoy 15:00"
// termina guardado como "15:00 UTC" = "10:00 en Perú" — 5 horas antes de lo
// que la persona quiso decir. Todo lo que toca Appointment/ClientSession
// pasa por los helpers de acá para no repetir ese error en cada lugar.

export const PERU_OFFSET_MS = 5 * 60 * 60 * 1000;

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

// Formato 24h "HH:MM": es el que viaja en `value` de inputs/selects y el que
// entienden las server actions (buildRange, timeToMinutes). No es el que se
// le muestra al usuario: en Perú se usa formato 12h am/pm.
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

// Formato 12h am/pm para mostrar (ej. "9:00 a. m."), calculado a mano sin
// Intl: el formateo de horas vía Intl resultó no ser confiable entre
// entornos para este proyecto (el runtime del servidor llegó a mostrar
// "0:00 p. m." para el mediodía en vez de "12:00 p. m.", y en otro caso
// mostró 24h donde el navegador mostraba 12h) — mejor no depender de eso
// para algo tan visible.
export function minutesToTime12(minutes: number): string {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h24 < 12 ? "a. m." : "p. m.";
  const h12 = h24 % 12 || 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}

/** Opciones de horario para selects de turno (06:00 a 22:00 cada 30 min):
 * `value` en 24h (lo que procesa el servidor), `label` en 12h am/pm (lo que
 * ve el usuario). Se usa un <select> en vez de <input type="time"> con
 * `step` para que un valor fuera de paso no bloquee el envío sin avisar. */
export function generateTimeOptions() {
  const options: { value: string; label: string }[] = [];
  for (let m = 6 * 60; m <= 22 * 60; m += 30) {
    options.push({ value: minutesToTime(m), label: minutesToTime12(m) });
  }
  return options;
}

/** Año/mes(1-12)/día/hora/minuto/día-de-semana(0=domingo) EN HORA DE PERÚ de
 * un instante real (ej. Appointment.startAt). Usar esto en vez de
 * `.getHours()`/`.getDay()` directo sobre esos campos. */
export function peruParts(date: Date) {
  const p = new Date(date.getTime() - PERU_OFFSET_MS);
  return {
    year: p.getUTCFullYear(),
    month: p.getUTCMonth() + 1,
    day: p.getUTCDate(),
    hour: p.getUTCHours(),
    minute: p.getUTCMinutes(),
    weekday: p.getUTCDay(),
  };
}

/** Instante real (UTC) correspondiente a una fecha/hora que alguien cargó
 * pensando en hora de Perú (ej. el formulario de turnos). Inverso de
 * `peruParts`. `hour` puede pasarse como 24 para pedir "el arranque del día
 * calendario siguiente" (Date.UTC normaliza el desborde). */
export function fromPeruParts(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0
): Date {
  return new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0) + PERU_OFFSET_MS);
}

/** "Hoy" en el calendario de Perú, como fecha neutra (medianoche UTC de esa
 * fecha) — mismo criterio que usan los campos de solo-fecha (TimeOff,
 * Promotion, el `date` de la URL de Agenda). No confundir con "ahora mismo"
 * (para eso, `new Date()` ya es correcto: comparar dos instantes reales no
 * necesita ningún ajuste). */
export function peruToday(): Date {
  const { year, month, day } = peruParts(new Date());
  return new Date(Date.UTC(year, month - 1, day));
}

/** Parsea "YYYY-MM-DD" como fecha calendario neutra (medianoche UTC), sin
 * pasar por el huso horario del proceso. No usar `new Date(\`\${s}T00:00:00\`)`:
 * esa forma sí se interpreta en el huso local del proceso. */
export function parseDateKey(s: string): Date {
  return new Date(`${s}T00:00:00Z`);
}

/** Parsea "YYYY-MM-DDTHH:MM" (valor de un <input type="datetime-local">)
 * asumiendo que la hora está pensada en hora de Perú (ver cabecera). */
export function parseDateTimeLocal(s: string): Date {
  const [datePart, timePart] = s.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = (timePart ?? "00:00").split(":").map(Number);
  return fromPeruParts(year, month, day, hour, minute);
}

/** Rango [inicio, fin] del día calendario de Perú (`day`, fecha neutra tipo
 * `peruToday`/`parseDateKey`) expresado en instantes reales (UTC) — para
 * filtrar campos que sí guardan el instante real, como Appointment.startAt. */
export function peruDayRange(day: Date): { start: Date; end: Date } {
  const year = day.getUTCFullYear();
  const month = day.getUTCMonth() + 1;
  const d = day.getUTCDate();
  const start = fromPeruParts(year, month, d, 0, 0);
  const end = new Date(fromPeruParts(year, month, d, 24, 0).getTime() - 1);
  return { start, end };
}

// Fecha + hora para mostrar en tablas (ej. "13/09/26, 9:00 a. m."), en hora
// de Perú, calculada a mano (ver nota de minutesToTime12 sobre no confiar en
// Intl para esto en este runtime).
export function formatDateTime12(date: Date): string {
  const { year, month, day, hour, minute } = peruParts(date);
  const pad = (n: number) => n.toString().padStart(2, "0");
  const datePart = `${pad(day)}/${pad(month)}/${String(year).slice(-2)}`;
  return `${datePart}, ${minutesToTime12(hour * 60 + minute)}`;
}

// Límites de un día calendario NEUTRO (sin ajuste de huso): usar solo con
// fechas de solo-fecha (TimeOff.startDate/endDate, Promotion, `day` de
// Agenda), nunca con instantes reales como Appointment.startAt — para esos,
// usar `peruDayRange`.
export function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function endOfDay(date: Date): Date {
  return new Date(startOfDay(date).getTime() + 24 * 60 * 60 * 1000 - 1);
}

/** Suma/resta días a una fecha calendario neutra (ver `startOfDay`). */
export function addDaysUTC(date: Date, days: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));
}
