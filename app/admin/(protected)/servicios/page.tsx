import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { requirePagePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import { deleteService, moveService, setServiceStatus } from "./actions";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Borrador",
  ACTIVO: "Activo",
  PUBLISHED: "Publicado",
};

const STATUS_BADGE: Record<string, "draft" | "active" | "published"> = {
  DRAFT: "draft",
  ACTIVO: "active",
  PUBLISHED: "published",
};

// Transiciones ofrecidas desde cada estado: Borrador -> Activo o directo a
// Publicado; Activo -> volver a Borrador o Publicar; Publicado -> solo
// despublicar (vuelve a Activo, no a Borrador, para no perder de vista que
// ya se armó bien y solo se sacó de la web).
const STATUS_TRANSITIONS: Record<string, { to: "DRAFT" | "ACTIVO" | "PUBLISHED"; label: string }[]> = {
  DRAFT: [
    { to: "ACTIVO", label: "Activar" },
    { to: "PUBLISHED", label: "Publicar" },
  ],
  ACTIVO: [
    { to: "DRAFT", label: "Volver a borrador" },
    { to: "PUBLISHED", label: "Publicar" },
  ],
  PUBLISHED: [{ to: "ACTIVO", label: "Despublicar" }],
};

export default async function AdminServiciosPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requirePagePermission("servicios.ver");
  const canManage = await hasPermission(session.user.role, "servicios.gestionar");
  const { error } = await searchParams;
  const services = await prisma.service.findMany({ orderBy: { order: "asc" } });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Servicios</h1>
        {canManage && (
          <Link href="/admin/servicios/nuevo">
            <Button>Nuevo servicio</Button>
          </Link>
        )}
      </div>

      {error === "tiene-sesiones" && (
        <p className="mt-4 rounded-brand border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          No se puede eliminar: este servicio ya tiene facturas registradas. Despublícalo en su
          lugar si no quieres seguir ofreciéndolo.
        </p>
      )}

      <div className="mt-6 overflow-x-auto rounded-brand border border-brand-border bg-brand-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-brand-border text-brand-muted">
            <tr>
              <th className="px-4 py-3">Orden</th>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Precio</th>
              <th className="px-4 py-3">Estado</th>
              {canManage && <th className="px-4 py-3">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {services.map((service, i) => (
              <tr key={service.id} className="border-b border-brand-border last:border-0">
                <td className="px-4 py-3">
                  {canManage && (
                    <div className="flex gap-1">
                      <form action={moveService.bind(null, service.id, "up")}>
                        <button
                          type="submit"
                          disabled={i === 0}
                          className="disabled:opacity-30"
                          aria-label="Subir"
                        >
                          ↑
                        </button>
                      </form>
                      <form action={moveService.bind(null, service.id, "down")}>
                        <button
                          type="submit"
                          disabled={i === services.length - 1}
                          className="disabled:opacity-30"
                          aria-label="Bajar"
                        >
                          ↓
                        </button>
                      </form>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">{service.name}</td>
                <td className="px-4 py-3">
                  {service.priceFrom && "Desde "}
                  {formatPrice(service.price.toString())}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={STATUS_BADGE[service.status]}>{STATUS_LABEL[service.status]}</Badge>
                </td>
                {canManage && (
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/admin/servicios/${service.id}`}>
                        <Button variant="outline" size="sm">
                          Editar
                        </Button>
                      </Link>
                      {STATUS_TRANSITIONS[service.status].map((transition) => (
                        <form key={transition.to} action={setServiceStatus.bind(null, service.id, transition.to)}>
                          <Button type="submit" variant="outline" size="sm">
                            {transition.label}
                          </Button>
                        </form>
                      ))}
                      <form action={deleteService.bind(null, service.id)}>
                        <ConfirmSubmitButton
                          type="submit"
                          variant="danger"
                          size="sm"
                          confirmMessage={`¿Eliminar "${service.name}"? Esta acción no se puede deshacer.`}
                        >
                          Eliminar
                        </ConfirmSubmitButton>
                      </form>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {services.length === 0 && (
              <tr>
                <td colSpan={canManage ? 5 : 4} className="px-4 py-8 text-center text-brand-muted">
                  Todavía no hay servicios cargados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
