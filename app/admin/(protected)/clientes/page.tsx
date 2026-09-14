import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePagePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import { deleteClient } from "./actions";

export default async function AdminClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; error?: string }>;
}) {
  const session = await requirePagePermission("clientes.ver");
  const canManage = await hasPermission(session.user.role, "clientes.gestionar");
  const { q, error } = await searchParams;

  const clients = await prisma.client.findMany({
    where: q
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
            { documentId: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Clientes</h1>
        {canManage && (
          <Link href="/admin/clientes/nuevo">
            <Button>Nuevo cliente</Button>
          </Link>
        )}
      </div>

      {error === "tiene-sesiones" && (
        <p className="mt-4 rounded-brand border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          No se puede eliminar: este cliente ya tiene facturas registradas.
        </p>
      )}

      <form className="mt-4 flex gap-2" action="/admin/clientes">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Buscar por nombre, teléfono o documento..."
          className="w-full max-w-sm rounded-brand border border-brand-border px-3 py-2 text-sm"
        />
        <Button type="submit" variant="outline">
          Buscar
        </Button>
      </form>
      <p className="mt-1 text-xs text-brand-muted">
        Buscá antes de crear un cliente nuevo para evitar duplicados.
      </p>

      <div className="mt-6 overflow-x-auto rounded-brand border border-brand-border bg-brand-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-brand-border text-brand-muted">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Teléfono</th>
              <th className="px-4 py-3">Documento</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id} className="border-b border-brand-border last:border-0">
                <td className="px-4 py-3">
                  {client.firstName} {client.lastName}
                </td>
                <td className="px-4 py-3">{client.phone ?? "—"}</td>
                <td className="px-4 py-3">{client.documentId ?? "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/admin/clientes/${client.id}`}>
                      <Button variant="outline" size="sm">
                        Ver ficha
                      </Button>
                    </Link>
                    {canManage && (
                      <form action={deleteClient.bind(null, client.id)}>
                        <ConfirmSubmitButton
                          type="submit"
                          variant="danger"
                          size="sm"
                          confirmMessage={`¿Eliminar a "${client.firstName} ${client.lastName}"? Esta acción no se puede deshacer.`}
                        >
                          Eliminar
                        </ConfirmSubmitButton>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-brand-muted">
                  {q
                    ? "No se encontraron clientes con esa búsqueda."
                    : "Todavía no hay clientes cargados."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
