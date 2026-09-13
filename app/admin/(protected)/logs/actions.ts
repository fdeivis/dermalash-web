"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSocio } from "@/lib/auth";

const purgeSchema = z.object({ days: z.coerce.number().int().positive() });

export async function purgeOldLogs(formData: FormData) {
  await requireSocio();
  const { days } = purgeSchema.parse({ days: formData.get("days") });

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const result = await prisma.auditLog.deleteMany({ where: { createdAt: { lt: cutoff } } });

  revalidatePath("/admin/logs");
  redirect(`/admin/logs?purged=${result.count}`);
}
