import { prisma } from "@/lib/prisma";
import type { PaymentMethod } from "@prisma/client";

export type CashBalanceBreakdown = {
  ingresos: number;
  egresos: number;
  expected: number;
};

/**
 * Saldo esperado de una cuenta dentro de una sesión de caja: saldo inicial +
 * ingresos − egresos, ambos ya vinculados a ESTA sesión por `cashSessionId`
 * (no por rango de fechas).
 *
 * Por qué por vínculo y no por rango de fechas: tanto `Income.occurredAt`
 * como `Expense.date` son instantes/fechas que no necesariamente caen
 * dentro de un rango [apertura, ahora] limpio — un `Expense.date` es una
 * fecha neutra a medianoche de Perú (puede quedar ANTES de la apertura de
 * una caja abierta esa misma noche), y una caja que queda abierta más de un
 * día hace ambiguo qué "rango" corresponde. El vínculo explícito (que se
 * arma al crear el ingreso/egreso, si hay una caja abierta arqueando ese
 * medio de pago) evita esa ambigüedad de raíz — el saldo esperado de la
 * caja es exactamente lo que se vinculó a ella, ni más ni menos.
 */
export async function computeCashBalance(
  paymentMethod: PaymentMethod,
  openingAmount: number,
  cashSessionId: string
): Promise<CashBalanceBreakdown> {
  // Se filtra también por paymentMethod porque una misma sesión puede tener
  // más de una cuenta abierta a la vez (Efectivo y Yape, por ejemplo) — el
  // vínculo cashSessionId por sí solo no distingue a cuál de esas cuentas
  // corresponde cada ingreso/egreso.
  const [incomeSum, expenseSum] = await Promise.all([
    prisma.income.aggregate({ where: { cashSessionId, paymentMethod }, _sum: { amount: true } }),
    prisma.expense.aggregate({ where: { cashSessionId, paymentMethod }, _sum: { amount: true } }),
  ]);

  const ingresos = Number(incomeSum._sum.amount ?? 0);
  const egresos = Number(expenseSum._sum.amount ?? 0);
  return { ingresos, egresos, expected: openingAmount + ingresos - egresos };
}
