import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePagePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import {
  getSchedulableProfessionals,
  professionalLabel,
  parseDateKey,
  peruDayRange,
  formatDateTime12,
} from "@/lib/scheduling";
import type { AppointmentStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  RESERVADO: "Reservado",
  CONFIRMADO: "Confirmado",
  ATENDIDO: "Atendido",
  CANCELADO: "Cancelado",
  NO_ASISTIO: "No asistió",
};

const STATUS_OPTIONS = Object.keys(STATUS_LABEL) as AppointmentStatus[];

export default async function ReporteTurnosPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    professionalId?: string;
    desde?: string;
    hasta?: string;
  }>;
}) {
  const session = await requirePagePermission("agenda.ver");
  const canManage = await hasPermission(session.user.role, "agenda.gestionar");
  const { status, professionalId, desde, hasta } = await searchParams;

  // Quien no gestiona la agenda (hoy: Esteticista) solo ve sus propios
  // turnos en este reporte, igual que en la grilla del día (sección 3 del
  // diseño funcional: agenda propia de solo lectura).
  const effectiveProfessionalId = canManage ? professionalId || undefined : session.user.id;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (effectiveProfessionalId) where.professionalId = effectiveProfessionalId;
  if (desde || hasta) {
    const startAt: { gte?: Date; lte?: Date } = {};
    if (desde) startAt.gte = peruDayRange(parseDateKey(desde)).start;
    if (hasta) startAt.lte = peruDayRange(parseDateKey(hasta)).end;
    where.startAt = startAt;
  }

  const [appointments, professionals] = await Promise.all([
    prisma.appointment.findMany({
      where,
      include: { client: true, professional: true, services: { include: { service: true } } },
      orderBy: { startAt: "desc" },
      take: 200,
    }),
    canManage ? getSchedulableProfessionals() : Promise.resolve([]),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Reporte de turnos</h1>
        <Link href="/admin/agenda" className="text-sm text-brand-muted underline">
          ← Volver a la agenda
        </Link>
      </div>

      <form method="get" className="mt-4 flex flex-wrap items-end gap-3 text-sm">
        <div>
          <label className="block font-medium">Estado</label>
          <select
            name="status"
            defaultValue={status ?? ""}
            className="mt-1 rounded-brand border border-brand-border px-3 py-2"
          >
            <option value="">Todos</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        {canManage && (
          <div>
            <label className="block font-medium">Especialista</label>
            <select
              name="professionalId"
              defaultValue={professionalId ?? ""}
              className="mt-1 rounded-brand border border-brand-border px-3 py-2"
            >
              <option value="">Todas/os</option>
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>
                  {professionalLabel(p)}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="block font-medium">Desde</label>
          <input
            type="date"
            name="desde"
            defaultValue={desde ?? ""}
            className="mt-1 rounded-brand border border-brand-border px-3 py-2"
          />
        </div>
        <div>
          <label className="block font-medium">Hasta</label>
          <input
            type="date"
            name="hasta"
            defaultValue={hasta ?? ""}
            className="mt-1 rounded-brand border border-brand-border px-3 py-2"
          />
        </div>
        <button
          type="submit"
          className="rounded-brand border border-brand-border bg-brand-bg px-4 py-2 font-medium hover:bg-brand-surface"
        >
          Filtrar
        </button>
        {(status || professionalId || desde || hasta) && (
          <Link href="/admin/agenda/reporte" className="text-brand-muted underline">
            Limpiar filtros
          </Link>
        )}
      </form>

      <div className="mt-6 overflow-x-auto rounded-brand border border-brand-border bg-brand-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-brand-border text-brand-muted">
            <tr>
              <th className="px-4 py-3">Fecha y hora</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Servicios</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Especialista</th>
              <th className="px-4 py-3">Acción</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((a) => (
              <tr key={a.id} className="border-b border-brand-border last:border-0">
                <td className="px-4 py-3">{formatDateTime12(a.startAt)}</td>
                <td className="px-4 py-3">
                  {a.client.firstName} {a.client.lastName}
                </td>
                <td className="px-4 py-3">{a.services.map((s) => s.service.name).join(", ")}</td>
                <td className="px-4 py-3">{STATUS_LABEL[a.status]}</td>
                <td className="px-4 py-3">{professionalLabel(a.professional)}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/agenda/${a.id}`} className="text-brand-accent underline">
                    Ver
                  </Link>
                </td>
              </tr>
            ))}
            {appointments.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-brand-muted">
                  No hay turnos que coincidan con los filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {appointments.length === 200 && (
        <p className="mt-2 text-xs text-brand-muted">
          Mostrando los 200 turnos más recientes que coinciden — acotá el rango de fechas para ver
          más precisión.
        </p>
      )}
    </div>
  );
}
