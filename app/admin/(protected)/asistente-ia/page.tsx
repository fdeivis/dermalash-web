import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePagePermission } from "@/lib/auth";
import { formatDateTime12 } from "@/lib/scheduling";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import { cn } from "@/lib/utils";
import { createSimulatedConversation, deleteConversation, purgeOldConversations, purgeAllConversations } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Activa",
  NEEDS_HUMAN: "Necesita un humano",
  CLOSED: "Cerrada",
};

const CHANNEL_LABEL: Record<string, string> = {
  WHATSAPP: "WhatsApp",
  SIMULATED: "Prueba",
};

export default async function AsistenteIaPage({
  searchParams,
}: {
  searchParams: Promise<{ purgadas?: string }>;
}) {
  const session = await requirePagePermission("asistente_ia.chat");
  const canDelete = ["SOCIO", "ADMIN"].includes(session.user.role);
  const { purgadas } = await searchParams;

  const [recentConversations, clients] = await Promise.all([
    prisma.conversation.findMany({
      include: { client: true },
      orderBy: { lastMessageAt: "desc" },
      take: 100,
    }),
    prisma.client.findMany({ orderBy: { lastName: "asc" } }),
  ]);

  // Las que necesitan un humano van primero, sin importar cuándo fue el
  // último mensaje — son las que alguien tiene que atender ya. El orden por
  // enum de Prisma sigue el orden de declaración (ACTIVE, NEEDS_HUMAN,
  // CLOSED), no el que necesitamos acá, así que se reordena en JS.
  const conversations = [...recentConversations]
    .sort((a, b) => Number(b.status === "NEEDS_HUMAN") - Number(a.status === "NEEDS_HUMAN"))
    .slice(0, 50);

  return (
    <div>
      <h1 className="font-display text-2xl">Asistente de WhatsApp (IA)</h1>
      <p className="mt-2 text-sm text-brand-muted">
        Conversaciones reales de WhatsApp y chats de prueba (para probar el asistente sin usar
        WhatsApp real). Las acciones de agenda que tome quedan registradas igual en ambos casos.
      </p>

      {purgadas !== undefined && (
        <p className="mt-4 rounded-brand border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Se eliminaron {purgadas} conversaciones.
        </p>
      )}

      <form action={createSimulatedConversation} className="mt-6 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-sm font-medium">Cliente a simular (opcional)</label>
          <select
            name="clientId"
            className="mt-1 rounded-brand border border-brand-border px-3 py-2 text-sm"
          >
            <option value="">Sin identificar todavía</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.firstName} {c.lastName}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit">Nueva conversación de prueba</Button>
      </form>

      {canDelete && (
        <div className="mt-6 space-y-3 rounded-brand border border-brand-border bg-brand-surface p-4">
          <p className="text-sm font-medium">Depurar conversaciones</p>
          <form action={purgeOldConversations} className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-sm font-medium">Eliminar más antiguas que (días)</label>
              <input
                type="number"
                name="days"
                min={1}
                required
                defaultValue={90}
                className="mt-1 w-32 rounded-brand border border-brand-border px-3 py-2 text-sm"
              />
            </div>
            <ConfirmSubmitButton
              type="submit"
              variant="danger"
              size="sm"
              confirmMessage="¿Eliminar todas las conversaciones más antiguas que ese número de días? Las que todavía necesitan un humano no se tocan. No se puede deshacer."
            >
              Purgar
            </ConfirmSubmitButton>
          </form>
          <form action={purgeAllConversations}>
            <ConfirmSubmitButton
              type="submit"
              variant="danger"
              size="sm"
              confirmMessage="¿Eliminar TODAS las conversaciones, incluidas las que necesitan un humano y las más recientes? No se puede deshacer."
            >
              Eliminar todas las conversaciones
            </ConfirmSubmitButton>
          </form>
        </div>
      )}

      <div className="mt-6 overflow-x-auto rounded-brand border border-brand-border bg-brand-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-brand-border text-brand-muted">
            <tr>
              <th className="px-4 py-3">Último mensaje</th>
              <th className="px-4 py-3">Canal</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Estado</th>
              {canDelete && <th className="px-4 py-3">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {conversations.map((c) => (
              <tr
                key={c.id}
                className={cn(
                  "border-b border-brand-border last:border-0",
                  c.status === "NEEDS_HUMAN" && "bg-amber-50"
                )}
              >
                <td className="px-4 py-3">
                  <Link href={`/admin/asistente-ia/${c.id}`} className="underline">
                    {formatDateTime12(c.lastMessageAt)}
                  </Link>
                </td>
                <td className="px-4 py-3">{CHANNEL_LABEL[c.channel]}</td>
                <td className="px-4 py-3">
                  {c.client ? `${c.client.firstName} ${c.client.lastName}` : "Sin identificar"}
                </td>
                <td className="px-4 py-3">{STATUS_LABEL[c.status]}</td>
                {canDelete && (
                  <td className="px-4 py-3">
                    <form action={deleteConversation.bind(null, c.id)}>
                      <ConfirmSubmitButton
                        type="submit"
                        variant="danger"
                        size="sm"
                        confirmMessage="¿Eliminar esta conversación? No se puede deshacer."
                      >
                        Eliminar
                      </ConfirmSubmitButton>
                    </form>
                  </td>
                )}
              </tr>
            ))}
            {conversations.length === 0 && (
              <tr>
                <td colSpan={canDelete ? 5 : 4} className="px-4 py-8 text-center text-brand-muted">
                  Todavía no hay conversaciones.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
