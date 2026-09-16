import { prisma } from "@/lib/prisma";
import type { PaymentMethod } from "@prisma/client";

/**
 * Saldo esperado de una sesión de caja (conciliación de un medio de pago):
 * saldo inicial + ingresos − egresos de ESE medio de pago en el rango de
 * fechas de la sesión. No enlaza cada Income a la sesión a mano — se
 * calcula por rango, igual que ya hace `resolveSessionPricing` con las
 * promociones vigentes.
 */
export async function computeCashBalance(
  paymentMethod: PaymentMethod,
  openingAmount: number,
  from: Date,
  until: Date
): Promise<number> {
  const [incomeSum, expenseSum] = await Promise.all([
    prisma.income.aggregate({
      where: { paymentMethod, occurredAt: { gte: from, lte: until } },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { paymentMethod, date: { gte: from, lte: until } },
      _sum: { amount: true },
    }),
  ]);

  return openingAmount + Number(incomeSum._sum.amount ?? 0) - Number(expenseSum._sum.amount ?? 0);
}
