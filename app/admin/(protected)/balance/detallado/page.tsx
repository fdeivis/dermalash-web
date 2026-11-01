import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { peruMonthRange, peruToday } from "@/lib/scheduling";

export const dynamic = "force-dynamic";

const MONTH_LABEL = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

async function netBetween(start: Date, end: Date) {
  const [incomeSum, expenseSum] = await Promise.all([
    prisma.income.aggregate({ where: { occurredAt: { gte: start, lte: end } }, _sum: { amount: true } }),
    prisma.expense.aggregate({ where: { date: { gte: start, lte: end } }, _sum: { amount: true } }),
  ]);
  const income = Number(incomeSum._sum.amount ?? 0);
  const expense = Number(expenseSum._sum.amount ?? 0);
  return { income, expense, net: income - expense };
}

export default async function BalanceDetalladoPage({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/admin/login");
  // Mismo criterio que /admin/balance: restringido a Socio, no es un
  // permiso configurable.
  if (!["SOCIO", "ADMIN"].includes(session.user.role)) redirect("/admin");

  const currentYear = peruToday().getUTCFullYear();
  const { anio } = await searchParams;
  const year = anio && /^\d{4}$/.test(anio) ? Number(anio) : currentYear;

  // "Saldo inicial" = neto del año anterior completo (no todo el histórico
  // acumulado desde el inicio) — es lo que pidió el usuario explícitamente,
  // a confirmar con él si en realidad quiere arrastrar todos los años.
  const prevYearStart = peruMonthRange(year - 1, 1).start;
  const prevYearEnd = peruMonthRange(year - 1, 12).end;
  const openingBalance = (await netBetween(prevYearStart, prevYearEnd)).net;

  const months = await Promise.all(
    Array.from({ length: 12 }, (_, i) => i + 1).map(async (month) => {
      const { start, end } = peruMonthRange(year, month);
      const { income, expense, net } = await netBetween(start, end);
      return { month, income, expense, net };
    })
  );

  let running = openingBalance;
  const rows = months.map((m) => {
    running += m.net;
    return { ...m, acumulado: running };
  });

  const totalIncome = months.reduce((sum, m) => sum + m.income, 0);
  const totalExpense = months.reduce((sum, m) => sum + m.expense, 0);
  const totalNet = totalIncome - totalExpense;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Balance detallado</h1>
        <Link href="/admin/balance" className="text-sm text-brand-muted underline">
          ← Volver a Balance
        </Link>
      </div>
      <p className="mt-2 text-sm text-brand-muted">
        Vista de prueba: abre el año elegido mes a mes y arrastra como saldo inicial el neto del
        año anterior completo, para que el acumulado de diciembre se acerque a lo que debería haber
        de verdad en cuenta. No reemplaza todavía al Balance actual.
      </p>

      <form method="get" className="mt-4 flex flex-wrap items-end gap-3 text-sm">
        <Link
          href={`/admin/balance/detallado?anio=${year - 1}`}
          className="rounded-brand border border-brand-border px-3 py-2 hover:bg-brand-surface"
        >
          ← {year - 1}
        </Link>
        <div>
          <label className="block font-medium">Año</label>
          <input
            type="number"
            name="anio"
            defaultValue={year}
            className="mt-1 w-28 rounded-brand border border-brand-border px-3 py-2"
          />
        </div>
        <button
          type="submit"
          className="rounded-brand border border-brand-border bg-brand-bg px-4 py-2 font-medium hover:bg-brand-surface"
        >
          Filtrar
        </button>
        <Link
          href={`/admin/balance/detallado?anio=${year + 1}`}
          className="rounded-brand border border-brand-border px-3 py-2 hover:bg-brand-surface"
        >
          {year + 1} →
        </Link>
      </form>

      <p className="mt-4 text-sm">
        Saldo inicial ({year - 1}): <span className="font-medium">{formatPrice(openingBalance)}</span>
      </p>

      <div className="mt-3 overflow-x-auto rounded-brand border border-brand-border bg-brand-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-brand-border text-brand-muted">
            <tr>
              <th className="px-4 py-3">Mes</th>
              <th className="px-4 py-3">Ingresos</th>
              <th className="px-4 py-3">Egresos</th>
              <th className="px-4 py-3">Neto del mes</th>
              <th className="px-4 py-3">Saldo acumulado</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-brand-border bg-brand-bg/40">
              <td className="px-4 py-3 text-brand-muted" colSpan={4}>
                Saldo inicial (arrastrado de {year - 1})
              </td>
              <td className="px-4 py-3 font-medium">{formatPrice(openingBalance)}</td>
            </tr>
            {rows.map((r) => (
              <tr key={r.month} className="border-b border-brand-border last:border-0">
                <td className="px-4 py-3">{MONTH_LABEL[r.month - 1]}</td>
                <td className="px-4 py-3">{formatPrice(r.income)}</td>
                <td className="px-4 py-3">{formatPrice(r.expense)}</td>
                <td className={`px-4 py-3 ${r.net >= 0 ? "" : "text-red-600"}`}>{formatPrice(r.net)}</td>
                <td className={`px-4 py-3 font-medium ${r.acumulado >= 0 ? "" : "text-red-600"}`}>
                  {formatPrice(r.acumulado)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-brand-border font-medium">
              <td className="px-4 py-3">Total del año</td>
              <td className="px-4 py-3">{formatPrice(totalIncome)}</td>
              <td className="px-4 py-3">{formatPrice(totalExpense)}</td>
              <td className="px-4 py-3">{formatPrice(totalNet)}</td>
              <td className="px-4 py-3">{formatPrice(running)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
