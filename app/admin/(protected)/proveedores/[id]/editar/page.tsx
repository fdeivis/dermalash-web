import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePagePermission } from "@/lib/auth";
import { SupplierForm } from "@/components/admin/SupplierForm";
import { updateSupplier, deleteSupplier } from "../../actions";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";

export default async function EditarProveedorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePagePermission("proveedores.gestionar");
  const { id } = await params;

  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier) notFound();

  return (
    <div>
      <h1 className="font-display text-2xl">Editar proveedor</h1>
      <div className="mt-6">
        <SupplierForm supplier={supplier} action={updateSupplier.bind(null, supplier.id)} />
      </div>

      <div className="mt-8 max-w-xl border-t border-brand-border pt-6">
        <form action={deleteSupplier.bind(null, supplier.id)}>
          <ConfirmSubmitButton
            type="submit"
            variant="danger"
            size="sm"
            confirmMessage={`¿Eliminar "${supplier.name}"? Esta acción no se puede deshacer.`}
          >
            Eliminar proveedor
          </ConfirmSubmitButton>
        </form>
      </div>
    </div>
  );
}
