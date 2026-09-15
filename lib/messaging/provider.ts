import { prisma } from "@/lib/prisma";

/**
 * Interfaz común para enviar un mensaje de vuelta a un cliente, sin importar
 * el canal. El resto del sistema (loop del agente, historial, alertas)
 * llama siempre a `sendMessage(...)` sin saber qué canal es — así se evita
 * rediseñar nada al conectar WhatsApp real (Fase 2 del MVP4).
 */
export interface MessagingProvider {
  sendMessage(to: string, text: string): Promise<void>;
}

/**
 * Chat de prueba dentro del admin (Fase 1): no hay "envío" real, solo se
 * persiste el mensaje del asistente — la UI del admin lo lee directo de la
 * base al refrescar.
 */
export class SimulatedMessagingProvider implements MessagingProvider {
  constructor(private conversationId: string) {}

  async sendMessage(_to: string, text: string): Promise<void> {
    await prisma.message.create({
      data: { conversationId: this.conversationId, role: "ASSISTANT", content: text },
    });
  }
}
