import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { professionalLabel, peruParts, peruToday, endOfDay } from "@/lib/scheduling";
import { requirePagePermission } from "@/lib/auth";
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
};

export default async function NuevaSesionPage({
  searchParams,
}: {
  searchParams: Promise<{ appointmentId?: string; clientId?: string; error?: string }>;
}) {
  await requirePagePermission("sesiones.crear");
  const { appointmentId, clientId: clientIdParam, error } = await searchParams;

  // Una factura ya no requiere partir de un turno: puede emitirse suelta
  // para cualquier cliente. Si viene con `appointmentId` (desde la Agenda o
  // el detalle de un turno) se sigue precargando todo desde ahí, como antes.
  const appointment = appointmentId
    ? await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: { services: { include: { service: true } }, client: true, professional: true },
      })
    : null;
  if (appointmentId && !appointment) redirect("/admin/agenda");

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
    prisma.service.findMany({ where: { status: "PUBLISHED" }, orderBy: { order: "asc" } }),
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
