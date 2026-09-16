import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { requirePagePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { Button } from "@/components/ui/button";

const RATING_LABEL: Record<string, string> = {
  BUENA: "Buena",
  REGULAR: "Regular",
  MALA: "Mala",
};

export default async function VerProveedorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePagePermission("proveedores.ver");
  const canManage = await hasPermission(session.user.role, "proveedores.gestionar");
  const { id } = await params;

  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: { expenses: { orderBy: { date: "desc" } } },
  });
  if (!supplier) notFound();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">{supplier.name}</h1>
        {canManage && (
          <Link href={`/admin/proveedores/${supplier.id}/editar`}>
            <Button variant="outline" size="sm">
              Editar
            </Button>
          </Link>
        )}
      </div>

      <dl className="mt-6 max-w-xl space-y-3 rounded-brand border border-brand-border bg-brand-surface p-5 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-brand-muted">RUC / identificador fiscal</dt>
          <dd>{supplier.taxId || "—"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-brand-muted">Contacto</dt>
          <dd className="text-right">{supplier.contactInfo || "—"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-brand-muted">Evaluación</dt>
          <dd>{supplier.rating ? RATING_LABEL[supplier.rating] : "Sin evaluar"}</dd>
        </div>
      </dl>

      <h2 className="mt-8 font-display text-lg">Gastos registrados</h2>
      <div className="mt-3 overflow-x-auto rounded-brand border border-brand-border bg-brand-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-brand-border text-brand-muted">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Concepto</th>
              <th className="px-4 py-3">Monto</th>
            </tr>
          </thead>
          <tbody>
            {supplier.expenses.map((expense) => (
              <tr key={expense.id} className="border-b border-brand-border last:border-0">
                <td className="px-4 py-3">{expense.date.toLocaleDateString("es-PE")}</td>
                <td className="px-4 py-3">{expense.concept}</td>
                <td className="px-4 py-3">{formatPrice(expense.amount.toString())}</td>
              </tr>
            ))}
            {supplier.expenses.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-brand-muted">
                  Todavía no hay gastos registrados con este proveedor.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
