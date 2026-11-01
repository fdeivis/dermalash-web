import { prisma } from "@/lib/prisma";
import { requirePagePermission } from "@/lib/auth";
import { formatDateTime12 } from "@/lib/scheduling";
import { excelResponse } from "@/lib/excel";

const METHOD_LABEL: Record<string, string> = {
  EFECTIVO: "Efectivo",
  YAPE: "Yape",
  PLIN: "Plin",
  TARJETA: "Tarjeta",
  TRANSFERENCIA: "Transferencia",
};

export async function GET() {
  await requirePagePermission("caja.ver");

  const sessions = await prisma.cashSession.findMany({
    where: { closedAt: { not: null } },
    include: { accounts: true },
    orderBy: { closedAt: "desc" },
  });

  // Una fila por cuenta (medio de pago) de cada caja cerrada, no una fila
  // por caja — así cada diferencia queda en su propia celda numérica,
  // fácil de sumar o filtrar en Excel en vez de leerse de un texto armado.
  const rows = sessions.flatMap((s) =>
    s.accounts.map((a) => ({
      apertura: formatDateTime12(s.openedAt),
      cierre: s.closedAt ? formatDateTime12(s.closedAt) : "",
      medioDePago: METHOD_LABEL[a.paymentMethod] ?? a.paymentMethod,
      saldoApertura: Number(a.openingAmount),
      saldoEsperado: Number(a.expectedAmount ?? 0),
      saldoReal: Number(a.actualAmount ?? 0),
      diferencia: Number(a.difference ?? 0),
    }))
  );

  return excelResponse(
    "caja.xlsx",
    "Caja",
    [
      { header: "Apertura", key: "apertura", width: 20 },
      { header: "Cierre", key: "cierre", width: 20 },
      { header: "Medio de pago", key: "medioDePago", width: 16 },
      { header: "Saldo apertura", key: "saldoApertura", width: 16 },
      { header: "Saldo esperado", key: "saldoEsperado", width: 16 },
      { header: "Saldo real", key: "saldoReal", width: 14 },
      { header: "Diferencia", key: "diferencia", width: 14 },
    ],
    rows
  );
}
