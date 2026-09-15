import type { MessagingProvider } from "@/lib/messaging/provider";

const GRAPH_API_VERSION = "v21.0";

/**
 * Los webhooks entrantes de Meta identifican a los celulares argentinos con
 * el "9" agregado despues del codigo de pais (ej. 5491136507943), pero para
 * enviar hay que sacarlo (5411...) - Meta lo vuelve a agregar solo. Sin este
 * ajuste, la respuesta se envia al mismo numero que escribio pero con el
 * formato que la propia Cloud API rechaza.
 */
function normalizeOutgoingNumber(to: string): string {
  if (/^549\d{10}$/.test(to)) {
    return "54" + to.slice(3);
  }
  return to;
}

/**
 * Envío real de WhatsApp vía la Cloud API de Meta (Fase 2 del MVP4). Misma
 * interfaz que el proveedor simulado — el resto del sistema (loop del
 * agente, historial, alertas) no cambia nada al pasar de un canal a otro.
 */
export class WhatsAppCloudProvider implements MessagingProvider {
  async sendMessage(to: string, text: string): Promise<void> {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    if (!phoneNumberId || !accessToken) {
      throw new Error(
        "WhatsApp no está configurado: definí WHATSAPP_PHONE_NUMBER_ID y WHATSAPP_ACCESS_TOKEN"
      );
    }

    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: normalizeOutgoingNumber(to),
          type: "text",
          text: { body: text },
        }),
      }
    );

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Error al enviar mensaje de WhatsApp (${response.status}): ${body}`);
    }
  }
}
