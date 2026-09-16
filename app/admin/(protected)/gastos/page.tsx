import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { requirePagePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { parseDateKey, peruDayRange } from "@/lib/scheduling";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import { deleteExpense } from "./actions";
import type { ExpenseCategory } from "@prisma/client";

export const dynamic = "force-dynamic";

const CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  ALQUILER: "Alquiler",
  INTERNET: "Internet",
  LUZ: "Luz",
  AGUA: "Agua",
  INVENTARIO: "Inventario",
  SUELDOS: "Sueldos",
  ADELANTO_GANANCIAS: "Adelanto de ganancias",
  OTROS: "Otros",
};

export default async function GastosPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    supplierId?: string;
    desde?: string;
    hasta?: string;
  }>;
}) {
  const session = await requirePagePermission("gastos.ver");
  const canManage = await hasPermission(session.user.role, "gastos.gestionar");
  const canDelete = await hasPermission(session.user.role, "gastos.eliminar");
  const canViewProveedores = await hasPermission(session.user.role, "proveedores.ver");
  const { category, supplierId, desde, hasta } = await searchParams;

  const where: Record<string, unknown> = {};
  if (category) where.category = category;
  if (supplierId) where.supplierId = supplierId;
  if (desde || hasta) {
    const date: { gte?: Date; lte?: Date } = {};
    if (desde) date.gte = peruDayRange(parseDateKey(desde)).start;
    if (hasta) date.lte = peruDayRange(parseDateKey(hasta)).end;
    where.date = date;
  }

  const [expenses, suppliers] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: { supplier: true, employee: true },
      orderBy: { date: "desc" },
      take: 200,
    }),
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
  ]);

  const byCategory = new Map<string, number>();
  const bySupplier = new Map<string, number>();
  let total = 0;
  for (const e of expenses) {
    const amount = Number(e.amount);
    total += amount;
    byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + amount);
    if (e.supplier) bySupplier.set(e.supplier.name, (bySupplier.get(e.supplier.name) ?? 0) + amount);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Gastos y egresos</h1>
        <div className="flex gap-2">
          {canViewProveedores && (
            <Link href="/admin/proveedores">
              <Button variant="outline">Proveedores</Button>
            </Link>
          )}
          {canManage && (
            <Link href="/admin/gastos/nuevo">
              <Button>Nuevo gasto</Button>
            </Link>
          )}
        </div>
      </div>

      <form method="get" className="mt-4 flex flex-wrap items-end gap-3 text-sm">
        <div>
          <label className="block font-medium">Categoría</label>
          <select
            name="category"
            defaultValue={category ?? ""}
            className="mt-1 rounded-brand border border-brand-border px-3 py-2"
          >
            <option value="">Todas</option>
            {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block font-medium">Proveedor</label>
          <select
            name="supplierId"
            defaultValue={supplierId ?? ""}
            className="mt-1 rounded-brand border border-brand-border px-3 py-2"
          >
            <option value="">Todos</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
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
        {(category || supplierId || desde || hasta) && (
          <Link href="/admin/gastos" className="text-brand-muted underline">
            Limpiar filtros
          </Link>
        )}
      </form>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-brand border border-brand-border bg-brand-surface p-4 text-sm">
          <p className="font-medium">Por categoría</p>
          <dl className="mt-2 space-y-1">
            {[...byCategory.entries()].map(([cat, amount]) => (
              <div key={cat} className="flex justify-between">
                <dt className="text-brand-muted">{CATEGORY_LABEL[cat as ExpenseCategory]}</dt>
                <dd>{formatPrice(amount)}</dd>
              </div>
            ))}
            {byCategory.size === 0 && <p className="text-brand-muted">Sin datos.</p>}
          </dl>
        </div>
        <div className="rounded-brand border border-brand-border bg-brand-surface p-4 text-sm">
          <p className="font-medium">Por proveedor</p>
          <dl className="mt-2 space-y-1">
            {[...bySupplier.entries()].map(([name, amount]) => (
              <div key={name} className="flex justify-between">
                <dt className="text-brand-muted">{name}</dt>
                <dd>{formatPrice(amount)}</dd>
              </div>
            ))}
            {bySupplier.size === 0 && <p className="text-brand-muted">Sin datos.</p>}
          </dl>
        </div>
      </div>

      <p className="mt-4 text-sm font-medium">Total del período: {formatPrice(total)}</p>

      <div className="mt-4 overflow-x-auto rounded-brand border border-brand-border bg-brand-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-brand-border text-brand-muted">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Concepto</th>
              <th className="px-4 py-3">Categoría</th>
              <th className="px-4 py-3">Proveedor</th>
              <th className="px-4 py-3">Monto</th>
              {canDelete && <th className="px-4 py-3">Acción</th>}
            </tr>
          </thead>
          <tbody>
            {expenses.map((expense) => (
              <tr key={expense.id} className="border-b border-brand-border last:border-0">
                <td className="px-4 py-3">{expense.date.toLocaleDateString("es-PE")}</td>
                <td className="px-4 py-3">{expense.concept}</td>
                <td className="px-4 py-3">{CATEGORY_LABEL[expense.category]}</td>
                <td className="px-4 py-3">{expense.supplier?.name ?? "—"}</td>
                <td className="px-4 py-3">{formatPrice(expense.amount.toString())}</td>
                {canDelete && (
                  <td className="px-4 py-3">
                    <form action={deleteExpense.bind(null, expense.id)}>
                      <ConfirmSubmitButton
                        type="submit"
                        variant="danger"
                        size="sm"
                        confirmMessage={`¿Eliminar el gasto "${expense.concept}"? Esta acción no se puede deshacer.`}
                      >
                        Eliminar
                      </ConfirmSubmitButton>
                    </form>
                  </td>
                )}
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr>
                <td colSpan={canDelete ? 6 : 5} className="px-4 py-8 text-center text-brand-muted">
                  No hay gastos registrados para este filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
