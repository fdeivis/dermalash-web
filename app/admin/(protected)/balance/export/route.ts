import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseDateKey, peruDayRange, peruToday, addDaysUTC } from "@/lib/scheduling";
import { excelResponse } from "@/lib/excel";
import type { PaymentMethod } from "@prisma/client";

const METHODS: PaymentMethod[] = ["EFECTIVO", "YAPE", "PLIN", "TARJETA", "TRANSFERENCIA", "OTRO"];
const METHOD_LABEL: Record<string, string> = {
  EFECTIVO: "Efectivo",
  YAPE: "Yape",
  PLIN: "Plin",
  TARJETA: "Tarjeta",
  TRANSFERENCIA: "Transferencia",
  OTRO: "Otro",
};

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["SOCIO", "ADMIN"].includes(session.user.role)) {
    return new Response("No autorizado", { status: 403 });
  }

  const params = request.nextUrl.searchParams;
  const desde = params.get("desde") ?? undefined;
  const hasta = params.get("hasta") ?? undefined;
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
      return {
        medioDePago: METHOD_LABEL[method],
        ingresos: income,
        egresos: expense,
        neto: income - expense,
      };
    })
  );

  rows.push({
    medioDePago: "Total",
    ingresos: rows.reduce((sum, r) => sum + r.ingresos, 0),
    egresos: rows.reduce((sum, r) => sum + r.egresos, 0),
    neto: rows.reduce((sum, r) => sum + r.neto, 0),
  });

  return excelResponse(
    "balance.xlsx",
    "Balance",
    [
      { header: "Medio de pago", key: "medioDePago", width: 18 },
      { header: "Ingresos", key: "ingresos", width: 14 },
      { header: "Egresos", key: "egresos", width: 14 },
      { header: "Neto", key: "neto", width: 14 },
    ],
    rows
  );
}
