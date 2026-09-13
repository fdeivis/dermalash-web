import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { professionalLabel } from "@/lib/scheduling";
import { SessionForm } from "@/components/admin/SessionForm";
import { createClientSession } from "../actions";

// Las listas de clientes/profesionales/servicios/promociones deben reflejar
// siempre el estado actual: crear un cliente, un servicio o una promoción
// nueva no revalida esta página (mismo caso que /admin/promociones/nuevo).
export const dynamic = "force-dynamic";

function toDateTimeLocal(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export default async function NuevaSesionPage({
  searchParams,
}: {
  searchParams: Promise<{ appointmentId?: string }>;
}) {
  const { appointmentId } = await searchParams;
  // Toda sesión nueva se registra a partir de un turno (así se valida
  // disponibilidad/solapamiento una sola vez, en la Agenda, y no queda un
  // atajo que la salte). Sin turno, se manda a crear uno primero.
  if (!appointmentId) redirect("/admin/agenda");

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { services: { include: { service: true } }, client: true, professional: true },
  });
  if (!appointment) redirect("/admin/agenda");

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setUTCHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setUTCHours(23, 59, 59, 999);

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
      <h1 className="font-display text-2xl">Nueva sesión</h1>
      <p className="mt-2 rounded-brand border border-brand-border bg-brand-bg px-4 py-3 text-sm">
        Turno de <strong>{appointment.client.firstName} {appointment.client.lastName}</strong> con{" "}
        {professionalLabel(appointment.professional)} —{" "}
        {appointment.services.map((l) => l.service.name).join(", ")}. Revisá los datos y{" "}
        <strong>marcá algún servicio más</strong> si hizo algo además de lo agendado; recién se
        guarda cuando confirmes "Registrar sesión" al final.
      </p>
      <p className="mt-2 text-sm text-brand-muted">
        El precio sugerido usa las promociones vigentes hoy; si la fecha de la sesión es otra, el
        sistema vuelve a calcularlo al guardar.
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
          defaultValues={{
            clientId: appointment.clientId,
            attendedByUserId: appointment.professionalId,
            serviceIds: appointment.services.map((s) => s.serviceId),
            appointmentId: appointment.id,
            sessionDate: toDateTimeLocal(appointment.startAt),
          }}
        />
      </div>
    </div>
  );
}
