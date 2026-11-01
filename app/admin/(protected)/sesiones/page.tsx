import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { professionalLabel, formatDateTime12, parseDateKey, peruDayRange } from "@/lib/scheduling";
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

export const dynamic = "force-dynamic";

export default async function AdminSesionesPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string }>;
}) {
  const viewer = await requirePagePermission("sesiones.ver");
  const canDelete = await hasPermission(viewer.user.role, "sesiones.eliminar");
  const { desde, hasta } = await searchParams;

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
    take: 200,
  });

  const exportQs = `${desde ? `desde=${desde}&` : ""}${hasta ? `hasta=${hasta}` : ""}`;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Facturas</h1>
        <Link href="/admin/sesiones/nuevo">
          <Button>Nueva factura</Button>
        </Link>
      </div>

      <form method="get" className="mt-4 flex flex-wrap items-end gap-3 text-sm">
        <div>
          <label className="block font-medium">Desde</label>
          <input
            type="date"
            name="desde"
            defaultValue={desde ?? ""}
            className="mt-1 rounded-brand border border-brand-border px-3 py-2"
          />
        </div>
        <div>
          <label className="block font-medium">Hasta</label>
          <input
            type="date"
            name="hasta"
            defaultValue={hasta ?? ""}
            className="mt-1 rounded-brand border border-brand-border px-3 py-2"
          />
        </div>
        <button
          type="submit"
          className="rounded-brand border border-brand-border bg-brand-bg px-4 py-2 font-medium hover:bg-brand-surface"
        >
          Filtrar
        </button>
        {(desde || hasta) && (
          <Link href="/admin/sesiones" className="text-brand-muted underline">
            Limpiar filtros
          </Link>
        )}
        <a href={`/admin/sesiones/export?${exportQs}`} className="ml-auto">
          <Button type="button" variant="outline" size="sm">
            Descargar Excel
          </Button>
        </a>
      </form>

      <div className="mt-4 overflow-x-auto rounded-brand border border-brand-border bg-brand-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-brand-border text-brand-muted">
            <tr>
              <th className="px-4 py-3">Fecha de atención</th>
              <th className="px-4 py-3">Emitida</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Servicios</th>
              <th className="px-4 py-3">Profesional</th>
              <th className="px-4 py-3">Medio de pago</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session.id} className="border-b border-brand-border last:border-0">
                <td className="px-4 py-3">
                  {formatDateTime12(session.sessionDate)}
                </td>
                <td className="px-4 py-3 text-brand-muted">
                  {formatDateTime12(session.createdAt)}
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
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/admin/sesiones/${session.id}`}>
                      <Button variant="outline" size="sm">
                        Ver
                      </Button>
                    </Link>
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
                </td>
              </tr>
            ))}
            {sessions.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-brand-muted">
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
