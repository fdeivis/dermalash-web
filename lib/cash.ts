import { prisma } from "@/lib/prisma";
import type { PaymentMethod } from "@prisma/client";

/**
 * Saldo esperado de una cuenta dentro de una sesión de caja: saldo inicial +
 * ingresos de ese medio de pago en el rango real de la sesión − egresos de
 * ese medio ya vinculados a ESTA sesión (por cashSessionId, no por rango de
 * fechas).
 *
 * Por qué el egreso usa el vínculo y no un rango de fechas: `Expense.date`
 * es una fecha neutra anclada a medianoche de Perú (00:00 = 05:00 UTC), no
 * un instante real — un gasto cargado "hoy" a la tarde/noche siempre tiene
 * un timestamp ANTERIOR al de una caja abierta esa misma noche (que usa la
 * hora real de apertura). Comparar por rango de fechas real dejaba afuera
 * gastos que sí correspondían a la sesión (bug real encontrado en pruebas).
 * El ingreso sí puede usar rango real porque `Income.occurredAt` es un
 * instante real, comparable con `openedAt`/`ahora` sin ese problema.
 */
export async function computeCashBalance(
  paymentMethod: PaymentMethod,
  openingAmount: number,
  cashSessionId: string,
  incomeFrom: Date,
  incomeUntil: Date
): Promise<number> {
  const [incomeSum, expenseSum] = await Promise.all([
    prisma.income.aggregate({
      where: { paymentMethod, occurredAt: { gte: incomeFrom, lte: incomeUntil } },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { paymentMethod, cashSessionId },
      _sum: { amount: true },
    }),
  ]);

  return openingAmount + Number(incomeSum._sum.amount ?? 0) - Number(expenseSum._sum.amount ?? 0);
}
