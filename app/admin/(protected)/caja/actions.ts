"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { computeCashBalance } from "@/lib/cash";

const PAYMENT_METHODS = ["EFECTIVO", "YAPE", "PLIN", "TARJETA", "TRANSFERENCIA", "OTRO"] as const;

const openSchema = z.object({
  paymentMethod: z.enum(PAYMENT_METHODS),
  openingAmount: z.coerce.number().nonnegative(),
});

export async function openCashSession(formData: FormData) {
  const session = await requirePermission("caja.gestionar");
  const data = openSchema.parse({
    paymentMethod: formData.get("paymentMethod"),
    openingAmount: formData.get("openingAmount"),
  });

  const existing = await prisma.cashSession.findFirst({
    where: { paymentMethod: data.paymentMethod, closedAt: null },
  });
  if (existing) {
    redirect("/admin/caja?error=ya-abierta");
  }

  const cashSession = await prisma.cashSession.create({
    data: {
      paymentMethod: data.paymentMethod,
      openingAmount: data.openingAmount,
      openedByUserId: session.user.id,
    },
  });
  await logAction(
    session,
    "caja.abrir",
    "CashSession",
    cashSession.id,
    `${data.paymentMethod} — S/ ${data.openingAmount}`
  );

  revalidatePath("/admin/caja");
}

const closeSchema = z.object({
  actualAmount: z.coerce.number().nonnegative(),
});

export async function closeCashSession(id: string, formData: FormData) {
  const session = await requirePermission("caja.gestionar");
  const data = closeSchema.parse({ actualAmount: formData.get("actualAmount") });

  const cashSession = await prisma.cashSession.findUniqueOrThrow({ where: { id } });
  if (cashSession.closedAt) return;

  const now = new Date();
  const expectedAmount = await computeCashBalance(
    cashSession.paymentMethod,
    Number(cashSession.openingAmount),
    cashSession.openedAt,
    now
  );
  const difference = data.actualAmount - expectedAmount;

  await prisma.cashSession.update({
    where: { id },
    data: {
      closedAt: now,
      closedByUserId: session.user.id,
      expectedAmount,
      actualAmount: data.actualAmount,
      difference,
    },
  });
  await logAction(
    session,
    "caja.cerrar",
    "CashSession",
    id,
    `${cashSession.paymentMethod} — esperado S/ ${expectedAmount.toFixed(2)}, real S/ ${data.actualAmount}`
  );

  revalidatePath("/admin/caja");
}
