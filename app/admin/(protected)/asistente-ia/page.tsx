import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePagePermission } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createSimulatedConversation } from "./actions";

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

export default async function AsistenteIaPage() {
  await requirePagePermission("asistente_ia.chat");

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

      <div className="mt-6 overflow-x-auto rounded-brand border border-brand-border bg-brand-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-brand-border text-brand-muted">
            <tr>
              <th className="px-4 py-3">Último mensaje</th>
              <th className="px-4 py-3">Canal</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Estado</th>
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
                    {c.lastMessageAt.toLocaleString("es-PE")}
                  </Link>
                </td>
                <td className="px-4 py-3">{CHANNEL_LABEL[c.channel]}</td>
                <td className="px-4 py-3">
                  {c.client ? `${c.client.firstName} ${c.client.lastName}` : "Sin identificar"}
                </td>
                <td className="px-4 py-3">{STATUS_LABEL[c.status]}</td>
              </tr>
            ))}
            {conversations.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-brand-muted">
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
