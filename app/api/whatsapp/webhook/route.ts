import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runAssistantTurn } from "@/lib/ai/assistant";
import { WhatsAppCloudProvider } from "@/lib/messaging/whatsappCloud";

/**
 * Handshake de verificación que pide Meta al configurar el webhook: si
 * `hub.verify_token` coincide con el nuestro, se responde el `hub.challenge`
 * tal cual para confirmar que este endpoint es nuestro.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

function verifySignature(rawBody: string, signatureHeader: string | null, appSecret: string): boolean {
  if (!signatureHeader) return false;
  const expected =
    "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  const signatureBuffer = Buffer.from(signatureHeader);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
}

type WhatsAppWebhookPayload = {
  entry?: {
    changes?: {
      value?: {
        messages?: {
          from: string;
          type: string;
          text?: { body?: string };
        }[];
        statuses?: {
          id: string;
          status: string;
          recipient_id: string;
          errors?: { code: number; title: string; message?: string }[];
        }[];
      };
    }[];
  }[];
};

/**
 * Webhook real de WhatsApp (Fase 2 del MVP4): sin sesión de usuario, la
 * autorización de este canal ES la verificación de firma de Meta (igual que
 * un webhook de Stripe) — ver `lib/ai/assistant.ts`.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) {
    console.error("WHATSAPP_APP_SECRET no está configurado");
    return new NextResponse("Not configured", { status: 500 });
  }
  const signature = request.headers.get("x-hub-signature-256");
  if (!verifySignature(rawBody, signature, appSecret)) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let payload: WhatsAppWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new NextResponse("Bad request", { status: 400 });
  }

  try {
    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        for (const status of change.value?.statuses ?? []) {
          console.log("WhatsApp status:", JSON.stringify(status));
        }
        for (const message of change.value?.messages ?? []) {
          // Por ahora solo texto libre; botones/listas interactivas quedan
          // para una iteración posterior de la Fase 2.
          if (message.type !== "text") continue;
          const text = message.text?.body?.trim();
          if (!text) continue;

          const conversation = await prisma.conversation.upsert({
            where: { channel_externalId: { channel: "WHATSAPP", externalId: message.from } },
            update: {},
            create: { channel: "WHATSAPP", externalId: message.from },
          });

          await runAssistantTurn(conversation.id, text, new WhatsAppCloudProvider());
        }
      }
    }
  } catch (error) {
    // Se responde 200 igual: si esto devuelve error, Meta reintenta el
    // mismo webhook varias veces, duplicando la conversación en la base.
    console.error("Error procesando webhook de WhatsApp:", error);
  }

  return new NextResponse("EVENT_RECEIVED", { status: 200 });
}
