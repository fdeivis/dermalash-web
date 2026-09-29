"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission, requireSocioOrAdmin } from "@/lib/auth";
import { runAssistantTurn } from "@/lib/ai/assistant";
import { SimulatedMessagingProvider } from "@/lib/messaging/provider";

export async function createSimulatedConversation(formData: FormData) {
  await requirePermission("asistente_ia.chat");
  const clientId = String(formData.get("clientId") || "").trim() || null;

  const conversation = await prisma.conversation.create({
    data: {
      channel: "SIMULATED",
      externalId: `sim:${crypto.randomUUID()}`,
      clientId,
    },
  });

  revalidatePath("/admin/asistente-ia");
  redirect(`/admin/asistente-ia/${conversation.id}`);
}

const messageSchema = z.object({
  text: z.string().min(1, "Escribe un mensaje"),
});

export async function sendSimulatedMessage(conversationId: string, formData: FormData) {
  await requirePermission("asistente_ia.chat");
  let data: z.infer<typeof messageSchema>;
  try {
    data = messageSchema.parse({ text: formData.get("text") });
  } catch {
    // Mensaje vacío: no hay nada que enviar, se ignora en vez de romper.
    return;
  }

  await runAssistantTurn(conversationId, data.text, new SimulatedMessagingProvider());

  revalidatePath(`/admin/asistente-ia/${conversationId}`);
  revalidatePath("/admin/asistente-ia");
}

// Borrar conversaciones (incluidas las reales de WhatsApp) es más sensible
// que solo usarlas/verlas: regla fija de rol, no el permiso configurable
// "asistente_ia.chat" — mismo patrón que Logs/Balance/Permisos.
export async function deleteConversation(id: string) {
  await requireSocioOrAdmin();
  await prisma.$transaction([
    prisma.message.deleteMany({ where: { conversationId: id } }),
    prisma.conversation.delete({ where: { id } }),
  ]);
  revalidatePath("/admin/asistente-ia");
}

const purgeSchema = z.object({ days: z.coerce.number().int().positive() });

export async function purgeOldConversations(formData: FormData) {
  await requireSocioOrAdmin();
  const { days } = purgeSchema.parse({ days: formData.get("days") });

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  // Nunca borra una conversación que todavía necesita un humano, sin
  // importar hace cuánto fue su último mensaje: sigue siendo pendiente.
  const antiguas = await prisma.conversation.findMany({
    where: { lastMessageAt: { lt: cutoff }, status: { not: "NEEDS_HUMAN" } },
    select: { id: true },
  });
  const ids = antiguas.map((c) => c.id);
  await prisma.$transaction([
    prisma.message.deleteMany({ where: { conversationId: { in: ids } } }),
    prisma.conversation.deleteMany({ where: { id: { in: ids } } }),
  ]);

  revalidatePath("/admin/asistente-ia");
  redirect(`/admin/asistente-ia?purgadas=${ids.length}`);
}

// Distinta de purgeOldConversations a propósito: esta borra todo, incluidas
// las que "necesitan un humano" y los mensajes más recientes.
export async function purgeAllConversations() {
  await requireSocioOrAdmin();
  await prisma.message.deleteMany({});
  const result = await prisma.conversation.deleteMany({});

  revalidatePath("/admin/asistente-ia");
  redirect(`/admin/asistente-ia?purgadas=${result.count}`);
}
