import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePagePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import { deletePost, setPostStatus } from "./actions";

export default async function AdminNovedadesPage() {
  const session = await requirePagePermission("novedades.ver");
  const canManage = await hasPermission(session.user.role, "novedades.gestionar");
  const posts = await prisma.post.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Novedades</h1>
        {canManage && (
          <Link href="/admin/novedades/nuevo">
            <Button>Nueva novedad</Button>
          </Link>
        )}
      </div>

      <div className="mt-6 overflow-x-auto rounded-brand border border-brand-border bg-brand-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-brand-border text-brand-muted">
            <tr>
              <th className="px-4 py-3">Título</th>
              <th className="px-4 py-3">Estado</th>
              {canManage && <th className="px-4 py-3">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr key={post.id} className="border-b border-brand-border last:border-0">
                <td className="px-4 py-3">{post.title}</td>
                <td className="px-4 py-3">
                  <Badge variant={post.status === "PUBLISHED" ? "published" : "draft"}>
                    {post.status === "PUBLISHED" ? "Publicado" : "Borrador"}
                  </Badge>
                </td>
                {canManage && (
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/admin/novedades/${post.id}`}>
                        <Button variant="outline" size="sm">
                          Editar
                        </Button>
                      </Link>
                      <form
                        action={setPostStatus.bind(
                          null,
                          post.id,
                          post.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED"
                        )}
                      >
                        <Button type="submit" variant="outline" size="sm">
                          {post.status === "PUBLISHED" ? "Despublicar" : "Publicar"}
                        </Button>
                      </form>
                      <form action={deletePost.bind(null, post.id)}>
                        <ConfirmSubmitButton
                          type="submit"
                          variant="danger"
                          size="sm"
                          confirmMessage={`¿Eliminar "${post.title}"?`}
                        >
                          Eliminar
                        </ConfirmSubmitButton>
                      </form>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {posts.length === 0 && (
              <tr>
                <td colSpan={canManage ? 3 : 2} className="px-4 py-8 text-center text-brand-muted">
                  Todavía no hay novedades cargadas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
