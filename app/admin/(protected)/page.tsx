import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { professionalLabel, formatDateTime12, peruToday, peruDayRange } from "@/lib/scheduling";
import { computeCashBalance } from "@/lib/cash";
import { getTurnosPorPeriodo, getVentasPorPeriodo, getIngresosEgresosPorPeriodo, type Period } from "@/lib/dashboardStats";
import { Button } from "@/components/ui/button";
import { openCashSession } from "./caja/actions";
import { formatPrice } from "@/lib/utils";
import { ChartCard } from "@/components/admin/charts/ChartCard";

// Los contadores deben reflejar siempre el estado actual: las acciones de
// crear/editar/publicar/eliminar solo revalidan su propio listado
// (/admin/servicios, /admin/promociones, /admin/novedades), no el dashboard.
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  RESERVADO: "Reservado",
  CONFIRMADO: "Confirmado",
};

const METHOD_LABEL: Record<string, string> = {
  EFECTIVO: "Efectivo",
  YAPE: "Yape",
  PLIN: "Plin",
  TARJETA: "Tarjeta",
  TRANSFERENCIA: "Transferencia",
};

export default async function AdminDashboardPage() {
  const session = await requireAdminSession();
  const role = session.user.role;
  // Los graficos son solo para Socio -- regla dura de rol, mismo patron que
  // /admin/balance, no un permiso configurable.
  const canViewCharts = role === "SOCIO" || role === "ADMIN";
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
  const [todayIncome, todayExpense, openSession] = await Promise.all([
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
    canViewCaja
      ? prisma.cashSession.findFirst({ where: { closedAt: null }, include: { accounts: true } })
      : null,
  ]);
  const openAccountsWithExpected = openSession
    ? await Promise.all(
        openSession.accounts.map(async (account) => ({
          ...account,
          expected: await computeCashBalance(
            account.paymentMethod,
            Number(account.openingAmount),
            openSession.id,
            openSession.openedAt,
            new Date()
          ),
        }))
      )
    : [];

  const TURNOS_PERIODS: Period[] = ["dia", "semana", "mes", "6meses", "anio"];
  const MONEY_PERIODS: Period[] = ["dia", "semana", "mes", "anio"];
  const [turnosByPeriod, ventasByPeriod, ingresosEgresosByPeriod] = canViewCharts
    ? await Promise.all([
        Promise.all(TURNOS_PERIODS.map((p) => getTurnosPorPeriodo(p))).then((results) =>
          Object.fromEntries(TURNOS_PERIODS.map((p, i) => [p, results[i]]))
        ),
        Promise.all(MONEY_PERIODS.map((p) => getVentasPorPeriodo(p))).then((results) =>
          Object.fromEntries(MONEY_PERIODS.map((p, i) => [p, results[i]]))
        ),
        Promise.all(MONEY_PERIODS.map((p) => getIngresosEgresosPorPeriodo(p))).then((results) =>
          Object.fromEntries(MONEY_PERIODS.map((p, i) => [p, results[i]]))
        ),
      ])
    : [{}, {}, {}];

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
                <h2 className="font-display text-lg">Caja</h2>
                <Link href="/admin/caja" className="text-sm text-brand-muted underline hover:text-brand-ink">
                  Ver caja →
                </Link>
              </div>
              {openSession ? (
                <div className="mt-3 space-y-3 text-sm">
                  <p className="text-brand-muted">Abierta desde {formatDateTime12(openSession.openedAt)}</p>
                  <div className="space-y-2">
                    {openAccountsWithExpected.map((account) => (
                      <div key={account.id} className="rounded-brand border border-brand-border p-2">
                        <p className="font-medium">{METHOD_LABEL[account.paymentMethod] ?? account.paymentMethod}</p>
                        <p className="text-xs text-brand-muted">
                          Apertura {formatPrice(account.openingAmount.toString())} · Movimiento{" "}
                          {formatPrice(account.expected - Number(account.openingAmount))} · Esperado{" "}
                          {formatPrice(account.expected)}
                        </p>
                      </div>
                    ))}
                  </div>
                  {canManageCaja && (
                    <Link href="/admin/caja">
                      <Button size="sm" variant="outline">
                        Ir a cerrar caja
                      </Button>
                    </Link>
                  )}
                </div>
              ) : canManageCaja ? (
                <form action={openCashSession} className="mt-3 flex items-end gap-2">
                  <div className="flex-1">
                    <label className="block text-xs font-medium">Efectivo inicial</label>
                    <input
                      type="number"
                      name="EFECTIVO"
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

      {canViewCharts && (
        <div className="mt-8 space-y-6">
          <ChartCard
            title="Turnos"
            periods={[
              { key: "dia", label: "Día" },
              { key: "semana", label: "Semana" },
              { key: "mes", label: "Mes" },
              { key: "6meses", label: "6 meses" },
              { key: "anio", label: "Año" },
            ]}
            defaultPeriod="semana"
            dataByPeriod={Object.fromEntries(
              Object.entries(turnosByPeriod).map(([period, buckets]) => [
                period,
                (buckets as { label: string; reservado: number; confirmadoAtendido: number; cancelado: number }[]).map(
                  (b) => ({
                    label: b.label,
                    values: { reservado: b.reservado, confirmadoAtendido: b.confirmadoAtendido, cancelado: b.cancelado },
                  })
                ),
              ])
            )}
            series={[
              { key: "reservado", label: "Reservado", color: "#2a78d6" },
              { key: "confirmadoAtendido", label: "Confirmado / Atendido", color: "#eb6834" },
              { key: "cancelado", label: "Cancelado", color: "#1baf7a" },
            ]}
            mode="stacked"
          />

          <ChartCard
            title="Ventas"
            periods={[
              { key: "dia", label: "Día" },
              { key: "semana", label: "Semana" },
              { key: "mes", label: "Mes" },
              { key: "anio", label: "Año" },
            ]}
            defaultPeriod="semana"
            dataByPeriod={Object.fromEntries(
              Object.entries(ventasByPeriod).map(([period, buckets]) => [
                period,
                (buckets as { label: string; total: number }[]).map((b) => ({
                  label: b.label,
                  values: { total: b.total },
                })),
              ])
            )}
            series={[{ key: "total", label: "Ventas", color: "#2a78d6" }]}
            mode="grouped"
            valuePrefix="S/ "
          />

          <ChartCard
            title="Ingresos vs. egresos"
            periods={[
              { key: "dia", label: "Día" },
              { key: "semana", label: "Semana" },
              { key: "mes", label: "Mes" },
              { key: "anio", label: "Año" },
            ]}
            defaultPeriod="semana"
            dataByPeriod={Object.fromEntries(
              Object.entries(ingresosEgresosByPeriod).map(([period, buckets]) => [
                period,
                (buckets as { label: string; ingresos: number; egresos: number }[]).map((b) => ({
                  label: b.label,
                  values: { ingresos: b.ingresos, egresos: b.egresos },
                })),
              ])
            )}
            series={[
              { key: "ingresos", label: "Ingresos", color: "#2a78d6" },
              { key: "egresos", label: "Egresos", color: "#eb6834" },
            ]}
            mode="grouped"
            valuePrefix="S/ "
          />
        </div>
      )}
    </div>
  );
}
