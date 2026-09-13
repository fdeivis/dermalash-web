import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth";
import { professionalLabel, formatDateTime12 } from "@/lib/scheduling";

// Los contadores deben reflejar siempre el estado actual: las acciones de
// crear/editar/publicar/eliminar solo revalidan su propio listado
// (/admin/servicios, /admin/promociones, /admin/novedades), no el dashboard.
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  RESERVADO: "Reservado",
  CONFIRMADO: "Confirmado",
};

export default async function AdminDashboardPage() {
  const session = await requireAdminSession();
  const canManageAgenda = ["SOCIO", "ADMIN", "ENCARGADO"].includes(session.user.role);

  const [services, promotions, posts, clients, employees, sessions, upcomingAppointments] =
    await Promise.all([
      prisma.service.count(),
      prisma.promotion.count(),
      prisma.post.count(),
      prisma.client.count(),
      prisma.employee.count(),
      prisma.clientSession.count(),
      prisma.appointment.findMany({
        where: {
          status: { in: ["RESERVADO", "CONFIRMADO"] },
          startAt: { gte: new Date() },
          // Esteticista solo ve sus propios próximos turnos, igual que en /admin/agenda.
          ...(canManageAgenda ? {} : { professionalId: session.user.id }),
        },
        include: { client: true, professional: true },
        orderBy: { startAt: "asc" },
        take: 5,
      }),
    ]);

  const cards = [
    { label: "Servicios", count: services, href: "/admin/servicios" },
    { label: "Promociones", count: promotions, href: "/admin/promociones" },
    { label: "Novedades", count: posts, href: "/admin/novedades" },
    { label: "Clientes", count: clients, href: "/admin/clientes" },
    { label: "Empleados", count: employees, href: "/admin/empleados" },
    { label: "Sesiones", count: sessions, href: "/admin/sesiones" },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl">Dashboard</h1>
      <p className="mt-1 text-sm text-brand-muted">
        Administrá el contenido público de Dermalash.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-brand border border-brand-border bg-brand-surface p-6 hover:shadow-md"
          >
            <p className="text-3xl font-display">{card.count}</p>
            <p className="mt-1 text-sm text-brand-muted">{card.label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 rounded-brand border border-brand-border bg-brand-surface p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg">Próximos turnos</h2>
          <Link href="/admin/agenda" className="text-sm text-brand-muted underline hover:text-brand-ink">
            Ver agenda →
          </Link>
        </div>
        <ul className="mt-4 space-y-3 text-sm">
          {upcomingAppointments.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 border-b border-brand-border pb-3 last:border-0 last:pb-0">
              <div>
                <p className="font-medium">
                  {a.client.firstName} {a.client.lastName}
                </p>
                <p className="text-xs text-brand-muted">
                  {formatDateTime12(a.startAt)} ·{" "}
                  {professionalLabel(a.professional)} ·{" "}
                  <span className="rounded bg-brand-bg px-1.5 py-0.5">{STATUS_LABEL[a.status]}</span>
                </p>
              </div>
              {canManageAgenda && (
                <Link href={`/admin/agenda/${a.id}`} className="shrink-0 text-xs underline hover:text-brand-ink">
                  Ver →
                </Link>
              )}
            </li>
          ))}
          {upcomingAppointments.length === 0 && (
            <li className="text-brand-muted">No hay turnos próximos.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
