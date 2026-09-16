import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { parseDateKey, peruDayRange, peruToday, addDaysUTC } from "@/lib/scheduling";
import type { PaymentMethod } from "@prisma/client";

export const dynamic = "force-dynamic";

const METHODS: PaymentMethod[] = ["EFECTIVO", "YAPE", "PLIN", "TARJETA", "TRANSFERENCIA", "OTRO"];
const METHOD_LABEL: Record<string, string> = {
  EFECTIVO: "Efectivo",
  YAPE: "Yape",
  PLIN: "Plin",
  TARJETA: "Tarjeta",
  TRANSFERENCIA: "Transferencia",
  OTRO: "Otro",
};

export default async function BalancePage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/admin/login");
  // Restringido a Socio, no es un permiso configurable (sección 13 del
  // diseño funcional lo pide explícitamente así) — mismo patrón que
  // /admin/permisos y /admin/logs.
  if (!["SOCIO", "ADMIN"].includes(session.user.role)) redirect("/admin");

  const { desde, hasta } = await searchParams;
  const today = peruToday();
  const from = desde ? peruDayRange(parseDateKey(desde)).start : peruDayRange(addDaysUTC(today, -30)).start;
  const to = hasta ? peruDayRange(parseDateKey(hasta)).end : peruDayRange(today).end;

  const rows = await Promise.all(
    METHODS.map(async (method) => {
      const [incomeSum, expenseSum] = await Promise.all([
        prisma.income.aggregate({
          where: { paymentMethod: method, occurredAt: { gte: from, lte: to } },
          _sum: { amount: true },
        }),
        prisma.expense.aggregate({
          where: { paymentMethod: method, date: { gte: from, lte: to } },
          _sum: { amount: true },
        }),
      ]);
      const income = Number(incomeSum._sum.amount ?? 0);
      const expense = Number(expenseSum._sum.amount ?? 0);
      return { method, income, expense, net: income - expense };
    })
  );

  const totalIncome = rows.reduce((sum, r) => sum + r.income, 0);
  const totalExpense = rows.reduce((sum, r) => sum + r.expense, 0);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Balance de ingresos y egresos</h1>
        <Link href="/admin/gastos" className="text-sm text-brand-muted underline">
          ← Volver a Gastos
        </Link>
      </div>
      <p className="mt-2 text-sm text-brand-muted">
        Visible solo para Socio. Suma todos los medios de pago, desglosado — te dice cuánto
        debería haber en cada cuenta, no solo en la caja física.
      </p>

      <form method="get" className="mt-4 flex flex-wrap items-end gap-3 text-sm">
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
        <p className="text-xs text-brand-muted">Por defecto, últimos 30 días.</p>
      </form>

      <div className="mt-6 overflow-x-auto rounded-brand border border-brand-border bg-brand-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-brand-border text-brand-muted">
            <tr>
              <th className="px-4 py-3">Medio de pago</th>
              <th className="px-4 py-3">Ingresos</th>
              <th className="px-4 py-3">Egresos</th>
              <th className="px-4 py-3">Neto</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.method} className="border-b border-brand-border last:border-0">
                <td className="px-4 py-3">{METHOD_LABEL[r.method]}</td>
                <td className="px-4 py-3">{formatPrice(r.income)}</td>
                <td className="px-4 py-3">{formatPrice(r.expense)}</td>
                <td className="px-4 py-3 font-medium">{formatPrice(r.net)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-brand-border font-medium">
              <td className="px-4 py-3">Total</td>
              <td className="px-4 py-3">{formatPrice(totalIncome)}</td>
              <td className="px-4 py-3">{formatPrice(totalExpense)}</td>
              <td className="px-4 py-3">{formatPrice(totalIncome - totalExpense)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
