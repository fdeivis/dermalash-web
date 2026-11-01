import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePagePermission } from "@/lib/auth";
import { parseDateKey, peruDayRange } from "@/lib/scheduling";
import { excelResponse } from "@/lib/excel";
import type { ExpenseCategory } from "@prisma/client";

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

const PAYMENT_LABEL: Record<string, string> = {
  EFECTIVO: "Efectivo",
  YAPE: "Yape",
  PLIN: "Plin",
  TARJETA: "Tarjeta",
  TRANSFERENCIA: "Transferencia",
  OTRO: "Otro",
};

export async function GET(request: NextRequest) {
  await requirePagePermission("gastos.ver");
  const params = request.nextUrl.searchParams;
  const category = params.get("category") ?? undefined;
  const supplierId = params.get("supplierId") ?? undefined;
  const desde = params.get("desde") ?? undefined;
  const hasta = params.get("hasta") ?? undefined;

  const where: Record<string, unknown> = {};
  if (category) where.category = category;
  if (supplierId) where.supplierId = supplierId;
  if (desde || hasta) {
    const date: { gte?: Date; lte?: Date } = {};
    if (desde) date.gte = peruDayRange(parseDateKey(desde)).start;
    if (hasta) date.lte = peruDayRange(parseDateKey(hasta)).end;
    where.date = date;
  }

  const expenses = await prisma.expense.findMany({
    where,
    include: { supplier: true, employee: true },
    orderBy: { date: "desc" },
  });

  const rows = expenses.map((expense) => ({
    fecha: expense.date.toLocaleDateString("es-PE"),
    concepto: expense.concept,
    categoria: CATEGORY_LABEL[expense.category] ?? expense.category,
    proveedor: expense.supplier?.name ?? "",
    empleado: expense.employee ? `${expense.employee.firstName} ${expense.employee.lastName}` : "",
    medioDePago: PAYMENT_LABEL[expense.paymentMethod] ?? expense.paymentMethod,
    monto: Number(expense.amount),
  }));

  return excelResponse(
    "gastos.xlsx",
    "Gastos",
    [
      { header: "Fecha", key: "fecha", width: 14 },
      { header: "Concepto", key: "concepto", width: 28 },
      { header: "Categoría", key: "categoria", width: 18 },
      { header: "Proveedor", key: "proveedor", width: 22 },
      { header: "Empleado", key: "empleado", width: 20 },
      { header: "Medio de pago", key: "medioDePago", width: 16 },
      { header: "Monto", key: "monto", width: 12 },
    ],
    rows
  );
}
