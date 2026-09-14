import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { requirePagePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import { deleteService, moveService, setServiceStatus } from "./actions";

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
          No se puede eliminar: este servicio ya tiene sesiones registradas. Despublicalo en su
          lugar si no querés seguir ofreciéndolo.
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
                  <Badge variant={service.status === "PUBLISHED" ? "published" : "draft"}>
                    {service.status === "PUBLISHED" ? "Publicado" : "Borrador"}
                  </Badge>
                </td>
                {canManage && (
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/admin/servicios/${service.id}`}>
                        <Button variant="outline" size="sm">
                          Editar
                        </Button>
                      </Link>
                      <form
                        action={setServiceStatus.bind(
                          null,
                          service.id,
                          service.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED"
                        )}
                      >
                        <Button type="submit" variant="outline" size="sm">
                          {service.status === "PUBLISHED" ? "Despublicar" : "Publicar"}
                        </Button>
                      </form>
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
