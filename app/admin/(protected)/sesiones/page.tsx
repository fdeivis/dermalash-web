import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { professionalLabel, formatDateTime12 } from "@/lib/scheduling";
import { requirePagePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import { deleteClientSession } from "./actions";

const PAYMENT_LABEL: Record<string, string> = {
  EFECTIVO: "Efectivo",
  YAPE: "Yape",
  PLIN: "Plin",
  TARJETA: "Tarjeta",
  TRANSFERENCIA: "Transferencia",
  OTRO: "Otro",
};

export default async function AdminSesionesPage() {
  const viewer = await requirePagePermission("sesiones.ver");
  const canDelete = await hasPermission(viewer.user.role, "sesiones.eliminar");
  const sessions = await prisma.clientSession.findMany({
    orderBy: { sessionDate: "desc" },
    include: { client: true, attendedBy: true, services: { include: { service: true } } },
    take: 50,
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Facturas</h1>
        <Link href="/admin/sesiones/nuevo">
          <Button>Nueva factura</Button>
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
              {canDelete && <th className="px-4 py-3">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session.id} className="border-b border-brand-border last:border-0">
                <td className="px-4 py-3">
                  {formatDateTime12(session.sessionDate)}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/clientes/${session.clientId}`} className="underline">
                    {session.client.firstName} {session.client.lastName}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {session.services.map((line) => line.service.name).join(", ")}
                </td>
                <td className="px-4 py-3">{professionalLabel(session.attendedBy)}</td>
                <td className="px-4 py-3">{PAYMENT_LABEL[session.paymentMethod]}</td>
                <td className="px-4 py-3">{formatPrice(session.totalAmount.toString())}</td>
                {canDelete && (
                  <td className="px-4 py-3">
                    <form action={deleteClientSession.bind(null, session.id)}>
                      <ConfirmSubmitButton
                        type="submit"
                        variant="danger"
                        size="sm"
                        confirmMessage="¿Eliminar esta factura? También se elimina el ingreso asociado. No se puede deshacer."
                      >
                        Eliminar
                      </ConfirmSubmitButton>
                    </form>
                  </td>
                )}
              </tr>
            ))}
            {sessions.length === 0 && (
              <tr>
                <td colSpan={canDelete ? 7 : 6} className="px-4 py-8 text-center text-brand-muted">
                  Todavía no hay facturas registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
