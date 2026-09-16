"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { logAction } from "@/lib/audit";

const supplierSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  taxId: z.string().optional(),
  contactInfo: z.string().optional(),
  rating: z.enum(["BUENA", "REGULAR", "MALA"]).optional(),
});

function parseSupplierFormData(formData: FormData) {
  return supplierSchema.parse({
    name: formData.get("name"),
    taxId: formData.get("taxId") || undefined,
    contactInfo: formData.get("contactInfo") || undefined,
    rating: formData.get("rating") || undefined,
  });
}

export async function createSupplier(formData: FormData) {
  const session = await requirePermission("proveedores.gestionar");
  const data = parseSupplierFormData(formData);

  const supplier = await prisma.supplier.create({ data });
  await logAction(session, "proveedor.crear", "Supplier", supplier.id, supplier.name);

  revalidatePath("/admin/proveedores");
  redirect(`/admin/proveedores/${supplier.id}`);
}

export async function updateSupplier(id: string, formData: FormData) {
  const session = await requirePermission("proveedores.gestionar");
  const data = parseSupplierFormData(formData);

  await prisma.supplier.update({ where: { id }, data });
  await logAction(session, "proveedor.editar", "Supplier", id, data.name);

  revalidatePath("/admin/proveedores");
  revalidatePath(`/admin/proveedores/${id}`);
  redirect(`/admin/proveedores/${id}`);
}

export async function deleteSupplier(id: string) {
  const session = await requirePermission("proveedores.gestionar");

  const expenseCount = await prisma.expense.count({ where: { supplierId: id } });
  if (expenseCount > 0) {
    redirect("/admin/proveedores?error=tiene-gastos");
  }

  const deleted = await prisma.supplier.delete({ where: { id } });
  await logAction(session, "proveedor.eliminar", "Supplier", id, deleted.name);

  revalidatePath("/admin/proveedores");
  redirect("/admin/proveedores");
}
