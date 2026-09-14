import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSignedUrl } from "@/lib/supabase";
import { formatPrice } from "@/lib/utils";
import { formatDateTime12 } from "@/lib/scheduling";
import { requirePagePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { ClientAttachmentUploader } from "@/components/admin/ClientAttachmentUploader";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import { deleteClientAttachment } from "../actions";

const KIND_LABEL: Record<string, string> = {
  PHOTO: "Foto",
  DOCUMENT: "Documento",
  HEALTH_RECORD: "Antecedente de salud",
};

const SEX_LABEL: Record<string, string> = {
  HOMBRE: "Hombre",
  MUJER: "Mujer",
  OTRO: "Otro",
};

export default async function VerClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePagePermission("clientes.ver");
  const canManage = await hasPermission(session.user.role, "clientes.gestionar");
  const { id } = await params;
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      attachments: { orderBy: { createdAt: "desc" } },
      sessions: {
        orderBy: { sessionDate: "desc" },
        include: { attendedBy: true, services: { include: { service: true } } },
      },
    },
  });
  if (!client) notFound();

  const attachmentsWithUrl = await Promise.all(
    client.attachments.map(async (attachment) => ({
      ...attachment,
      url: await getSignedUrl(attachment.storagePath).catch(() => null),
    }))
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">
          {client.firstName} {client.lastName}
        </h1>
        {canManage && (
          <Link href={`/admin/clientes/${client.id}/editar`}>
            <Button variant="outline" size="sm">
              Editar
            </Button>
          </Link>
        )}
      </div>

      <dl className="mt-6 max-w-xl space-y-3 rounded-brand border border-brand-border bg-brand-surface p-5 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-brand-muted">Fecha de nacimiento</dt>
          <dd>{client.birthDate ? client.birthDate.toLocaleDateString("es-PE") : "—"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-brand-muted">Sexo</dt>
          <dd>{client.sex ? (SEX_LABEL[client.sex] ?? client.sex) : "—"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-brand-muted">Documento</dt>
          <dd>{client.documentId ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-brand-muted">Teléfono</dt>
          <dd>{client.phone ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-brand-muted">WhatsApp</dt>
          <dd>{client.whatsapp ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-brand-muted">Email</dt>
          <dd>{client.email ?? "—"}</dd>
        </div>
        {client.notes && (
          <div>
            <dt className="text-brand-muted">Observaciones</dt>
            <dd className="mt-1">{client.notes}</dd>
          </div>
        )}
        {client.healthNotes && (
          <div>
            <dt className="text-brand-muted">Antecedentes de salud</dt>
            <dd className="mt-1">{client.healthNotes}</dd>
          </div>
        )}
      </dl>

      <div className="mt-10 max-w-xl">
        <h2 className="font-display text-lg">Fotos y documentos</h2>
        <p className="mt-1 text-sm text-brand-muted">
          Archivos privados: solo accesibles desde acá, mediante enlaces temporales.
        </p>
        {canManage && (
          <div className="mt-4">
            <ClientAttachmentUploader clientId={client.id} />
          </div>
        )}
        <ul className="mt-4 space-y-2 text-sm">
          {attachmentsWithUrl.map((attachment) => (
            <li key={attachment.id} className="flex items-center justify-between">
              <span>
                {KIND_LABEL[attachment.kind]} · {attachment.createdAt.toLocaleDateString("es-PE")}
              </span>
              <span className="flex items-center gap-3">
                {attachment.url ? (
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-accent underline"
                  >
                    Ver
                  </a>
                ) : (
                  <span className="text-red-600">No disponible</span>
                )}
                {canManage && (
                  <form action={deleteClientAttachment.bind(null, client.id, attachment.id)}>
                    <ConfirmSubmitButton
                      type="submit"
                      variant="danger"
                      size="sm"
                      confirmMessage="¿Eliminar este archivo? Esta acción no se puede deshacer."
                    >
                      Eliminar
                    </ConfirmSubmitButton>
                  </form>
                )}
              </span>
            </li>
          ))}
          {attachmentsWithUrl.length === 0 && (
            <li className="text-brand-muted">Todavía no hay archivos adjuntos.</li>
          )}
        </ul>
      </div>

      <div className="mt-10 max-w-xl">
        <h2 className="font-display text-lg">Historial de sesiones</h2>
        <div className="mt-4 overflow-x-auto rounded-brand border border-brand-border bg-brand-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-brand-border text-brand-muted">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Servicios</th>
                <th className="px-4 py-3">Profesional</th>
                <th className="px-4 py-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {client.sessions.map((session) => (
                <tr key={session.id} className="border-b border-brand-border last:border-0">
                  <td className="px-4 py-3">
                    {formatDateTime12(session.sessionDate)}
                  </td>
                  <td className="px-4 py-3">
                    {session.services.map((line) => line.service.name).join(", ")}
                  </td>
                  <td className="px-4 py-3">{session.attendedBy.name}</td>
                  <td className="px-4 py-3">{formatPrice(session.totalAmount.toString())}</td>
                </tr>
              ))}
              {client.sessions.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-brand-muted">
                    Todavía no tiene sesiones registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
