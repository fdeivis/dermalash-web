import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { requirePagePermission } from "@/lib/auth";
import { parseMonthKey, peruMonthRange } from "@/lib/scheduling";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default async function ServiciosMasVendidosPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  await requirePagePermission("servicios.ver");
  const { mes } = await searchParams;
  const monthKey = mes ?? currentMonthKey();
  const { year, month } = parseMonthKey(monthKey);
  const { start, end } = peruMonthRange(year, month);

  const grouped = await prisma.clientSessionService.groupBy({
    by: ["serviceId"],
    where: { session: { sessionDate: { gte: start, lte: end } } },
    _sum: { priceApplied: true },
    _count: { _all: true },
  });

  const services = await prisma.service.findMany({
    where: { id: { in: grouped.map((g) => g.serviceId) } },
  });
  const serviceById = new Map(services.map((s) => [s.id, s]));

  const rows = grouped
    .map((g) => ({
      serviceId: g.serviceId,
      name: serviceById.get(g.serviceId)?.name ?? "Servicio eliminado",
      cantidad: g._count._all,
      ingresos: Number(g._sum.priceApplied ?? 0),
    }))
    .sort((a, b) => b.cantidad - a.cantidad);

  const totalCantidad = rows.reduce((sum, r) => sum + r.cantidad, 0);
  const totalIngresos = rows.reduce((sum, r) => sum + r.ingresos, 0);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Servicios más vendidos</h1>
        <Link href="/admin/servicios" className="text-sm text-brand-muted underline">
          ← Volver a Servicios
        </Link>
      </div>
      <p className="mt-2 text-sm text-brand-muted">
        Cantidad de veces que se vendió cada servicio dentro del mes elegido (según la fecha de
        atención de la factura), ordenado de más a menos vendido.
      </p>

      <form method="get" className="mt-4 flex flex-wrap items-end gap-3 text-sm">
        <div>
          <label className="block font-medium">Mes</label>
          <input
            type="month"
            name="mes"
            defaultValue={monthKey}
            className="mt-1 rounded-brand border border-brand-border px-3 py-2"
          />
        </div>
        <button
          type="submit"
          className="rounded-brand border border-brand-border bg-brand-bg px-4 py-2 font-medium hover:bg-brand-surface"
        >
          Filtrar
        </button>
        <a href={`/admin/servicios/mas-vendidos/export?mes=${monthKey}`} className="ml-auto">
          <Button type="button" variant="outline" size="sm">
            Descargar Excel
          </Button>
        </a>
      </form>

      <div className="mt-6 overflow-x-auto rounded-brand border border-brand-border bg-brand-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-brand-border text-brand-muted">
            <tr>
              <th className="px-4 py-3">Servicio</th>
              <th className="px-4 py-3">Cantidad vendida</th>
              <th className="px-4 py-3">Ingresos generados</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.serviceId} className="border-b border-brand-border last:border-0">
                <td className="px-4 py-3">{r.name}</td>
                <td className="px-4 py-3">{r.cantidad}</td>
                <td className="px-4 py-3">{formatPrice(r.ingresos)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-brand-muted">
                  No hay facturas registradas en este mes.
                </td>
              </tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t border-brand-border font-medium">
                <td className="px-4 py-3">Total</td>
                <td className="px-4 py-3">{totalCantidad}</td>
                <td className="px-4 py-3">{formatPrice(totalIngresos)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
