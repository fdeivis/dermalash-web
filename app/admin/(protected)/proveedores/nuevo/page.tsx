import { SupplierForm } from "@/components/admin/SupplierForm";
import { requirePagePermission } from "@/lib/auth";
import { createSupplier } from "../actions";

export default async function NuevoProveedorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requirePagePermission("proveedores.gestionar");
  const { error } = await searchParams;
  return (
    <div>
      <h1 className="font-display text-2xl">Nuevo proveedor</h1>
      {error && (
        <p className="mt-2 rounded-brand border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="mt-6">
        <SupplierForm action={createSupplier} />
      </div>
    </div>
  );
}
