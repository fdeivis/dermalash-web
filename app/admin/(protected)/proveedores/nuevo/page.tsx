import { SupplierForm } from "@/components/admin/SupplierForm";
import { requirePagePermission } from "@/lib/auth";
import { createSupplier } from "../actions";

export default async function NuevoProveedorPage() {
  await requirePagePermission("proveedores.gestionar");
  return (
    <div>
      <h1 className="font-display text-2xl">Nuevo proveedor</h1>
      <div className="mt-6">
        <SupplierForm action={createSupplier} />
      </div>
    </div>
  );
}
