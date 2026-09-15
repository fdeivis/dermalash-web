"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
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
  text: z.string().min(1, "Escribí un mensaje"),
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
