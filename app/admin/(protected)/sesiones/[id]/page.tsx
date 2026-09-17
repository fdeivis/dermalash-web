import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { professionalLabel, formatDateTime12 } from "@/lib/scheduling";
import { requirePagePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import { deleteClientSession } from "../actions";

const PAYMENT_LABEL: Record<string, string> = {
  EFECTIVO: "Efectivo",
  YAPE: "Yape",
  PLIN: "Plin",
  TARJETA: "Tarjeta",
  TRANSFERENCIA: "Transferencia",
  OTRO: "Otro",
};

export default async function VerFacturaPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requirePagePermission("sesiones.ver");
  const canDelete = await hasPermission(viewer.user.role, "sesiones.eliminar");
  const { id } = await params;

  const session = await prisma.clientSession.findUnique({
    where: { id },
    include: {
      client: true,
      attendedBy: true,
      appointment: true,
      income: true,
      services: { include: { service: true, promotion: true } },
    },
  });
  if (!session) notFound();

  const subtotal = session.services.reduce((sum, line) => sum + Number(line.priceApplied), 0);
  const discountAmount = subtotal - Number(session.totalAmount);

  return (
    <div className="max-w-2xl">
      <Link href="/admin/sesiones" className="text-sm text-brand-muted underline">
        ← Volver a Facturas
      </Link>
      <div className="mt-2 flex items-center justify-between">
        <h1 className="font-display text-2xl">
          Factura de {session.client.firstName} {session.client.lastName}
        </h1>
        {canDelete && (
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
        )}
      </div>

      <dl className="mt-6 space-y-3 rounded-brand border border-brand-border bg-brand-surface p-5 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-brand-muted">Fecha de atención</dt>
          <dd>{formatDateTime12(session.sessionDate)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-brand-muted">Fecha de emisión</dt>
          <dd>{formatDateTime12(session.createdAt)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-brand-muted">Cliente</dt>
          <dd>
            <Link href={`/admin/clientes/${session.clientId}`} className="underline">
              {session.client.firstName} {session.client.lastName}
            </Link>
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-brand-muted">Profesional</dt>
          <dd>{professionalLabel(session.attendedBy)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-brand-muted">Medio de pago</dt>
          <dd>{PAYMENT_LABEL[session.paymentMethod]}</dd>
        </div>
        {session.appointment && (
          <div className="flex justify-between gap-4">
            <dt className="text-brand-muted">Turno vinculado</dt>
            <dd>
              <Link href={`/admin/agenda/${session.appointment.id}`} className="underline">
                Ver turno ({formatDateTime12(session.appointment.startAt)})
              </Link>
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-6 rounded-brand border border-brand-border bg-brand-surface p-5 text-sm">
        <h2 className="font-display text-lg">Servicios</h2>
        <table className="mt-3 w-full text-left">
          <thead className="border-b border-brand-border text-brand-muted">
            <tr>
              <th className="py-2">Servicio</th>
              <th className="py-2">Promoción</th>
              <th className="py-2 text-right">Precio aplicado</th>
            </tr>
          </thead>
          <tbody>
            {session.services.map((line) => (
              <tr key={line.id} className="border-b border-brand-border last:border-0">
                <td className="py-2">{line.service.name}</td>
                <td className="py-2">{line.promotion?.name ?? "—"}</td>
                <td className="py-2 text-right">{formatPrice(line.priceApplied.toString())}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 space-y-1 border-t border-brand-border pt-3 text-right">
          <div className="flex justify-between">
            <span className="text-brand-muted">Subtotal</span>
            <span>{formatPrice(subtotal.toString())}</span>
          </div>
          {session.discountType && (
            <div className="flex justify-between text-brand-muted">
              <span>
                Descuento (
                {session.discountType === "PORCENTAJE"
                  ? `${session.discountValue}%`
                  : formatPrice(session.discountValue?.toString() ?? "0")}
                )
              </span>
              <span>-{formatPrice(discountAmount.toString())}</span>
            </div>
          )}
          <div className="flex justify-between font-medium">
            <span>Total cobrado</span>
            <span>{formatPrice(session.totalAmount.toString())}</span>
          </div>
        </div>

        {session.discountReason && (
          <p className="mt-3 text-sm text-brand-muted">
            <span className="font-medium">Motivo del descuento:</span> {session.discountReason}
          </p>
        )}
      </div>

      {session.notes && (
        <div className="mt-6 rounded-brand border border-brand-border bg-brand-surface p-5 text-sm">
          <h2 className="font-display text-lg">Observaciones</h2>
          <p className="mt-2 whitespace-pre-wrap">{session.notes}</p>
        </div>
      )}

      {session.income && (
        <div className="mt-6 rounded-brand border border-brand-border bg-brand-surface p-5 text-sm">
          <h2 className="font-display text-lg">Ingreso registrado</h2>
          <div className="mt-3 flex justify-between gap-4">
            <span className="text-brand-muted">Monto</span>
            <span>{formatPrice(session.income.amount.toString())}</span>
          </div>
          <div className="mt-1 flex justify-between gap-4">
            <span className="text-brand-muted">Vinculado a caja</span>
            <Badge variant={session.income.cashSessionId ? "published" : "draft"}>
              {session.income.cashSessionId ? "Sí" : "No"}
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
}
