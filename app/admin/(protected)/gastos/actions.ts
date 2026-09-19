"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { deletePrivateFile } from "@/lib/supabase";
import { parseDateTimeLocal } from "@/lib/scheduling";

const expenseSchema = z.object({
  concept: z.string().min(1, "El concepto es obligatorio"),
  category: z.enum([
    "ALQUILER",
    "INTERNET",
    "LUZ",
    "AGUA",
    "INVENTARIO",
    "SUELDOS",
    "ADELANTO_GANANCIAS",
    "OTROS",
  ]),
  date: z.string().min(1, "Elige una fecha"),
  amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
  paymentMethod: z.enum(["EFECTIVO", "YAPE", "PLIN", "TARJETA", "TRANSFERENCIA", "OTRO"]),
  supplierId: z.string().optional(),
  employeeId: z.string().optional(),
  receiptPath: z.string().optional(),
  notes: z.string().max(2000, "Máximo 2000 caracteres").optional(),
});

export async function createExpense(formData: FormData) {
  const session = await requirePermission("gastos.gestionar");
  const data = expenseSchema.parse({
    concept: formData.get("concept"),
    category: formData.get("category"),
    date: formData.get("date"),
    amount: formData.get("amount"),
    paymentMethod: formData.get("paymentMethod"),
    supplierId: formData.get("supplierId") || undefined,
    employeeId: formData.get("employeeId") || undefined,
    receiptPath: formData.get("receiptPath") || undefined,
    notes: formData.get("notes") || undefined,
  });

  // Empleado obligatorio para sueldos (sección 11 del diseño funcional).
  if (data.category === "SUELDOS" && !data.employeeId) {
    redirect(
      `/admin/gastos/nuevo?error=empleado-requerido&category=${data.category}`
    );
  }

  // Adelanto de ganancias: regla dura de rol, no un permiso configurable
  // (igual patrón que layout.tsx / lib/auth.ts para acciones exclusivas de
  // Socio) — el diseño lo pide explícitamente restringido a Socio.
  if (
    data.category === "ADELANTO_GANANCIAS" &&
    !["SOCIO", "ADMIN"].includes(session.user.role)
  ) {
    throw new Error("Solo el Socio puede registrar un adelanto de ganancias");
  }

  const date = parseDateTimeLocal(data.date);

  // Un gasto pagado en un medio que la caja abierta está arqueando queda
  // enlazado automáticamente a esa sesión — sin pedírselo al usuario
  // (sección 12). Si la caja está abierta pero esa cuenta en particular no
  // se abrió (ej. caja solo con Efectivo y el gasto es por Yape), no se
  // enlaza: esa cuenta no está bajo conciliación esta sesión.
  const openCashSession = await prisma.cashSession.findFirst({
    where: { closedAt: null, accounts: { some: { paymentMethod: data.paymentMethod } } },
  });

  const expense = await prisma.expense.create({
    data: {
      concept: data.concept,
      category: data.category,
      date,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      supplierId: data.supplierId || null,
      employeeId: data.employeeId || null,
      receiptPath: data.receiptPath || null,
      notes: data.notes,
      cashSessionId: openCashSession?.id ?? null,
      createdByUserId: session.user.id,
    },
  });
  await logAction(session, "gasto.crear", "Expense", expense.id, `S/ ${data.amount}`);

  revalidatePath("/admin/gastos");
  revalidatePath("/admin/caja");
  redirect("/admin/gastos");
}

export async function deleteExpense(id: string) {
  const session = await requirePermission("gastos.eliminar");
  const expense = await prisma.expense.findUniqueOrThrow({ where: { id } });

  await prisma.expense.delete({ where: { id } });
  await logAction(session, "gasto.eliminar", "Expense", id, expense.concept);

  if (expense.receiptPath) await deletePrivateFile(expense.receiptPath).catch(() => {});

  revalidatePath("/admin/gastos");
  revalidatePath("/admin/caja");
}
