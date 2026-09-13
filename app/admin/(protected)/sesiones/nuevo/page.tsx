import { prisma } from "@/lib/prisma";
import { SessionForm } from "@/components/admin/SessionForm";
import { createClientSession } from "../actions";

// Las listas de clientes/profesionales/servicios/promociones deben reflejar
// siempre el estado actual: crear un cliente, un servicio o una promoción
// nueva no revalida esta página (mismo caso que /admin/promociones/nuevo).
export const dynamic = "force-dynamic";

export default async function NuevaSesionPage() {
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
      <p className="mt-1 text-sm text-brand-muted">
        El precio sugerido usa las promociones vigentes hoy; si la fecha de la sesión es otra, el
        sistema vuelve a calcularlo al guardar.
      </p>
      <div className="mt-6">
        <SessionForm
          clients={clients.map((c) => ({ id: c.id, name: `${c.firstName} ${c.lastName}` }))}
          professionals={professionals.map((p) => ({ id: p.id, name: p.name }))}
          services={services.map((s) => ({ id: s.id, name: s.name, price: Number(s.price) }))}
          promotions={promotions.map((p) => ({
            id: p.id,
            name: p.name,
            promoPrice: Number(p.promoPrice),
            serviceIds: p.services.map((s) => s.id),
          }))}
          action={createClientSession}
        />
      </div>
    </div>
  );
}
