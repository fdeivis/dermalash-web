import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { professionalLabel, formatDateTime12, peruToday, peruDayRange } from "@/lib/scheduling";
import { computeCashBalance } from "@/lib/cash";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import { openCashSession, closeCashSession } from "./caja/actions";
import { formatPrice } from "@/lib/utils";

// Los contadores deben reflejar siempre el estado actual: las acciones de
// crear/editar/publicar/eliminar solo revalidan su propio listado
// (/admin/servicios, /admin/promociones, /admin/novedades), no el dashboard.
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  RESERVADO: "Reservado",
  CONFIRMADO: "Confirmado",
};

export default async function AdminDashboardPage() {
  const session = await requireAdminSession();
  const role = session.user.role;
  const [
    canManageAgenda,
    canViewServicios,
    canViewPromociones,
    canViewNovedades,
    canViewClientes,
    canViewEmpleados,
    canViewSesiones,
    canViewGastos,
    canViewCaja,
    canManageCaja,
  ] = await Promise.all([
    hasPermission(role, "agenda.gestionar"),
    hasPermission(role, "servicios.ver"),
    hasPermission(role, "promociones.ver"),
    hasPermission(role, "novedades.ver"),
    hasPermission(role, "clientes.ver"),
    hasPermission(role, "empleados.ver"),
    hasPermission(role, "sesiones.ver"),
    hasPermission(role, "gastos.ver"),
    hasPermission(role, "caja.ver"),
    hasPermission(role, "caja.gestionar"),
  ]);

  const [services, promotions, posts, clients, employees, sessions, upcomingAppointments] =
    await Promise.all([
      canViewServicios ? prisma.service.count() : null,
      canViewPromociones ? prisma.promotion.count() : null,
      canViewNovedades ? prisma.post.count() : null,
      canViewClientes ? prisma.client.count() : null,
      canViewEmpleados ? prisma.employee.count() : null,
      canViewSesiones ? prisma.clientSession.count() : null,
      prisma.appointment.findMany({
        where: {
          status: { in: ["RESERVADO", "CONFIRMADO"] },
          startAt: { gte: new Date() },
          // Esteticista solo ve sus propios próximos turnos, igual que en /admin/agenda.
          ...(canManageAgenda ? {} : { professionalId: session.user.id }),
        },
        include: { client: true, professional: true },
        orderBy: { startAt: "asc" },
        take: 5,
      }),
    ]);

  const todayRange = peruDayRange(peruToday());
  const [todayIncome, todayExpense, efectivoSession] = await Promise.all([
    canViewGastos
      ? prisma.income.aggregate({
          where: { occurredAt: { gte: todayRange.start, lte: todayRange.end } },
          _sum: { amount: true },
        })
      : null,
    canViewGastos
      ? prisma.expense.aggregate({
          where: { date: { gte: todayRange.start, lte: todayRange.end } },
          _sum: { amount: true },
        })
      : null,
    canViewCaja ? prisma.cashSession.findFirst({ where: { paymentMethod: "EFECTIVO", closedAt: null } }) : null,
  ]);
  const efectivoExpected = efectivoSession
    ? await computeCashBalance("EFECTIVO", Number(efectivoSession.openingAmount), efectivoSession.openedAt, new Date())
    : null;

  const cards = [
    canViewServicios && { label: "Servicios", count: services, href: "/admin/servicios" },
    canViewPromociones && { label: "Promociones", count: promotions, href: "/admin/promociones" },
    canViewNovedades && { label: "Novedades", count: posts, href: "/admin/novedades" },
    canViewClientes && { label: "Clientes", count: clients, href: "/admin/clientes" },
    canViewEmpleados && { label: "Empleados", count: employees, href: "/admin/empleados" },
    canViewSesiones && { label: "Facturas", count: sessions, href: "/admin/sesiones" },
  ].filter(Boolean) as { label: string; count: number | null; href: string }[];

  return (
    <div>
      <h1 className="font-display text-2xl">Dashboard</h1>
      <p className="mt-1 text-sm text-brand-muted">
        Administrá el contenido público de Dermalash.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-brand border border-brand-border bg-brand-surface p-6 hover:shadow-md"
          >
            <p className="text-3xl font-display">{card.count}</p>
            <p className="mt-1 text-sm text-brand-muted">{card.label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 rounded-brand border border-brand-border bg-brand-surface p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg">Próximos turnos</h2>
          <Link href="/admin/agenda" className="text-sm text-brand-muted underline hover:text-brand-ink">
            Ver agenda →
          </Link>
        </div>
        <ul className="mt-4 space-y-3 text-sm">
          {upcomingAppointments.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 border-b border-brand-border pb-3 last:border-0 last:pb-0">
              <div>
                <p className="font-medium">
                  {a.client.firstName} {a.client.lastName}
                </p>
                <p className="text-xs text-brand-muted">
                  {formatDateTime12(a.startAt)} ·{" "}
                  {professionalLabel(a.professional)} ·{" "}
                  <span className="rounded bg-brand-bg px-1.5 py-0.5">{STATUS_LABEL[a.status]}</span>
                </p>
              </div>
              {canManageAgenda && (
                <Link href={`/admin/agenda/${a.id}`} className="shrink-0 text-xs underline hover:text-brand-ink">
                  Ver →
                </Link>
              )}
            </li>
          ))}
          {upcomingAppointments.length === 0 && (
            <li className="text-brand-muted">No hay turnos próximos.</li>
          )}
        </ul>
      </div>

      {(canViewGastos || canViewCaja) && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {canViewGastos && (
            <div className="rounded-brand border border-brand-border bg-brand-surface p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg">Finanzas de hoy</h2>
                <Link href="/admin/gastos" className="text-sm text-brand-muted underline hover:text-brand-ink">
                  Ver gastos →
                </Link>
              </div>
              <div className="mt-4 flex gap-6 text-sm">
                <div>
                  <p className="text-brand-muted">Ingresos</p>
                  <p className="text-xl font-display">{formatPrice(todayIncome?._sum.amount?.toString() ?? "0")}</p>
                </div>
                <div>
                  <p className="text-brand-muted">Egresos</p>
                  <p className="text-xl font-display">{formatPrice(todayExpense?._sum.amount?.toString() ?? "0")}</p>
                </div>
              </div>
            </div>
          )}

          {canViewCaja && (
            <div className="rounded-brand border border-brand-border bg-brand-surface p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg">Caja (Efectivo)</h2>
                <Link href="/admin/caja" className="text-sm text-brand-muted underline hover:text-brand-ink">
                  Ver caja →
                </Link>
              </div>
              {efectivoSession ? (
                <div className="mt-3 space-y-2 text-sm">
                  <p className="text-brand-muted">
                    Abierta — saldo esperado: {formatPrice(efectivoExpected ?? 0)}
                  </p>
                  {canManageCaja && (
                    <form action={closeCashSession.bind(null, efectivoSession.id)} className="flex items-end gap-2">
                      <div className="flex-1">
                        <label className="block text-xs font-medium">Saldo real</label>
                        <input
                          type="number"
                          name="actualAmount"
                          step="0.01"
                          min={0}
                          required
                          className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
                        />
                      </div>
                      <ConfirmSubmitButton
                        type="submit"
                        size="sm"
                        confirmMessage="¿Cerrar la caja de Efectivo?"
                      >
                        Cerrar
                      </ConfirmSubmitButton>
                    </form>
                  )}
                </div>
              ) : canManageCaja ? (
                <form action={openCashSession} className="mt-3 flex items-end gap-2">
                  <input type="hidden" name="paymentMethod" value="EFECTIVO" />
                  <div className="flex-1">
                    <label className="block text-xs font-medium">Saldo inicial</label>
                    <input
                      type="number"
                      name="openingAmount"
                      step="0.01"
                      min={0}
                      required
                      className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
                    />
                  </div>
                  <Button type="submit" size="sm">
                    Abrir
                  </Button>
                </form>
              ) : (
                <p className="mt-3 text-sm text-brand-muted">Cerrada.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
