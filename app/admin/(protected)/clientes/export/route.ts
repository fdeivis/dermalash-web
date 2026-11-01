import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePagePermission } from "@/lib/auth";
import { formatDateTime12 } from "@/lib/scheduling";
import { excelResponse } from "@/lib/excel";

const SOURCE_LABEL: Record<string, string> = {
  WHATSAPP: "WhatsApp",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  REFERIDO: "Referido",
  PRESENCIAL: "Presencial",
  OTRO: "Otro",
};

export async function GET(request: NextRequest) {
  await requirePagePermission("clientes.ver");
  const q = request.nextUrl.searchParams.get("q") ?? undefined;

  const clients = await prisma.client.findMany({
    where: q
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
            { documentId: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      sessions: { orderBy: { sessionDate: "desc" }, take: 1, select: { sessionDate: true } },
      _count: { select: { sessions: true } },
    },
  });

  const rows = clients.map((client) => ({
    nombre: client.firstName,
    apellido: client.lastName,
    telefono: client.phone ?? "",
    documento: client.documentId ?? "",
    origen: SOURCE_LABEL[client.source ?? ""] ?? "",
    visitas: client._count.sessions,
    ultimaVisita: client.sessions[0] ? formatDateTime12(client.sessions[0].sessionDate) : "",
  }));

  return excelResponse(
    "clientes.xlsx",
    "Clientes",
    [
      { header: "Nombre", key: "nombre", width: 20 },
      { header: "Apellido", key: "apellido", width: 20 },
      { header: "Teléfono", key: "telefono", width: 16 },
      { header: "Documento", key: "documento", width: 16 },
      { header: "Origen", key: "origen", width: 14 },
      { header: "Visitas", key: "visitas", width: 10 },
      { header: "Última visita", key: "ultimaVisita", width: 20 },
    ],
    rows
  );
}
