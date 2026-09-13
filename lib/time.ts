// Helpers puros de fecha/hora, sin dependencia de Prisma, para poder
// importarlos también desde componentes cliente (ej. AppointmentForm) sin
// arrastrar el cliente de base de datos al bundle del navegador.

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

// Fecha + hora para mostrar en tablas (ej. "13/09/26, 9:00 a. m."). La parte
// de fecha sí se apoya en Intl (no pasa por el código de hora12 que resultó
// poco confiable); la hora usa `minutesToTime12`, calculada a mano.
export function formatDateTime12(date: Date): string {
  const datePart = date.toLocaleDateString("es-PE", { dateStyle: "short" });
  const timePart = minutesToTime12(date.getHours() * 60 + date.getMinutes());
  return `${datePart}, ${timePart}`;
}

export function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}
