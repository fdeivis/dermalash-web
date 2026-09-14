import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePagePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import { deletePromotion, movePromotion, setPromotionStatus } from "./actions";

const dateFormatter = new Intl.DateTimeFormat("es-PE", { dateStyle: "short" });

export default async function AdminPromocionesPage() {
  const session = await requirePagePermission("promociones.ver");
  const canManage = await hasPermission(session.user.role, "promociones.gestionar");
  const promotions = await prisma.promotion.findMany({ orderBy: { order: "asc" } });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Promociones</h1>
        {canManage && (
          <Link href="/admin/promociones/nuevo">
            <Button>Nueva promoción</Button>
          </Link>
        )}
      </div>

      <div className="mt-6 overflow-x-auto rounded-brand border border-brand-border bg-brand-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-brand-border text-brand-muted">
            <tr>
              <th className="px-4 py-3">Orden</th>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Vigencia</th>
              <th className="px-4 py-3">Estado</th>
              {canManage && <th className="px-4 py-3">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {promotions.map((promotion, i) => (
              <tr key={promotion.id} className="border-b border-brand-border last:border-0">
                <td className="px-4 py-3">
                  {canManage && (
                    <div className="flex gap-1">
                      <form action={movePromotion.bind(null, promotion.id, "up")}>
                        <button type="submit" disabled={i === 0} className="disabled:opacity-30">
                          ↑
                        </button>
                      </form>
                      <form action={movePromotion.bind(null, promotion.id, "down")}>
                        <button
                          type="submit"
                          disabled={i === promotions.length - 1}
                          className="disabled:opacity-30"
                        >
                          ↓
                        </button>
                      </form>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">{promotion.name}</td>
                <td className="px-4 py-3">
                  {dateFormatter.format(promotion.startDate)} –{" "}
                  {dateFormatter.format(promotion.endDate)}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={promotion.status === "PUBLISHED" ? "published" : "draft"}>
                    {promotion.status === "PUBLISHED" ? "Publicado" : "Borrador"}
                  </Badge>
                </td>
                {canManage && (
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/admin/promociones/${promotion.id}`}>
                        <Button variant="outline" size="sm">
                          Editar
                        </Button>
                      </Link>
                      <form
                        action={setPromotionStatus.bind(
                          null,
                          promotion.id,
                          promotion.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED"
                        )}
                      >
                        <Button type="submit" variant="outline" size="sm">
                          {promotion.status === "PUBLISHED" ? "Despublicar" : "Publicar"}
                        </Button>
                      </form>
                      <form action={deletePromotion.bind(null, promotion.id)}>
                        <ConfirmSubmitButton
                          type="submit"
                          variant="danger"
                          size="sm"
                          confirmMessage={`¿Eliminar "${promotion.name}"?`}
                        >
                          Eliminar
                        </ConfirmSubmitButton>
                      </form>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {promotions.length === 0 && (
              <tr>
                <td colSpan={canManage ? 5 : 4} className="px-4 py-8 text-center text-brand-muted">
                  Todavía no hay promociones cargadas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
