import Link from "next/link";
import { requireAdminSession } from "@/lib/auth";
import {
  getDayAgenda,
  findTimeOff,
  minutesToTime,
  professionalLabel,
  type DayAgenda,
} from "@/lib/scheduling";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const STEP_MINUTES = 30;
const DEFAULT_START_MINUTE = 8 * 60; // 08:00, si nadie tiene horario cargado ese día
const DEFAULT_END_MINUTE = 20 * 60; // 20:00

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function minutesToLabel(minutes: number) {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

const STATUS_LABEL: Record<string, string> = {
  RESERVADO: "Reservado",
  CONFIRMADO: "Confirmado",
  ATENDIDO: "Atendido",
  CANCELADO: "Cancelado",
  NO_ASISTIO: "No asistió",
};

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; professionalId?: string }>;
}) {
  const { date: dateParam, professionalId: professionalFilter } = await searchParams;
  const session = await requireAdminSession();
  const canManage = ["SOCIO", "ADMIN", "ENCARGADO"].includes(session.user.role);

  const day = dateParam ? new Date(`${dateParam}T00:00:00`) : new Date();
  const dateKey = toDateKey(day);

  const allDayAgenda = await getDayAgenda(day);
  // Con varias esteticistas la grilla completa no entra en una pantalla
  // chica sin scrollear horizontalmente; este filtro deja ver a una sola
  // (o a todas) sin perder la vista general como opción.
  const professionalOptions = allDayAgenda.map((d) => d.professional);

  let dayAgenda = allDayAgenda;
  if (!canManage) {
    dayAgenda = dayAgenda.filter((d) => d.professional.id === session.user.id);
  } else if (professionalFilter) {
    dayAgenda = dayAgenda.filter((d) => d.professional.id === professionalFilter);
  }

  const scheduleMinutes = dayAgenda.flatMap((d) => d.schedule.map((s) => [s.startMinute, s.endMinute]));
  const gridStart = scheduleMinutes.length
    ? Math.min(...scheduleMinutes.map(([s]) => s))
    : DEFAULT_START_MINUTE;
  const gridEnd = scheduleMinutes.length
    ? Math.max(...scheduleMinutes.map(([, e]) => e))
    : DEFAULT_END_MINUTE;

  const rows: number[] = [];
  for (let m = gridStart; m < gridEnd; m += STEP_MINUTES) rows.push(m);

  // minuto hasta el cual cada profesional ya está cubierto por un rowSpan anterior
  const skipUntil = new Map<string, number>();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl">Agenda</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/admin/agenda?date=${toDateKey(addDays(day, -1))}`}>
            <Button variant="outline" size="sm">
              ← Día anterior
            </Button>
          </Link>
          <span className="text-sm font-medium">
            {day.toLocaleDateString("es-PE", { weekday: "long", day: "2-digit", month: "long" })}
          </span>
          <Link href={`/admin/agenda?date=${toDateKey(addDays(day, 1))}`}>
            <Button variant="outline" size="sm">
              Día siguiente →
            </Button>
          </Link>
          {canManage && (
            <>
              <Link href="/admin/agenda/horarios">
                <Button variant="outline" size="sm">
                  Horarios
                </Button>
              </Link>
              <Link href={`/admin/agenda/nuevo?date=${dateKey}`}>
                <Button size="sm">Nuevo turno</Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {canManage && professionalOptions.length > 1 && (
        <form method="get" className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <input type="hidden" name="date" value={dateKey} />
          <label className="text-brand-muted">Ver:</label>
          <select
            name="professionalId"
            defaultValue={professionalFilter ?? ""}
            className="rounded-brand border border-brand-border px-2 py-1.5 text-sm"
          >
            <option value="">Todas/os</option>
            {professionalOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {professionalLabel(p)}
              </option>
            ))}
          </select>
          <Button type="submit" variant="outline" size="sm">
            Filtrar
          </Button>
        </form>
      )}

      {dayAgenda.length === 0 && (
        <p className="mt-6 text-sm text-brand-muted">
          No hay profesionales con agenda habilitada todavía. Cargá horarios desde la sección
          Horarios.
        </p>
      )}

      {dayAgenda.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-brand border border-brand-border bg-brand-surface">
          <table className="w-full table-fixed border-collapse text-left text-sm">
            <colgroup>
              <col className="w-20" />
              {dayAgenda.map((d) => (
                // `max(...)`: todas las columnas de profesional miden lo mismo
                // (antes la primera quedaba más ancha por el contenido de su
                // primera celda), con un piso de 140px para que no se aplasten
                // si hay muchas.
                <col key={d.professional.id} style={{ width: `max(140px, ${100 / dayAgenda.length}%)` }} />
              ))}
            </colgroup>
            <thead className="border-b border-brand-border text-brand-muted">
              <tr>
                <th className="w-20 px-3 py-2">Hora</th>
                {dayAgenda.map((d) => (
                  <th key={d.professional.id} className="px-3 py-2">
                    {professionalLabel(d.professional)}
                    {d.onTimeOff && (
                      <span
                        className="ml-2 rounded bg-brand-bg px-1.5 py-0.5 text-xs text-brand-muted"
                        title={d.onTimeOff.reason ?? undefined}
                      >
                        {d.onTimeOff.adminUserId === null ? "Feriado" : "Ausente"}
                        {d.onTimeOff.startMinute !== null &&
                          d.onTimeOff.endMinute !== null &&
                          ` ${minutesToTime(d.onTimeOff.startMinute)}-${minutesToTime(d.onTimeOff.endMinute)}`}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((rowMinute) => (
                <tr key={rowMinute} className="border-b border-brand-border last:border-0">
                  <td className="px-3 py-2 align-top text-brand-muted">
                    {minutesToLabel(rowMinute)}
                  </td>
                  {dayAgenda.map((d) => {
                    const skip = skipUntil.get(d.professional.id) ?? 0;
                    if (rowMinute < skip) return null;

                    // Un turno cancelado/no-asistió no ocupa el horario (no
                    // arma rowSpan ni bloquea "Reservar"), pero se muestra en
                    // su celda de origen para que quede visible qué pasó ahí.
                    const isBlocking = (a: (typeof d.appointments)[number]) =>
                      a.status !== "CANCELADO" && a.status !== "NO_ASISTIO";
                    const startsAt = (a: (typeof d.appointments)[number]) =>
                      a.startAt.getHours() * 60 + a.startAt.getMinutes() === rowMinute;

                    const appointment = d.appointments.find((a) => startsAt(a) && isBlocking(a));
                    const inactiveHere = d.appointments.filter((a) => startsAt(a) && !isBlocking(a));

                    if (appointment) {
                      const durationMinutes =
                        (appointment.endAt.getTime() - appointment.startAt.getTime()) / 60_000;
                      const rowSpan = Math.max(1, Math.ceil(durationMinutes / STEP_MINUTES));
                      skipUntil.set(d.professional.id, rowMinute + rowSpan * STEP_MINUTES);

                      return (
                        <td
                          key={d.professional.id}
                          rowSpan={rowSpan}
                          className="border-l border-brand-border px-3 py-2 align-top"
                        >
                          <div className="rounded-brand border border-brand-border bg-brand-bg p-2">
                            <p className="font-medium">
                              {appointment.client.firstName} {appointment.client.lastName}
                            </p>
                            <p className="text-xs text-brand-muted">
                              {appointment.services.map((l) => l.service.name).join(", ")}
                            </p>
                            <p className="mt-1 text-xs">
                              <span className="rounded bg-brand-surface px-1.5 py-0.5">
                                {STATUS_LABEL[appointment.status]}
                              </span>
                              {appointment.source === "WHATSAPP" && (
                                <span className="ml-1 rounded bg-brand-surface px-1.5 py-0.5">
                                  WhatsApp
                                </span>
                              )}
                            </p>
                            {canManage ? (
                              <Link
                                href={`/admin/agenda/${appointment.id}`}
                                className="mt-2 inline-block text-xs underline hover:text-brand-ink"
                              >
                                Gestionar →
                              </Link>
                            ) : (
                              // La Esteticista no gestiona el turno (reprogramar/cancelar/borrar),
                              // pero sí puede registrar su propia sesión atendida (sección 3).
                              (appointment.status === "RESERVADO" || appointment.status === "CONFIRMADO") && (
                                <Link
                                  href={`/admin/sesiones/nuevo?appointmentId=${appointment.id}`}
                                  className="mt-2 inline-block text-xs underline hover:text-brand-ink"
                                >
                                  Registrar sesión →
                                </Link>
                              )
                            )}
                          </div>
                        </td>
                      );
                    }

                    const withinSchedule = d.schedule.some(
                      (s) => rowMinute >= s.startMinute && rowMinute < s.endMinute
                    );
                    const blockedHere = findTimeOff(d.timeOffs, d.professional.id, day, {
                      startMinute: rowMinute,
                      endMinute: rowMinute + STEP_MINUTES,
                    });
                    const available = withinSchedule && !blockedHere;

                    return (
                      <td
                        key={d.professional.id}
                        className="border-l border-brand-border px-3 py-2 align-top text-brand-muted"
                      >
                        {inactiveHere.map((a) => (
                          <p key={a.id} className="mb-1 text-xs">
                            <span className="rounded bg-brand-bg px-1.5 py-0.5">
                              {STATUS_LABEL[a.status]}
                            </span>{" "}
                            {a.client.firstName} {a.client.lastName}
                            {canManage && (
                              <>
                                {" "}
                                <Link href={`/admin/agenda/${a.id}`} className="underline">
                                  Ver
                                </Link>
                              </>
                            )}
                          </p>
                        ))}
                        {available && canManage ? (
                          <Link
                            href={`/admin/agenda/nuevo?date=${dateKey}&professionalId=${d.professional.id}&startTime=${minutesToLabel(rowMinute)}`}
                            className="text-xs underline hover:text-brand-ink"
                          >
                            Reservar
                          </Link>
                        ) : available ? (
                          <span className="text-xs">Libre</span>
                        ) : (
                          <span className="text-xs">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
