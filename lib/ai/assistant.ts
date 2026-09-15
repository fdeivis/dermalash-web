import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
// El helper betaZodTool del SDK tipa sus esquemas contra zod/v4 (el paquete
// "zod" 3.25+ trae v3 y v4 empaquetados); el resto del proyecto sigue usando
// zod v3 clásico para validar FormData, sin relación con esto.
import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import { peruToday, peruParts, professionalLabel, addDaysUTC, fromPeruParts, endOfDay } from "@/lib/scheduling";
import {
  createAppointmentCore,
  rescheduleAppointmentCore,
  cancelAppointmentCore,
  getAvailableSlots,
  getSchedulableProfessionals,
} from "@/lib/appointments/service";
import { createAlert } from "@/lib/alerts";
import { getSystemAssistantUserId } from "@/lib/ai/systemUser";
import type { MessagingProvider } from "@/lib/messaging/provider";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
const MAX_HISTORY_MESSAGES = 30;
const HISTORY_WINDOW_HOURS = 48;
const MAX_TOOL_ITERATIONS = 8;

const WEEKDAYS_ES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MONTHS_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function dateKeyOf(date: Date) {
  const { year, month, day } = peruParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// El modelo no tiene reloj propio y calcular a mano "mañana" o "el jueves
// que viene" a partir de una sola fecha es propenso a error (confirmado en
// pruebas: agendó un turno para el año pasado, y otra vez le dijo "mañana"
// a un cliente sobre el turno de HOY). En vez de pedirle que haga la
// aritmética, se le da ya resuelto un calendario de los próximos 10 días
// con su día de semana — solo tiene que leer la fila que corresponda, no
// calcular nada. Va en un bloque de `system` aparte, después del bloque
// cacheado, para no invalidar el cache de las instrucciones estáticas con
// algo que cambia todos los días.
function peruTodayContext(): string {
  const today = peruToday();
  const rows: string[] = [];
  for (let i = 0; i < 10; i++) {
    const d = addDaysUTC(today, i);
    const label = i === 0 ? "hoy" : i === 1 ? "mañana" : WEEKDAYS_ES[d.getUTCDay()];
    rows.push(`${dateKeyOf(d)} = ${label} (${WEEKDAYS_ES[d.getUTCDay()]} ${d.getUTCDate()} de ${MONTHS_ES[d.getUTCMonth()]})`);
  }
  return [
    `Hora de Perú. Calendario de referencia — usalo para resolver cualquier fecha relativa ("hoy", "mañana", "el jueves que viene", etc.) sin calcularla vos: buscá la fila que corresponda y usá ese "YYYY-MM-DD" tal cual en las tools. Nunca calcules una fecha a mano.`,
    ...rows,
  ].join("\n");
}

const SYSTEM_PROMPT = `Sos el asistente de WhatsApp de Dermalash, un centro estético en Lima, Perú.
Hablás español de Perú, en mensajes cortos como los de WhatsApp (sin markdown pesado, sin tablas).

Tu alcance es EXCLUSIVAMENTE:
- Informar sobre servicios y promociones vigentes.
- Reservar, reprogramar o cancelar turnos.

Fuera de tu alcance (usá la tool "derivar_a_humano" si el cliente insiste):
- Consejos médicos, diagnósticos o recomendaciones de tratamiento.
- Negociar precios distintos a los publicados.
- Quejas, reclamos o pedidos de reembolso.
- Cualquier otro tema no relacionado a agendar turnos en Dermalash.

Reglas estrictas:
- NUNCA inventes un precio, duración, horario libre o nombre de profesional que no
  haya salido de una tool llamada en este mismo turno. Si no tenés el dato, llamá
  a la tool correspondiente antes de responder.
- Antes de mencionar cualquier precio, duración o promoción, llamá a "obtener_catalogo".
- Antes de ofrecer un horario, llamá a "buscar_disponibilidad" — nunca supongas que
  un horario está libre. Esta tool no recibe ninguna fecha como parámetro: siempre
  devuelve los próximos días con lugar libre, cada uno con su propia "fecha" y
  "diaSemana". Vos elegís de esa lista cuál corresponde a lo que pidió el cliente
  (comparando contra el calendario de referencia del contexto) — nunca le pases
  una fecha calculada por vos a esta tool, porque no la acepta.
- Antes de confirmar un horario con "crear_turno" o "reprogramar_turno", fijate que
  la "fecha" que vas a mandarle sea exactamente la del bloque de
  "buscar_disponibilidad" que le mostraste al cliente — copiala tal cual, no la
  recalcules de memoria.
- No existe la posibilidad de forzar un turno fuera de horario o en un feriado: si
  "crear_turno"/"reprogramar_turno" devuelven ese error, ofrecé otra franja horaria
  con "buscar_disponibilidad" o derivá a un humano si el cliente insiste.
- Si una tool de escritura falla, no reintentes con los mismos datos: explicá el
  motivo y ofrecé una alternativa.
- Para agendar, primero necesitás saber quién es el cliente: si no lo identificaste
  todavía, pedí nombre y apellido y llamá a "identificar_o_crear_cliente".
- Las fechas que recibís de las tools están en formato "YYYY-MM-DD" y las horas en
  "HH:MM" (24 horas); al hablarle al cliente, convertilas a lenguaje natural en hora
  de Perú (ej. "jueves 18 de septiembre a las 3:00 p.m.").
- NUNCA calcules a mano qué fecha es "mañana", "el jueves que viene", etc. — en el
  contexto tenés un calendario de referencia con la fecha exacta de cada día; usalo
  solo para IDENTIFICAR qué día pidió el cliente (para poder reconocerlo después en
  los resultados de "buscar_disponibilidad"), nunca para construir un parámetro de
  fecha a mano. Si no estás seguro de qué día pidió el cliente, preguntaselo antes
  de buscar disponibilidad — no asumas.
- Ante cualquier duda de si algo entra en tu alcance, preferí derivar a un humano
  antes que improvisar.`;

type ClientState = { id: string | null };

async function resolveClientByWhatsapp(externalId: string): Promise<string | null> {
  const client = await prisma.client.findFirst({ where: { whatsapp: externalId } });
  if (client) return client.id;

  // Si tiene el mismo número en `phone` pero no en `whatsapp`, se autocompleta
  // en vez de tratarlo como un cliente nuevo (evita duplicados).
  const byPhone = await prisma.client.findFirst({ where: { phone: externalId, whatsapp: null } });
  if (byPhone) {
    await prisma.client.update({ where: { id: byPhone.id }, data: { whatsapp: externalId } });
    return byPhone.id;
  }
  return null;
}

function buildTools(opts: {
  externalId: string;
  clientState: ClientState;
  conversationId: string;
}) {
  const { externalId, clientState } = opts;

  const obtenerCatalogo = betaZodTool({
    name: "obtener_catalogo",
    description:
      "Devuelve los servicios publicados y las promociones vigentes hoy, con precios y duraciones reales. Llamar siempre antes de mencionar cualquier precio, duración o promoción — nunca inventar esos datos.",
    inputSchema: z.object({}),
    run: async () => {
      // Mismo criterio que ya usa el resto del sitio (ej. sesiones/nuevo)
      // para "promoción vigente hoy": comparar contra el día completo de
      // Perú, no contra un instante exacto — si no, una promo cuyo
      // startDate/endDate se guardó como medianoche UTC puede quedar
      // afuera por unas horas de diferencia de huso horario.
      const today = peruToday();
      const [services, promotions] = await Promise.all([
        prisma.service.findMany({ where: { status: "PUBLISHED" }, orderBy: { order: "asc" } }),
        prisma.promotion.findMany({
          where: { status: "PUBLISHED", startDate: { lte: endOfDay(today) }, endDate: { gte: today } },
          include: { services: true },
        }),
      ]);
      return JSON.stringify({
        servicios: services.map((s) => ({
          id: s.id,
          nombre: s.name,
          precio: Number(s.price),
          precioDesde: s.priceFrom,
          duracionMinutos: s.durationMinutes,
        })),
        promociones: promotions.map((p) => ({
          id: p.id,
          nombre: p.name,
          precioPromo: p.promoPrice ? Number(p.promoPrice) : null,
          servicioIds: p.services.map((s) => s.id),
          vigenteHasta: p.endDate.toISOString().slice(0, 10),
        })),
      });
    },
  });

  const buscarDisponibilidad = betaZodTool({
    name: "buscar_disponibilidad",
    description:
      'Devuelve, para un conjunto de servicios, los próximos días con franjas horarias realmente libres (en base a la agenda real: horarios de trabajo, ausencias y turnos ya tomados). No recibe ninguna fecha como parámetro — siempre trae los próximos 10 días con lugar, cada uno con su "fecha" (YYYY-MM-DD) y "diaSemana". Buscá vos, en esa lista, el día que corresponda a lo que pidió el cliente (comparándolo con el calendario de referencia del contexto). Llamar siempre antes de ofrecer un horario.',
    inputSchema: z.object({
      serviceIds: z.array(z.string()).describe("ids de servicio devueltos por obtener_catalogo"),
      professionalId: z.string().optional().describe("opcional: limitar a un profesional específico"),
    }),
    run: async (input) => {
      const result = await getAvailableSlots({
        serviceIds: input.serviceIds,
        professionalId: input.professionalId,
      });
      if (!result.ok) return JSON.stringify({ error: result.error });
      return JSON.stringify({
        disponibilidad: result.days.map((d) => ({
          fecha: d.date,
          diaSemana: d.weekday,
          profesionalId: d.professionalId,
          profesional: d.professionalName,
          horarios: d.slots,
        })),
      });
    },
  });

  const consultarTurnosCliente = betaZodTool({
    name: "consultar_turnos_cliente",
    description:
      "Lista los turnos futuros (reservados o confirmados) del cliente ya identificado en esta conversación.",
    inputSchema: z.object({}),
    run: async () => {
      if (!clientState.id) {
        return JSON.stringify({ error: "cliente-no-identificado" });
      }
      const appointments = await prisma.appointment.findMany({
        where: { clientId: clientState.id, status: { in: ["RESERVADO", "CONFIRMADO"] }, startAt: { gte: new Date() } },
        include: { professional: true, services: { include: { service: true } } },
        orderBy: { startAt: "asc" },
      });
      return JSON.stringify({
        turnos: appointments.map((a) => ({
          id: a.id,
          fecha: a.startAt.toISOString().slice(0, 10),
          hora: `${peruParts(a.startAt).hour.toString().padStart(2, "0")}:${peruParts(a.startAt).minute.toString().padStart(2, "0")}`,
          profesional: professionalLabel(a.professional),
          servicios: a.services.map((s) => s.service.name),
        })),
      });
    },
  });

  const identificarOCrearCliente = betaZodTool({
    name: "identificar_o_crear_cliente",
    description:
      "Registra al cliente cuando todavía no está identificado en esta conversación. Solo llamar después de pedirle nombre y apellido.",
    inputSchema: z.object({
      nombre: z.string().min(1),
      apellido: z.string().min(1),
    }),
    run: async (input) => {
      const systemUserId = await getSystemAssistantUserId();
      const client = await prisma.client.create({
        data: {
          firstName: input.nombre,
          lastName: input.apellido,
          whatsapp: externalId,
          createdByUserId: systemUserId,
        },
      });
      clientState.id = client.id;
      return JSON.stringify({ ok: true, clientId: client.id });
    },
  });

  const crearTurno = betaZodTool({
    name: "crear_turno",
    description:
      "Crea un turno para el cliente ya identificado. No existe la opción de forzar fuera de horario: si falla por horario/feriado, ofrecer otra franja con buscar_disponibilidad. Rechaza fechas pasadas (error 'fecha-en-el-pasado').",
    inputSchema: z.object({
      professionalId: z.string(),
      serviceIds: z.array(z.string()).min(1),
      fecha: z.string().describe('"YYYY-MM-DD"'),
      horaInicio: z.string().describe('"HH:MM", 24 horas'),
      notas: z.string().optional(),
    }),
    run: async (input) => {
      if (!clientState.id) return JSON.stringify({ error: "cliente-no-identificado" });
      // Resguardo del lado del servidor, no solo del prompt: la IA nunca
      // puede crear un turno en el pasado (a diferencia del panel admin,
      // que sí puede necesitarlo para cargar algo a mano).
      const [year, month, day] = input.fecha.split("-").map(Number);
      const [hour, minute] = input.horaInicio.split(":").map(Number);
      const requestedStart = fromPeruParts(year, month, day, hour, minute);
      if (requestedStart <= new Date()) {
        return JSON.stringify({ error: "fecha-en-el-pasado" });
      }
      const systemUserId = await getSystemAssistantUserId();
      const result = await createAppointmentCore({
        clientId: clientState.id,
        professionalId: input.professionalId,
        serviceIds: input.serviceIds,
        date: input.fecha,
        startTime: input.horaInicio,
        notes: input.notas,
        createdByUserId: systemUserId,
        source: "WHATSAPP",
      });
      if (!result.ok) return JSON.stringify({ error: result.error });
      const { appointment } = result;
      await createAlert(
        "TURNO_CREADO",
        `Turno creado por WhatsApp para ${appointment.client.firstName} ${appointment.client.lastName}`,
        appointment.id,
        "WHATSAPP"
      );
      return JSON.stringify({ ok: true, appointmentId: appointment.id });
    },
  });

  const reprogramarTurno = betaZodTool({
    name: "reprogramar_turno",
    description: "Reprograma un turno existente del cliente a otra fecha/hora u otro profesional.",
    inputSchema: z.object({
      appointmentId: z.string(),
      professionalId: z.string(),
      fecha: z.string().describe('"YYYY-MM-DD"'),
      horaInicio: z.string().describe('"HH:MM", 24 horas'),
    }),
    run: async (input) => {
      const result = await rescheduleAppointmentCore(input.appointmentId, {
        professionalId: input.professionalId,
        date: input.fecha,
        startTime: input.horaInicio,
      });
      if (!result.ok) return JSON.stringify({ error: result.error });
      const { appointment } = result;
      await createAlert(
        "TURNO_MODIFICADO",
        `Turno de ${appointment.client.firstName} ${appointment.client.lastName} reprogramado por WhatsApp`,
        appointment.id,
        "WHATSAPP"
      );
      return JSON.stringify({ ok: true });
    },
  });

  const cancelarTurno = betaZodTool({
    name: "cancelar_turno",
    description: "Cancela un turno del cliente. No se puede cancelar un turno que ya tiene una factura registrada.",
    inputSchema: z.object({
      appointmentId: z.string(),
      motivo: z.string().optional(),
    }),
    run: async (input) => {
      const result = await cancelAppointmentCore(input.appointmentId, { reason: input.motivo });
      if (!result.ok) return JSON.stringify({ error: result.error });
      const { appointment } = result;
      await createAlert(
        "TURNO_CANCELADO",
        `Turno de ${appointment.client.firstName} ${appointment.client.lastName} cancelado por WhatsApp`,
        appointment.id,
        "WHATSAPP"
      );
      return JSON.stringify({ ok: true });
    },
  });

  const derivarAHumano = betaZodTool({
    name: "derivar_a_humano",
    description: "Marca la conversación para que la atienda un humano y avisa al equipo. Usar ante cualquier pedido fuera de tu alcance.",
    inputSchema: z.object({ motivo: z.string() }),
    run: async (input) => {
      await prisma.conversation.update({
        where: { id: opts.conversationId },
        data: { status: "NEEDS_HUMAN" },
      });
      await createAlert("CONSULTA_DERIVADA", `Conversación de WhatsApp derivada a un humano: ${input.motivo}`, undefined, "WHATSAPP");
      return JSON.stringify({ ok: true });
    },
  });

  return [
    obtenerCatalogo,
    buscarDisponibilidad,
    consultarTurnosCliente,
    identificarOCrearCliente,
    crearTurno,
    reprogramarTurno,
    cancelarTurno,
    derivarAHumano,
  ];
}

/**
 * Punto de entrada único del agente, sin conocimiento de autenticación: la
 * autorización la resuelve cada canal (permiso de admin en el chat
 * simulado, verificación de firma de Meta en el webhook real de la Fase 2).
 */
export async function runAssistantTurn(
  conversationId: string,
  userMessage: string,
  provider: MessagingProvider
): Promise<void> {
  const conversation = await prisma.conversation.findUniqueOrThrow({ where: { id: conversationId } });

  await prisma.message.create({ data: { conversationId, role: "USER", content: userMessage } });
  await prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } });

  let clientId = conversation.clientId;
  if (!clientId) {
    clientId = await resolveClientByWhatsapp(conversation.externalId);
    if (clientId) {
      await prisma.conversation.update({ where: { id: conversationId }, data: { clientId } });
    }
  }
  const clientState: ClientState = { id: clientId };

  const cutoff = new Date(Date.now() - HISTORY_WINDOW_HOURS * 3600_000);
  const history = await prisma.message.findMany({
    where: { conversationId, createdAt: { gte: cutoff } },
    orderBy: { createdAt: "asc" },
    take: MAX_HISTORY_MESSAGES,
  });

  const messages: Anthropic.MessageParam[] = history.map((m) => ({
    role: m.role === "ASSISTANT" ? "assistant" : "user",
    content: m.content,
  }));

  const client = new Anthropic();
  const tools = buildTools({ externalId: conversation.externalId, clientState, conversationId });

  let replyText: string;
  try {
    const runner = client.beta.messages.toolRunner({
      model: MODEL,
      max_tokens: 1024,
      system: [
        { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
        { type: "text", text: peruTodayContext() },
      ],
      output_config: { effort: "medium" },
      tools,
      messages,
      max_iterations: MAX_TOOL_ITERATIONS,
    });
    // Se audita cada tool_use que pide el modelo (no solo el resultado
    // final): es la única forma de revisar después por qué contestó algo
    // — necesario mientras se valida el prompt contra casos reales, y
    // deseable en producción por trazabilidad (sección 3.1 del diseño
    // funcional exige poder auditar toda acción administrativa).
    for await (const message of runner) {
      for (const block of message.content) {
        if (block.type === "tool_use") {
          console.log(`[asistente-ia] conv=${conversationId} tool_use ${block.name}`, JSON.stringify(block.input));
        }
      }
    }
    const finalMessage = await runner.done();
    replyText =
      finalMessage.content
        .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim() || "Disculpá, ¿podés reformular tu mensaje?";
  } catch (error) {
    console.error("Error en el asistente de IA:", error);
    replyText = "Perdón, tuve un problema técnico. En breve te contacta alguien del equipo.";
    await createAlert(
      "CONSULTA_DERIVADA",
      `Error del asistente de IA en una conversación: ${error instanceof Error ? error.message : String(error)}`,
      undefined,
      conversation.channel === "WHATSAPP" ? "WHATSAPP" : "MANUAL"
    );
  }

  if (clientState.id && clientState.id !== conversation.clientId) {
    await prisma.conversation.update({ where: { id: conversationId }, data: { clientId: clientState.id } });
  }

  await provider.sendMessage(conversation.externalId, replyText);
}
