import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePagePermission } from "@/lib/auth";
import { professionalLabel, formatDateTime12, parseDateKey, peruDayRange } from "@/lib/scheduling";
import { excelResponse } from "@/lib/excel";

const PAYMENT_LABEL: Record<string, string> = {
  EFECTIVO: "Efectivo",
  YAPE: "Yape",
  PLIN: "Plin",
  TARJETA: "Tarjeta",
  TRANSFERENCIA: "Transferencia",
  OTRO: "Otro",
};

export async function GET(request: NextRequest) {
  await requirePagePermission("sesiones.ver");
  const desde = request.nextUrl.searchParams.get("desde") ?? undefined;
  const hasta = request.nextUrl.searchParams.get("hasta") ?? undefined;

  const where: Record<string, unknown> = {};
  if (desde || hasta) {
    const sessionDate: { gte?: Date; lte?: Date } = {};
    if (desde) sessionDate.gte = peruDayRange(parseDateKey(desde)).start;
    if (hasta) sessionDate.lte = peruDayRange(parseDateKey(hasta)).end;
    where.sessionDate = sessionDate;
  }

  const sessions = await prisma.clientSession.findMany({
    where,
    orderBy: { sessionDate: "desc" },
    include: { client: true, attendedBy: true, services: { include: { service: true } } },
  });

  const rows = sessions.map((session) => ({
    fechaAtencion: formatDateTime12(session.sessionDate),
    fechaEmision: formatDateTime12(session.createdAt),
    cliente: `${session.client.firstName} ${session.client.lastName}`,
    servicios: session.services.map((line) => line.service.name).join(", "),
    profesional: professionalLabel(session.attendedBy),
    medioDePago: PAYMENT_LABEL[session.paymentMethod] ?? session.paymentMethod,
    descuento: session.discountValue
      ? `${session.discountType === "PORCENTAJE" ? `${session.discountValue}%` : session.discountValue}${session.discountReason ? ` (${session.discountReason})` : ""}`
      : "",
    total: Number(session.totalAmount),
  }));

  return excelResponse(
    "facturas.xlsx",
    "Facturas",
    [
      { header: "Fecha de atención", key: "fechaAtencion", width: 20 },
      { header: "Fecha de emisión", key: "fechaEmision", width: 20 },
      { header: "Cliente", key: "cliente", width: 24 },
      { header: "Servicios", key: "servicios", width: 36 },
      { header: "Profesional", key: "profesional", width: 20 },
      { header: "Medio de pago", key: "medioDePago", width: 16 },
      { header: "Descuento", key: "descuento", width: 18 },
      { header: "Total", key: "total", width: 12 },
    ],
    rows
  );
}
