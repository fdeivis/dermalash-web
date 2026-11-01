import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePagePermission } from "@/lib/auth";
import { parseMonthKey, peruMonthRange } from "@/lib/scheduling";
import { excelResponse } from "@/lib/excel";

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export async function GET(request: NextRequest) {
  await requirePagePermission("servicios.ver");
  const monthKey = request.nextUrl.searchParams.get("mes") ?? currentMonthKey();
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
      servicio: serviceById.get(g.serviceId)?.name ?? "Servicio eliminado",
      cantidad: g._count._all,
      ingresos: Number(g._sum.priceApplied ?? 0),
    }))
    .sort((a, b) => b.cantidad - a.cantidad);

  return excelResponse(
    `servicios-mas-vendidos-${monthKey}.xlsx`,
    "Más vendidos",
    [
      { header: "Servicio", key: "servicio", width: 30 },
      { header: "Cantidad vendida", key: "cantidad", width: 18 },
      { header: "Ingresos generados", key: "ingresos", width: 18 },
    ],
    rows
  );
}
