import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAgendaManager } from "@/lib/auth";
import { getSchedulableProfessionals, minutesToTime, professionalLabel } from "@/lib/scheduling";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import { createSchedule, deleteSchedule, createTimeOff, deleteTimeOff } from "./actions";
import { MonthJumpForm } from "@/components/admin/MonthJumpForm";

export const dynamic = "force-dynamic";

const DAYS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

function hoursLabel(startMinute: number | null, endMinute: number | null) {
  if (startMinute === null || endMinute === null) return "todo el día";
  return `${minutesToTime(startMinute)} - ${minutesToTime(endMinute)}`;
}

// Feriados/ausencias se navegan mes a mes en vez de listar todo junto: así no
// se amontonan a medida que se cargan más, y de paso permite revisar meses
// pasados o planificar meses futuros.
function toMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function parseMonthKey(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return { year, month };
}

function monthRange(monthKey: string) {
  const { year, month } = parseMonthKey(monthKey);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

function addMonths(monthKey: string, delta: number) {
  const { year, month } = parseMonthKey(monthKey);
  return toMonthKey(new Date(year, month - 1 + delta, 1));
}

function monthLabel(monthKey: string) {
  const { start } = monthRange(monthKey);
  const label = start.toLocaleDateString("es-PE", { year: "numeric", month: "long" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default async function HorariosPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  await requireAgendaManager();
  const { month: monthParam } = await searchParams;
  const monthKey = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : toMonthKey(new Date());
  const { start: monthStart, end: monthEnd } = monthRange(monthKey);

  const [professionals, timeOffs] = await Promise.all([
    getSchedulableProfessionals(),
    // Se trae lo que se superpone con el mes elegido (no "lo próximo"): así
    // la navegación por mes también sirve para revisar meses ya pasados.
    prisma.timeOff.findMany({
      where: { startDate: { lte: monthEnd }, endDate: { gte: monthStart } },
      include: { adminUser: true },
      orderBy: { startDate: "asc" },
    }),
  ]);

  const schedules = await prisma.schedule.findMany({
    where: { adminUserId: { in: professionals.map((p) => p.id) } },
    orderBy: [{ dayOfWeek: "asc" }, { startMinute: "asc" }],
  });

  return (
    <div className="max-w-3xl space-y-10">
      <div>
        <h1 className="font-display text-2xl">Horarios de trabajo</h1>
        <p className="mt-1 text-sm text-brand-muted">
          Definen qué bloques horarios ofrece cada profesional en la Agenda.
        </p>
      </div>

      {professionals.map((professional) => {
        const rows = schedules.filter((s) => s.adminUserId === professional.id);
        return (
          <section key={professional.id} className="rounded-brand border border-brand-border p-4">
            <h2 className="font-display text-lg">{professionalLabel(professional)}</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {rows.map((s) => (
                <li key={s.id} className="flex items-center justify-between">
                  <span>
                    {DAYS[s.dayOfWeek]}: {minutesToTime(s.startMinute)} - {minutesToTime(s.endMinute)}
                  </span>
                  <form action={deleteSchedule.bind(null, s.id)}>
                    <ConfirmSubmitButton
                      type="submit"
                      variant="outline"
                      size="sm"
                      confirmMessage="¿Quitar este bloque de horario?"
                    >
                      Quitar
                    </ConfirmSubmitButton>
                  </form>
                </li>
              ))}
              {rows.length === 0 && (
                <li className="text-brand-muted">Sin horario cargado todavía.</li>
              )}
            </ul>

            <form
              action={createSchedule}
              className="mt-4 flex flex-wrap items-end gap-3 border-t border-brand-border pt-4"
            >
              <input type="hidden" name="adminUserId" value={professional.id} />
              <div>
                <label className="block text-xs font-medium">Día</label>
                <select
                  name="dayOfWeek"
                  required
                  className="mt-1 rounded-brand border border-brand-border px-2 py-1.5 text-sm"
                >
                  {DAYS.map((label, index) => (
                    <option key={label} value={index}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium">Desde</label>
                <input
                  type="time"
                  name="startTime"
                  required
                  step={1800}
                  className="mt-1 rounded-brand border border-brand-border px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium">Hasta</label>
                <input
                  type="time"
                  name="endTime"
                  required
                  step={1800}
                  className="mt-1 rounded-brand border border-brand-border px-2 py-1.5 text-sm"
                />
              </div>
              <Button type="submit" size="sm" variant="outline">
                Agregar
              </Button>
            </form>
          </section>
        );
      })}

      <div className="flex flex-wrap items-center gap-3">
        {/* scroll={false}: sin esto, cada click volvía a arrancar la página
            desde arriba en vez de quedarse donde estaba el usuario. */}
        <Link href={`/admin/agenda/horarios?month=${addMonths(monthKey, -1)}`} scroll={false}>
          <Button variant="outline" size="sm">
            ← Mes anterior
          </Button>
        </Link>
        <span className="text-sm font-medium">{monthLabel(monthKey)}</span>
        <Link href={`/admin/agenda/horarios?month=${addMonths(monthKey, 1)}`} scroll={false}>
          <Button variant="outline" size="sm">
            Mes siguiente →
          </Button>
        </Link>
        {monthKey !== toMonthKey(new Date()) && (
          <Link href="/admin/agenda/horarios" scroll={false}>
            <Button variant="outline" size="sm">
              Mes actual
            </Button>
          </Link>
        )}
        {/* Para ir directo a un mes/año lejano (ej. diciembre 2027) sin
            navegar de a un mes por vez. */}
        <MonthJumpForm month={monthKey} />
      </div>

      <section>
        <h2 className="font-display text-lg">Feriados (aplican a todos los profesionales)</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {timeOffs
            .filter((t) => t.adminUserId === null)
            .map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between rounded-brand border border-brand-border px-3 py-2"
              >
                <span>
                  {t.startDate.toLocaleDateString("es-PE")} - {t.endDate.toLocaleDateString("es-PE")} (
                  {hoursLabel(t.startMinute, t.endMinute)}){t.reason && ` — ${t.reason}`}
                </span>
                <form action={deleteTimeOff.bind(null, t.id)}>
                  <ConfirmSubmitButton
                    type="submit"
                    variant="outline"
                    size="sm"
                    confirmMessage="¿Quitar este feriado?"
                  >
                    Quitar
                  </ConfirmSubmitButton>
                </form>
              </li>
            ))}
          {timeOffs.filter((t) => t.adminUserId === null).length === 0 && (
            <li className="text-brand-muted">No hay feriados cargados en {monthLabel(monthKey)}.</li>
          )}
        </ul>
      </section>

      <section>
        <h2 className="font-display text-lg">Ausencias por profesional (vacaciones, licencias, días libres)</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {timeOffs
            .filter((t) => t.adminUserId !== null)
            .map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between rounded-brand border border-brand-border px-3 py-2"
              >
                <span>
                  {t.adminUser ? professionalLabel(t.adminUser) : ""}: {t.startDate.toLocaleDateString("es-PE")} -{" "}
                  {t.endDate.toLocaleDateString("es-PE")} ({hoursLabel(t.startMinute, t.endMinute)})
                  {t.reason && ` — ${t.reason}`}
                </span>
                <form action={deleteTimeOff.bind(null, t.id)}>
                  <ConfirmSubmitButton
                    type="submit"
                    variant="outline"
                    size="sm"
                    confirmMessage="¿Quitar esta ausencia?"
                  >
                    Quitar
                  </ConfirmSubmitButton>
                </form>
              </li>
            ))}
          {timeOffs.filter((t) => t.adminUserId !== null).length === 0 && (
            <li className="text-brand-muted">No hay ausencias cargadas en {monthLabel(monthKey)}.</li>
          )}
        </ul>

        <form action={createTimeOff} className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium">Profesional</label>
            <select
              name="adminUserId"
              required
              className="mt-1 rounded-brand border border-brand-border px-2 py-1.5 text-sm"
            >
              <option value="ALL">Todos (feriado)</option>
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>
                  {professionalLabel(p)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium">Desde</label>
            <input
              type="date"
              name="startDate"
              required
              className="mt-1 rounded-brand border border-brand-border px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium">Hasta</label>
            <input
              type="date"
              name="endDate"
              required
              className="mt-1 rounded-brand border border-brand-border px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium">Desde hora (opcional)</label>
            {/* Sin `step`: a diferencia del horario semanal, un permiso puede
                empezar/terminar en cualquier minuto (ej. 09:15), y un `step`
                aquí bloquea el envío del formulario sin avisar si no calza. */}
            <input
              type="time"
              name="startTime"
              className="mt-1 rounded-brand border border-brand-border px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium">Hasta hora (opcional)</label>
            <input
              type="time"
              name="endTime"
              className="mt-1 rounded-brand border border-brand-border px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium">Motivo</label>
            <input
              type="text"
              name="reason"
              className="mt-1 rounded-brand border border-brand-border px-2 py-1.5 text-sm"
            />
          </div>
          <Button type="submit" size="sm" variant="outline">
            Agregar ausencia
          </Button>
        </form>
        <p className="mt-2 text-xs text-brand-muted">
          Dejá las horas vacías para que la ausencia cubra el día completo. Cargalas para un permiso
          por horas (ej. media mañana).
        </p>
      </section>
    </div>
  );
}
