import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const PAYMENT_LABEL: Record<string, string> = {
  EFECTIVO: "Efectivo",
  YAPE: "Yape",
  PLIN: "Plin",
  TARJETA: "Tarjeta",
  TRANSFERENCIA: "Transferencia",
  OTRO: "Otro",
};

export default async function AdminSesionesPage() {
  const sessions = await prisma.clientSession.findMany({
    orderBy: { sessionDate: "desc" },
    include: { client: true, attendedBy: true, services: { include: { service: true } } },
    take: 50,
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Sesiones</h1>
        <Link href="/admin/sesiones/nuevo">
          <Button>Nueva sesión</Button>
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-brand border border-brand-border bg-brand-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-brand-border text-brand-muted">
            <tr>
              <th className="px-4 py-3">Fecha y hora</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Servicios</th>
              <th className="px-4 py-3">Profesional</th>
              <th className="px-4 py-3">Medio de pago</th>
              <th className="px-4 py-3">Total</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session.id} className="border-b border-brand-border last:border-0">
                <td className="px-4 py-3">
                  {session.sessionDate.toLocaleString("es-PE", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/clientes/${session.clientId}`} className="underline">
                    {session.client.firstName} {session.client.lastName}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {session.services.map((line) => line.service.name).join(", ")}
                </td>
                <td className="px-4 py-3">{session.attendedBy.name}</td>
                <td className="px-4 py-3">{PAYMENT_LABEL[session.paymentMethod]}</td>
                <td className="px-4 py-3">{formatPrice(session.totalAmount.toString())}</td>
              </tr>
            ))}
            {sessions.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-brand-muted">
                  Todavía no hay sesiones registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
