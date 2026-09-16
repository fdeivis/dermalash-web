"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { computeCashBalance } from "@/lib/cash";

// OTRO no es una cuenta real que tenga sentido arquear.
type ReconcilableMethod = "EFECTIVO" | "YAPE" | "PLIN" | "TARJETA" | "TRANSFERENCIA";
const RECONCILABLE_METHODS: ReconcilableMethod[] = ["EFECTIVO", "YAPE", "PLIN", "TARJETA", "TRANSFERENCIA"];

const amountField = z.coerce.number().nonnegative().optional();

/**
 * Una sola caja, una sola fecha de apertura: Efectivo es obligatorio,
 * el resto de las cuentas se agregan solo si se tiene ese dato — no hace
 * falta tenerlas todas.
 */
export async function openCashSession(formData: FormData) {
  const session = await requirePermission("caja.gestionar");

  const existing = await prisma.cashSession.findFirst({ where: { closedAt: null } });
  if (existing) {
    redirect("/admin/caja?error=ya-abierta");
  }

  const amounts = z
    .object({
      EFECTIVO: z.coerce.number().nonnegative(),
      YAPE: amountField,
      PLIN: amountField,
      TARJETA: amountField,
      TRANSFERENCIA: amountField,
    })
    .parse({
      EFECTIVO: formData.get("EFECTIVO"),
      YAPE: formData.get("YAPE") || undefined,
      PLIN: formData.get("PLIN") || undefined,
      TARJETA: formData.get("TARJETA") || undefined,
      TRANSFERENCIA: formData.get("TRANSFERENCIA") || undefined,
    });

  const cashSession = await prisma.cashSession.create({
    data: {
      openedByUserId: session.user.id,
      accounts: {
        create: RECONCILABLE_METHODS.filter((m) => amounts[m] !== undefined).map((m) => ({
          paymentMethod: m,
          openingAmount: amounts[m] as number,
        })),
      },
    },
  });
  await logAction(session, "caja.abrir", "CashSession", cashSession.id);

  revalidatePath("/admin/caja");
  revalidatePath("/admin");
}

export async function closeCashSession(id: string, formData: FormData) {
  const session = await requirePermission("caja.gestionar");

  const cashSession = await prisma.cashSession.findUniqueOrThrow({
    where: { id },
    include: { accounts: true },
  });
  if (cashSession.closedAt) return;

  const now = new Date();

  // El esperado se calcula por cuenta (depende de Income/Expense de ESE
  // medio de pago); el real viene del formulario, un input por cuenta.
  const updates = await Promise.all(
    cashSession.accounts.map(async (account) => {
      const expectedAmount = await computeCashBalance(
        account.paymentMethod,
        Number(account.openingAmount),
        cashSession.id,
        cashSession.openedAt,
        now
      );
      const actualAmount = z.coerce
        .number()
        .nonnegative()
        .parse(formData.get(`actual_${account.paymentMethod}`));
      return { id: account.id, expectedAmount, actualAmount, difference: actualAmount - expectedAmount };
    })
  );

  await prisma.$transaction(
    updates.map((u) =>
      prisma.cashSessionAccount.update({
        where: { id: u.id },
        data: { expectedAmount: u.expectedAmount, actualAmount: u.actualAmount, difference: u.difference },
      })
    )
  );

  await prisma.cashSession.update({
    where: { id },
    data: { closedAt: now, closedByUserId: session.user.id },
  });
  await logAction(session, "caja.cerrar", "CashSession", id);

  revalidatePath("/admin/caja");
  revalidatePath("/admin");
}
