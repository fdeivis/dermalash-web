import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePagePermission } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { SimulatedChatForm } from "@/components/admin/SimulatedChatForm";
import { sendSimulatedMessage } from "../actions";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Activa",
  NEEDS_HUMAN: "Necesita un humano",
  CLOSED: "Cerrada",
};

export default async function ConversacionPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePagePermission("asistente_ia.chat");
  const { id } = await params;

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: { client: true, messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!conversation) notFound();

  return (
    <div>
      <Link href="/admin/asistente-ia" className="text-sm text-brand-muted underline">
        ← Todas las conversaciones
      </Link>

      <div className="mt-2 flex items-center justify-between">
        <h1 className="font-display text-2xl">
          {conversation.client ? `${conversation.client.firstName} ${conversation.client.lastName}` : "Cliente sin identificar"}
        </h1>
        <span className="rounded-brand border border-brand-border px-3 py-1 text-xs text-brand-muted">
          {STATUS_LABEL[conversation.status]}
        </span>
      </div>

      <div className="mt-6 max-w-xl space-y-3 rounded-brand border border-brand-border bg-brand-surface p-4">
        {conversation.messages.map((m) => (
          <div key={m.id} className={cn("flex", m.role === "USER" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[80%] rounded-brand px-3 py-2 text-sm",
                m.role === "USER" ? "bg-brand-accent text-white" : "bg-brand-bg text-brand-ink"
              )}
            >
              {m.content}
            </div>
          </div>
        ))}
        {conversation.messages.length === 0 && conversation.channel === "SIMULATED" && (
          <p className="text-center text-sm text-brand-muted">Escribe el primer mensaje como si fueras el cliente.</p>
        )}
        {conversation.messages.length === 0 && conversation.channel === "WHATSAPP" && (
          <p className="text-center text-sm text-brand-muted">Todavía no hay mensajes en esta conversación.</p>
        )}
      </div>

      {conversation.channel === "SIMULATED" && (
        <div className="max-w-xl">
          <SimulatedChatForm action={sendSimulatedMessage.bind(null, conversation.id)} />
        </div>
      )}
      {conversation.channel === "WHATSAPP" && (
        <p className="mt-4 max-w-xl text-sm text-brand-muted">
          Esta es una conversación real de WhatsApp — es de solo lectura acá. Para responder, escribile
          directo desde WhatsApp al cliente.
        </p>
      )}
    </div>
  );
}
