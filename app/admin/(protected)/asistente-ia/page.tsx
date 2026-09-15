import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePagePermission } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { createSimulatedConversation } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Activa",
  NEEDS_HUMAN: "Necesita un humano",
  CLOSED: "Cerrada",
};

export default async function AsistenteIaPage() {
  await requirePagePermission("asistente_ia.chat");

  const [conversations, clients] = await Promise.all([
    prisma.conversation.findMany({
      where: { channel: "SIMULATED" },
      include: { client: true },
      orderBy: { lastMessageAt: "desc" },
      take: 50,
    }),
    prisma.client.findMany({ orderBy: { lastName: "asc" } }),
  ]);

  return (
    <div>
      <h1 className="font-display text-2xl">Asistente de WhatsApp (IA)</h1>
      <p className="mt-2 text-sm text-brand-muted">
        Chat de prueba: escribí como si fueras un cliente para probar el asistente antes de conectar
        WhatsApp real. Las acciones de agenda que tome quedan registradas igual que si vinieran de
        WhatsApp de verdad.
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
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {conversations.map((c) => (
              <tr key={c.id} className="border-b border-brand-border last:border-0">
                <td className="px-4 py-3">
                  <Link href={`/admin/asistente-ia/${c.id}`} className="underline">
                    {c.lastMessageAt.toLocaleString("es-PE")}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {c.client ? `${c.client.firstName} ${c.client.lastName}` : "Sin identificar"}
                </td>
                <td className="px-4 py-3">{STATUS_LABEL[c.status]}</td>
              </tr>
            ))}
            {conversations.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-brand-muted">
                  Todavía no hay conversaciones de prueba.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
