// Helpers puros de fecha/hora, sin dependencia de Prisma, para poder
// importarlos también desde componentes cliente (ej. AppointmentForm) sin
// arrastrar el cliente de base de datos al bundle del navegador.

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

/** Opciones de horario para selects de turno (06:00 a 22:00 cada 30 min).
 * Se usa un <select> en vez de <input type="time"> con `step` para que un
 * valor fuera de paso no bloquee el envío del formulario sin avisar. */
export function generateTimeOptions() {
  const options: string[] = [];
  for (let m = 6 * 60; m <= 22 * 60; m += 30) options.push(minutesToTime(m));
  return options;
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
