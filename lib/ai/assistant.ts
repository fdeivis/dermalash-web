import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
// El helper betaZodTool del SDK tipa sus esquemas contra zod/v4 (el paquete
// "zod" 3.25+ trae v3 y v4 empaquetados); el resto del proyecto sigue usando
// zod v3 clásico para validar FormData, sin relación con esto.
import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import { peruToday, peruParts, addDaysUTC, fromPeruParts, endOfDay } from "@/lib/scheduling";
import {
  createAppointmentCore,
  rescheduleAppointmentCore,
  cancelAppointmentCore,
  getAvailableSlotsUnion,
  findAvailableProfessional,
} from "@/lib/appointments/service";
import { createAlert } from "@/lib/alerts";
import { getSystemAssistantUserId } from "@/lib/ai/systemUser";
import type { MessagingProvider } from "@/lib/messaging/provider";
import { WhatsAppCloudProvider } from "@/lib/messaging/whatsappCloud";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
const MAX_HISTORY_MESSAGES = 30;
const HISTORY_WINDOW_HOURS = 48;
const MAX_TOOL_ITERATIONS = 8;

const WEEKDAYS_ES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MONTHS_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

// `date` acá siempre es una fecha calendario NEUTRA (medianoche UTC que
// representa un día de Perú, ver peruToday/addDaysUTC) — nunca un instante
// real. Por eso se leen sus componentes con los getters UTC directos, no
// con `peruParts` (que resta 5 horas asumiendo un instante real; aplicado
// acá corría la fecha un día para atrás, generando un calendario de
// referencia con la clave "YYYY-MM-DD" desincronizada del día de semana
// mostrado en la misma fila — bug real encontrado al escribir un test).
function dateKeyOf(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
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
    `Hora de Perú. Calendario de referencia — úsalo para resolver cualquier fecha relativa ("hoy", "mañana", "el jueves que viene", etc.) sin calcularla tú: busca la fila que corresponda y usa ese "YYYY-MM-DD" tal cual en las tools. Nunca calcules una fecha a mano.`,
    ...rows,
  ].join("\n");
}

const SYSTEM_PROMPT = `Eres el asistente de WhatsApp de Dermalash, un centro estético en Lima, Perú.
Hablas español de Perú (tuteo: "tú", "tienes", "puedes" — NUNCA voseo argentino
como "vos", "tenés", "podés"), con un tono cálido, cercano y entusiasta — como
alguien de confianza que quiere que la clienta se anime a reservar, no como un
call center. Sin ser invasivo, siempre busca cerrar la conversación con una
reserva concretada.

Formato de los mensajes (son de WhatsApp, no un documento):
- Mensajes cortos. Nada de párrafos largos que junten todo: separa ideas distintas
  en líneas o bloques cortos, con saltos de línea entre cada una.
  Ej.: precio en una línea, duración en otra, pregunta de cierre en otra.
- Usa *asteriscos* para resaltar lo importante (precio, horario, nombre del
  servicio) — así se ve en negrita en WhatsApp. No uses markdown de otro tipo
  (nada de **doble asterisco**, headers con #, ni tablas).
- Para ofrecer disponibilidad, muestra los RANGOS que te devuelve
  "buscar_disponibilidad" (campo "rangos": bloques ya agrupados como
  {desde:"09:00", hasta:"12:00"}) — NUNCA desgloses un rango en cada horario
  suelto de 30 minutos. Un rango "9:00 a 12:00" significa que CUALQUIER hora
  dentro de ese bloque está libre; no hace falta (ni corresponde) listar
  9:00, 9:30, 10:00... como si fueran opciones separadas — eso es justo lo que
  NO hay que hacer, porque antes generaba listas incompletas que parecían
  excluir horarios que en realidad sí estaban libres.
- SIEMPRE incluí el nombre del mes junto con el día ("18 de septiembre", nunca
  solo "18") — sin el mes puede confundirse con otro mes cercano.
- Es OBLIGATORIO usar una lista numerada, un rango por renglón, con salto de
  línea real entre cada uno — nunca los juntes en una misma oración o
  párrafo. Si hay un solo rango ese día, igual muéstralo en su propio renglón,
  no hace falta numerarlo. Después de mostrar los rangos, pregúntale al
  cliente qué hora puntual prefiere dentro de alguno de ellos (no "elige un
  número": para rangos, el cliente dice la hora que quiere).

  Ejemplo con un solo día y un solo rango:

  Para el jueves 18 de septiembre tengo lugar de *9:00 a.m. a 1:00 p.m.*
  ¿Qué hora te queda mejor dentro de ese rango? 😊

  Ejemplo con un día con más de un rango (hueco entre 12 y 3 por turnos ya
  tomados) — lista numerada de rangos:

  Para el jueves 18 de septiembre tengo estos bloques libres:
  1. 9:00 a.m. a 12:00 p.m.
  2. 3:00 p.m. a 6:00 p.m.
  ¿Cuál bloque te acomoda, y a qué hora dentro de ese rango? 😊

  Ejemplo con varios días — un encabezado en *negrita* por día, y los rangos
  de ESE día debajo, nunca todo mezclado en una sola lista ni en un párrafo:

  Estos son los bloques disponibles:

  *Martes 15 de septiembre*
  9:00 a.m. a 12:00 p.m.

  *Miércoles 16 de septiembre*
  1. 9:00 a.m. a 11:00 a.m.
  2. 2:00 p.m. a 6:00 p.m.

  ¿Qué día y horario te queda mejor? 😊
- Cuando el cliente responda con una hora puntual, úsala directo en
  "crear_turno"/"reprogramar_turno" (esas tools validan de nuevo que siga
  libre) — no hace falta volver a llamar "buscar_disponibilidad" salvo que
  haya pasado bastante en la conversación o el cliente pida otro día.
- Emojis con moderación, para dar calidez (😊, 💆, ✨), no en cada palabra.

Tu alcance es EXCLUSIVAMENTE:
- Informar sobre servicios y promociones vigentes (incluida la descripción de cada
  servicio: para eso está, compártela con gusto para entusiasmar a la clienta).
- Reservar, reprogramar o cancelar turnos.

Fuera de tu alcance (usa la tool "derivar_a_humano" si el cliente insiste):
- Preguntas clínicas puntuales (si le conviene el tratamiento dado algo de su
  salud, contraindicaciones, qué tan seguro es en su caso particular, resultados
  esperados en su situación). Para esto NO es que "no puedes ayudar" — al
  contrario: es la oportunidad perfecta para invitarla a reservar, porque en la
  consulta nuestras especialistas le van a resolver eso personalmente. Nunca lo
  frenes como un rechazo; encamínalo hacia la reserva.
- Negociar precios distintos a los publicados.
- Quejas, reclamos o pedidos de reembolso.
- Cualquier otro tema no relacionado a los servicios/turnos de Dermalash.

Información interna que NUNCA le muestras al cliente:
- Qué esteticista está libre u ocupada en un horario, ni quién la va a atender.
  Eso lo decide el sistema solo; el cliente elige un horario, no una persona.
  "buscar_disponibilidad" y "crear_turno"/"reprogramar_turno" ya están armadas
  para que nunca necesites mencionar ni pedir el nombre de ninguna esteticista.

Reglas estrictas:
- NUNCA inventes un precio, duración, descripción, promoción u horario libre que
  no haya salido de una tool llamada en este mismo turno. Si no tienes el dato,
  llama a la tool correspondiente antes de responder. Esto incluye el saludo
  inicial: NUNCA listes nombres de servicios de ejemplo ("depilación láser",
  "masajes", etc.) para orientar al cliente sobre qué preguntar — como no
  salen de "obtener_catalogo", pueden no existir realmente en Dermalash. Un
  saludo inicial va sin ejemplos de servicios, simplemente preguntando en qué
  puede ayudar.
- Antes de mencionar cualquier precio, duración, descripción o promoción, llama a
  "obtener_catalogo". Si hay una promoción vigente para el servicio del que estás
  hablando, menciónala. Si NO hay ninguna, no lo aclares ("no hay promociones
  vigentes" suena raro) — simplemente no digas nada sobre promociones, salvo que
  el cliente pregunte explícitamente si hay descuentos u ofertas.
- Antes de ofrecer un horario, llama a "buscar_disponibilidad" — nunca supongas que
  un horario está libre. Esta tool no recibe ninguna fecha como parámetro: siempre
  devuelve los próximos días con lugar libre, cada uno con su propia "fecha" y
  "diaSemana". Tú eliges de esa lista cuál corresponde a lo que pidió el cliente
  (comparando contra el calendario de referencia del contexto) — nunca le pases
  una fecha calculada por ti a esta tool, porque no la acepta.
- Antes de confirmar un horario con "crear_turno" o "reprogramar_turno", fíjate que
  la "fecha" que vas a mandarle sea exactamente la del bloque de
  "buscar_disponibilidad" que le mostraste al cliente — cópiala tal cual, no la
  recalcules de memoria.
- No existe la posibilidad de forzar un turno fuera de horario o en un feriado: si
  "crear_turno"/"reprogramar_turno" devuelven ese error, ofrece otra franja horaria
  con "buscar_disponibilidad" o deriva a un humano si el cliente insiste.
- Si "crear_turno"/"reprogramar_turno" devuelven "horario-no-disponible", es porque
  se ocupó justo en este momento: vuelve a llamar "buscar_disponibilidad" y ofrece
  otra franja, sin decirle al cliente el motivo técnico.
- Si una tool de escritura falla, no reintentes con los mismos datos: explica el
  motivo (en términos simples, nunca técnicos) y ofrece una alternativa.
- Para agendar, reprogramar, cancelar o consultar turnos, primero necesitas saber
  quién es el cliente: si no lo identificaste todavía, pide nombre, apellido Y
  número de documento de identidad (DNI o carné de extranjería) EN LA MISMA
  pregunta, y llama a "identificar_o_crear_cliente" con los tres datos — el
  documento es lo único que evita crear un cliente duplicado cuando hay más de
  una persona con el mismo nombre, así que es obligatorio, no opcional. Nunca
  asumas que ya lo tienes identificado solo porque te dijo el nombre, hasta que la
  tool confirme.
- Si "identificar_o_crear_cliente" devuelve "varios-clientes-mismo-nombre", hay más
  de una persona con ese nombre y no puedes adivinar cuál es sin arriesgarte a
  mezclar el historial de dos clientes distintos: deriva directo a un humano con
  "derivar_a_humano", explicando la situación — no reintentes con los mismos datos.
- Las fechas que recibes de las tools están en formato "YYYY-MM-DD" y las horas en
  "HH:MM" (24 horas); al hablarle al cliente, conviértelas a lenguaje natural en
  hora de Perú, SIEMPRE con el nombre del mes (ej. "jueves 18 de septiembre a las
  3:00 p.m."), nunca solo el número de día.
- NUNCA calcules a mano qué fecha es "mañana", "el jueves que viene", etc. — en el
  contexto tienes un calendario de referencia con la fecha exacta de cada día;
  úsalo solo para IDENTIFICAR qué día pidió el cliente (para poder reconocerlo
  después en los resultados de "buscar_disponibilidad"), nunca para construir un
  parámetro de fecha a mano. Si no estás seguro de qué día pidió el cliente,
  pregúntaselo antes de buscar disponibilidad — no asumas.
- Ante cualquier duda de si algo entra en tu alcance, prefiere derivar a un humano
  antes que improvisar.
- Nunca insistas más de dos veces con el mismo pedido (el mismo dato, la misma
  pregunta) si no estás logrando avanzar — ni sigas pidiéndole al cliente algo que
  ya te dio. Si al segundo intento sigues sin poder resolverlo (no encuentras al
  cliente, una tool sigue fallando, no entiendes qué te pide), corta ahí: avísale
  amablemente que en breve lo contacta alguien del equipo y llama a
  "derivar_a_humano" explicando el problema puntual — no repitas la misma
  pregunta una tercera vez.`;

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

/**
 * Ademas de la alerta pasiva en el panel, se le avisa al equipo por WhatsApp
 * en el momento — la bandeja de alertas solo se ve si alguien entra a
 * mirarla, y una consulta derivada a un humano es por definicion algo que el
 * cliente esta esperando que se resuelva pronto.
 */
async function notifyStaffHandoff(motivo: string): Promise<void> {
  const staffNumbers = (process.env.WHATSAPP_ALERT_NUMBERS || "")
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
  if (staffNumbers.length === 0) return;

  const provider = new WhatsAppCloudProvider();
  const text = `Un cliente necesita atencion humana en el asistente de WhatsApp:\n${motivo}`;
  await Promise.all(
    staffNumbers.map((number) =>
      provider.sendMessage(number, text).catch((error) => {
        console.error(`No se pudo avisar por WhatsApp a ${number}:`, error);
      })
    )
  );
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
          descripcion: s.description,
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
      'Devuelve, para un conjunto de servicios, los próximos días con franjas horarias realmente libres (en base a la agenda real: horarios de trabajo, ausencias y turnos ya tomados de TODO el equipo — un horario aparece como libre si al menos una esteticista puede atenderlo, sin decir cuál). Cada día trae "rangos": bloques continuos ya agrupados (ej. {desde:"09:00", hasta:"12:00"}) — dentro de un rango, CUALQUIER horario que pida el cliente en pasos de 30 minutos está libre, no hace falta desglosarlo. No recibe ninguna fecha como parámetro — siempre trae los próximos 10 días con lugar, cada uno con su "fecha" (YYYY-MM-DD) y "diaSemana". Busca tú, en esa lista, el día que corresponda a lo que pidió el cliente (comparándolo con el calendario de referencia del contexto). Llamar siempre antes de ofrecer un horario.',
    inputSchema: z.object({
      serviceIds: z.array(z.string()).describe("ids de servicio devueltos por obtener_catalogo"),
    }),
    run: async (input) => {
      const result = await getAvailableSlotsUnion({ serviceIds: input.serviceIds });
      if (!result.ok) return JSON.stringify({ error: result.error });
      return JSON.stringify({
        disponibilidad: result.days.map((d) => ({
          fecha: d.date,
          diaSemana: d.weekday,
          rangos: d.ranges,
        })),
      });
    },
  });

  const consultarTurnosCliente = betaZodTool({
    name: "consultar_turnos_cliente",
    description:
      "Lista los turnos futuros (reservados o confirmados) del cliente ya identificado en esta conversación, con sus servicioIds — llamar antes de reprogramar_turno o cancelar_turno para tener el appointmentId y los servicioIds correctos.",
    inputSchema: z.object({}),
    run: async () => {
      if (!clientState.id) {
        return JSON.stringify({ error: "cliente-no-identificado" });
      }
      const appointments = await prisma.appointment.findMany({
        where: { clientId: clientState.id, status: { in: ["RESERVADO", "CONFIRMADO"] }, startAt: { gte: new Date() } },
        include: { services: { include: { service: true } } },
        orderBy: { startAt: "asc" },
      });
      return JSON.stringify({
        turnos: appointments.map((a) => ({
          id: a.id,
          fecha: a.startAt.toISOString().slice(0, 10),
          hora: `${peruParts(a.startAt).hour.toString().padStart(2, "0")}:${peruParts(a.startAt).minute.toString().padStart(2, "0")}`,
          servicios: a.services.map((s) => s.service.name),
          servicioIds: a.services.map((s) => s.serviceId),
        })),
      });
    },
  });

  const identificarOCrearCliente = betaZodTool({
    name: "identificar_o_crear_cliente",
    description:
      "Busca al cliente por documento de identidad (prioridad) o por nombre y apellido, y si no existe lo registra. Llamar solo después de pedirle nombre, apellido Y número de documento (DNI o carné de extranjería) — el documento es lo que evita crear un cliente duplicado cuando hay más de una persona con el mismo nombre.",
    inputSchema: z.object({
      nombre: z.string().min(1),
      apellido: z.string().min(1),
      documentoIdentidad: z.string().min(1).describe("DNI o carné de extranjería, tal cual lo dio el cliente"),
    }),
    run: async (input) => {
      // El documento es la clave confiable: si ya existe alguien con ese
      // documento, es la misma persona sin importar variaciones en el
      // nombre (apodos, con/sin segundo nombre, tildes distintas).
      const byDocument = await prisma.client.findFirst({
        where: { documentId: input.documentoIdentidad },
      });
      if (byDocument) {
        if (!byDocument.whatsapp) {
          await prisma.client.update({ where: { id: byDocument.id }, data: { whatsapp: externalId } });
        }
        clientState.id = byDocument.id;
        return JSON.stringify({ ok: true, clientId: byDocument.id, encontrado: true });
      }

      // Sin coincidencia por documento, se busca por nombre — pero el
      // documento sigue siendo el criterio final para no confundir a dos
      // personas con el mismo nombre.
      const nameMatches = await prisma.client.findMany({
        where: {
          firstName: { equals: input.nombre, mode: "insensitive" },
          lastName: { equals: input.apellido, mode: "insensitive" },
        },
      });

      // De los que coinciden en nombre, solo sirve uno que no tenga ya
      // OTRO documento cargado (si ya tiene uno distinto, es una persona
      // distinta que casualmente se llama igual).
      const compatible = nameMatches.filter((c) => !c.documentId || c.documentId === input.documentoIdentidad);

      if (compatible.length === 1) {
        if (!compatible[0].whatsapp || !compatible[0].documentId) {
          await prisma.client.update({
            where: { id: compatible[0].id },
            data: {
              whatsapp: compatible[0].whatsapp ?? externalId,
              documentId: compatible[0].documentId ?? input.documentoIdentidad,
            },
          });
        }
        clientState.id = compatible[0].id;
        return JSON.stringify({ ok: true, clientId: compatible[0].id, encontrado: true });
      }

      if (compatible.length > 1) {
        // Mismo nombre y ninguno tiene el documento cargado todavía: no se
        // puede saber cuál es sin arriesgarse a mezclar historiales.
        return JSON.stringify({ error: "varios-clientes-mismo-nombre" });
      }

      // Nadie compatible por nombre tampoco: es un cliente nuevo de
      // verdad (aunque haya otros con ese documento... no, eso ya se
      // descartó arriba; y si hay otros con ese nombre pero con OTRO
      // documento, son personas distintas — se crea aparte).
      const systemUserId = await getSystemAssistantUserId();
      const client = await prisma.client.create({
        data: {
          firstName: input.nombre,
          lastName: input.apellido,
          documentId: input.documentoIdentidad,
          whatsapp: externalId,
          source: "WHATSAPP",
          createdByUserId: systemUserId,
        },
      });
      clientState.id = client.id;
      return JSON.stringify({ ok: true, clientId: client.id, encontrado: false });
    },
  });

  const crearTurno = betaZodTool({
    name: "crear_turno",
    description:
      "Crea un turno para el cliente ya identificado, en un horario que ya salió de buscar_disponibilidad. Asigna la esteticista internamente — no recibe ni expone profesional. No existe la opción de forzar fuera de horario: si falla por horario/feriado, ofrecer otra franja con buscar_disponibilidad. Rechaza fechas pasadas (error 'fecha-en-el-pasado').",
    inputSchema: z.object({
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
      // Qué esteticista atiende es información interna: el modelo nunca la
      // pide ni la ve, se resuelve acá mismo justo antes de crear el turno
      // (por si cambió algo entre que se mostró la disponibilidad y ahora).
      const assigned = await findAvailableProfessional({
        serviceIds: input.serviceIds,
        date: input.fecha,
        startTime: input.horaInicio,
      });
      if (!assigned) return JSON.stringify({ error: "horario-no-disponible" });

      const systemUserId = await getSystemAssistantUserId();
      const result = await createAppointmentCore({
        clientId: clientState.id,
        professionalId: assigned.professionalId,
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
    description:
      "Reprograma un turno existente del cliente a otra fecha/hora, en un horario que ya salió de buscar_disponibilidad. Asigna la esteticista internamente, igual que crear_turno.",
    inputSchema: z.object({
      appointmentId: z.string(),
      serviceIds: z.array(z.string()).min(1).describe("los mismos servicios del turno original"),
      fecha: z.string().describe('"YYYY-MM-DD"'),
      horaInicio: z.string().describe('"HH:MM", 24 horas'),
    }),
    run: async (input) => {
      const assigned = await findAvailableProfessional({
        serviceIds: input.serviceIds,
        date: input.fecha,
        startTime: input.horaInicio,
      });
      if (!assigned) return JSON.stringify({ error: "horario-no-disponible" });

      const result = await rescheduleAppointmentCore(input.appointmentId, {
        professionalId: assigned.professionalId,
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
      await notifyStaffHandoff(input.motivo);
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
        .trim() || "Disculpa, ¿puedes reformular tu mensaje?";
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

  // Se persiste ACA (no en el provider) para que ningun canal pueda
  // "olvidarse" de guardar su propia respuesta — si no queda guardada, el
  // siguiente turno reconstruye el historial sin ella y el modelo pierde
  // la memoria de lo que ya dijo.
  await prisma.message.create({ data: { conversationId, role: "ASSISTANT", content: replyText } });
  await provider.sendMessage(conversation.externalId, replyText);
}
