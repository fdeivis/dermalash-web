import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePagePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { Button } from "@/components/ui/button";

const RATING_LABEL: Record<string, string> = {
  BUENA: "Buena",
  REGULAR: "Regular",
  MALA: "Mala",
};

export default async function ProveedoresPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requirePagePermission("proveedores.ver");
  const canManage = await hasPermission(session.user.role, "proveedores.gestionar");
  const { error } = await searchParams;

  const suppliers = await prisma.supplier.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Proveedores</h1>
        {canManage && (
          <Link href="/admin/proveedores/nuevo">
            <Button>Nuevo proveedor</Button>
          </Link>
        )}
      </div>

      {error === "tiene-gastos" && (
        <p className="mt-4 rounded-brand border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          No se puede eliminar: este proveedor ya tiene gastos registrados.
        </p>
      )}

      <div className="mt-6 overflow-x-auto rounded-brand border border-brand-border bg-brand-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-brand-border text-brand-muted">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">RUC</th>
              <th className="px-4 py-3">Evaluación</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((supplier) => (
              <tr key={supplier.id} className="border-b border-brand-border last:border-0">
                <td className="px-4 py-3">
                  <Link href={`/admin/proveedores/${supplier.id}`} className="underline">
                    {supplier.name}
                  </Link>
                </td>
                <td className="px-4 py-3">{supplier.taxId || "—"}</td>
                <td className="px-4 py-3">{supplier.rating ? RATING_LABEL[supplier.rating] : "—"}</td>
              </tr>
            ))}
            {suppliers.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-brand-muted">
                  Todavía no hay proveedores cargados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
