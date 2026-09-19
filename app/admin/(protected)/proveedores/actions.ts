"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { logAction } from "@/lib/audit";

const PHONE_REGEX = /^[\d\s()+-]{6,20}$/;

const supplierSchema = z
  .object({
    name: z.string().min(1, "El nombre es obligatorio"),
    taxId: z.string().optional(),
    phone: z.string().regex(PHONE_REGEX, "Formato de teléfono inválido").optional(),
    whatsapp: z.string().regex(PHONE_REGEX, "Formato de WhatsApp inválido").optional(),
    email: z.string().email("Formato de correo inválido").optional(),
    rating: z.enum(["BUENA", "REGULAR", "MALA"]).optional(),
  })
  .refine((data) => data.phone || data.whatsapp || data.email, {
    message: "Ingresa al menos un dato de contacto (teléfono, WhatsApp o correo)",
    path: ["phone"],
  });

function parseSupplierFormData(formData: FormData) {
  return supplierSchema.parse({
    name: formData.get("name"),
    taxId: formData.get("taxId") || undefined,
    phone: formData.get("phone") || undefined,
    whatsapp: formData.get("whatsapp") || undefined,
    email: formData.get("email") || undefined,
    rating: formData.get("rating") || undefined,
  });
}

export async function createSupplier(formData: FormData) {
  const session = await requirePermission("proveedores.gestionar");
  let data: z.infer<typeof supplierSchema>;
  try {
    data = parseSupplierFormData(formData);
  } catch (error) {
    if (!(error instanceof z.ZodError)) throw error;
    redirect(`/admin/proveedores/nuevo?error=${encodeURIComponent(error.issues[0]?.message ?? "datos-invalidos")}`);
  }

  const supplier = await prisma.supplier.create({ data });
  await logAction(session, "proveedor.crear", "Supplier", supplier.id, supplier.name);

  revalidatePath("/admin/proveedores");
  redirect(`/admin/proveedores/${supplier.id}`);
}

export async function updateSupplier(id: string, formData: FormData) {
  const session = await requirePermission("proveedores.gestionar");
  let data: z.infer<typeof supplierSchema>;
  try {
    data = parseSupplierFormData(formData);
  } catch (error) {
    if (!(error instanceof z.ZodError)) throw error;
    redirect(
      `/admin/proveedores/${id}/editar?error=${encodeURIComponent(error.issues[0]?.message ?? "datos-invalidos")}`
    );
  }

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
