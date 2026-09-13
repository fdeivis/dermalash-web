"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSocioOrAdmin } from "@/lib/auth";

const purgeSchema = z.object({ days: z.coerce.number().int().positive() });

export async function purgeOldLogs(formData: FormData) {
  await requireSocioOrAdmin();
  const { days } = purgeSchema.parse({ days: formData.get("days") });

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const result = await prisma.auditLog.deleteMany({ where: { createdAt: { lt: cutoff } } });

  revalidatePath("/admin/logs");
  redirect(`/admin/logs?purged=${result.count}`);
}

// Distinta de purgeOldLogs a propósito: esta borra todo, incluidos los
// registros más recientes, sin filtro de antigüedad.
export async function purgeAllLogs() {
  await requireSocioOrAdmin();
  const result = await prisma.auditLog.deleteMany({});

  revalidatePath("/admin/logs");
  redirect(`/admin/logs?purged=${result.count}`);
}
