import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { professionalLabel, peruParts, peruToday, endOfDay } from "@/lib/scheduling";
import { requirePagePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { resolveBookingPriceSnapshot } from "@/lib/pricing";
import { getBookableServices } from "@/lib/content";
import { SessionForm } from "@/components/admin/SessionForm";
import { createClientSession, getClientOpenAppointments } from "../actions";

// Las listas de clientes/profesionales/servicios/promociones deben reflejar
// siempre el estado actual: crear un cliente, un servicio o una promoción
// nueva no revalida esta página (mismo caso que /admin/promociones/nuevo).
export const dynamic = "force-dynamic";

// `date` acá es el startAt real del turno: se lee en hora de Perú.
function toDateTimeLocal(date: Date) {
  const { year, month, day, hour, minute } = peruParts(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}`;
}

const ERROR_LABEL: Record<string, string> = {
  "datos-invalidos": "Revisá los datos: falta elegir cliente, profesional, fecha, medio de pago o algún servicio.",
  "descuento-sin-motivo": "Si aplicás un descuento, indicá el motivo.",
};

function formatVigencia(date: Date) {
  return date.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default async function NuevaSesionPage({
  searchParams,
}: {
  searchParams: Promise<{ appointmentId?: string; clientId?: string; error?: string }>;
}) {
  const session = await requirePagePermission("sesiones.crear");
  const canApplyDiscount = await hasPermission(session.user.role, "sesiones.aplicar_descuento");
  const { appointmentId, clientId: clientIdParam, error } = await searchParams;

  // Una factura ya no requiere partir de un turno: puede emitirse suelta
  // para cualquier cliente. Si viene con `appointmentId` (desde la Agenda o
  // el detalle de un turno) se sigue precargando todo desde ahí, como antes.
  const appointment = appointmentId
    ? await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          services: { include: { service: true, promotionAtBooking: true } },
          client: true,
          professional: true,
        },
      })
    : null;
  if (appointmentId && !appointment) redirect("/admin/agenda");

  // Comparativo "cotizado al reservar" vs "precio actual", para que quien
  // cobra vea si algo cambió (precio o vigencia de promo) desde que se
  // reservó el turno — nunca se ajusta nada solo, es informativo.
  const priceComparison = appointment
    ? await (async () => {
        const currentLines = await resolveBookingPriceSnapshot(
          appointment.services.map((l) => l.serviceId),
          new Date()
        );
        const currentPromotionIds = currentLines
          .map((l) => l.promotionId)
          .filter((id): id is string => Boolean(id));
        const currentPromotions =
          currentPromotionIds.length > 0
            ? await prisma.promotion.findMany({ where: { id: { in: currentPromotionIds } } })
            : [];
        return appointment.services.map((l) => {
          const current = currentLines.find((c) => c.serviceId === l.serviceId);
          const currentPromotion = current?.promotionId
            ? currentPromotions.find((p) => p.id === current.promotionId)
            : null;
          return {
            serviceName: l.service.name,
            quotedPrice: Number(l.priceAtBooking),
            quotedPromotionName: l.promotionAtBooking?.name ?? null,
            quotedPromotionEndDate: l.promotionAtBooking ? formatVigencia(l.promotionAtBooking.endDate) : null,
            currentPrice: current?.priceApplied ?? Number(l.service.price),
            currentPromotionName: currentPromotion?.name ?? null,
            currentPromotionEndDate: currentPromotion ? formatVigencia(currentPromotion.endDate) : null,
          };
        });
      })()
    : [];

  const knownClientId = appointment?.clientId ?? clientIdParam;
  const initialAppointments = knownClientId ? await getClientOpenAppointments(knownClientId) : [];

  // "Hoy" en el calendario de Perú, no en el huso del servidor: una
  // promoción cargada hasta "hoy" no debería desaparecer 5 horas antes de
  // medianoche en Perú solo porque en UTC ya es el día siguiente.
  const today = peruToday();
  const startOfToday = today;
  const endOfToday = endOfDay(today);

  const [clients, professionals, services, promotions] = await Promise.all([
    prisma.client.findMany({ orderBy: { lastName: "asc" } }),
    prisma.adminUser.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    getBookableServices(),
    prisma.promotion.findMany({
      where: {
        status: "PUBLISHED",
        startDate: { lte: endOfToday },
        endDate: { gte: startOfToday },
        promoPrice: { not: null },
      },
      include: { services: true },
    }),
  ]);

  return (
    <div>
      <h1 className="font-display text-2xl">Nueva factura</h1>
      {error && (
        <p className="mt-2 rounded-brand border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {ERROR_LABEL[error] ?? "No se pudo guardar la factura."}
        </p>
      )}
      {appointment ? (
        <p className="mt-2 rounded-brand border border-brand-border bg-brand-bg px-4 py-3 text-sm">
          Turno de <strong>{appointment.client.firstName} {appointment.client.lastName}</strong> con{" "}
          {professionalLabel(appointment.professional)} —{" "}
          {appointment.services.map((l) => l.service.name).join(", ")}. Revisá los datos y{" "}
          <strong>marcá algún servicio más</strong> si hizo algo además de lo agendado; recién se
          guarda cuando confirmes "Registrar factura" al final.
        </p>
      ) : (
        <p className="mt-2 rounded-brand border border-brand-border bg-brand-bg px-4 py-3 text-sm">
          Elegí un cliente. Si tiene algún turno reservado o confirmado, te lo va a proponer para
          vincularlo a la factura y precargar sus servicios; si no tiene ninguno, la factura se
          registra igual, sin turno asociado.
        </p>
      )}
      <p className="mt-2 text-sm text-brand-muted">
        El precio sugerido usa las promociones vigentes hoy; si la fecha de la factura es otra, el
        sistema vuelve a validarlas al guardar.
      </p>
      <div className="mt-6">
        <SessionForm
          clients={clients.map((c) => ({ id: c.id, name: `${c.firstName} ${c.lastName}` }))}
          professionals={professionals.map((p) => ({ id: p.id, name: professionalLabel(p) }))}
          services={services.map((s) => ({ id: s.id, name: s.name, price: Number(s.price) }))}
          promotions={promotions.map((p) => ({
            id: p.id,
            name: p.name,
            promoPrice: Number(p.promoPrice),
            serviceIds: p.services.map((s) => s.id),
          }))}
          action={createClientSession}
          getClientAppointments={getClientOpenAppointments}
          initialAppointments={initialAppointments}
          priceComparison={priceComparison}
          canApplyDiscount={canApplyDiscount}
          defaultValues={{
            clientId: appointment?.clientId ?? clientIdParam,
            attendedByUserId: appointment?.professionalId,
            serviceIds: appointment?.services.map((s) => s.serviceId),
            appointmentId: appointment?.id,
            sessionDate: appointment ? toDateTimeLocal(appointment.startAt) : undefined,
          }}
        />
      </div>
    </div>
  );
}
