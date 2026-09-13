"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAgendaManager } from "@/lib/auth";

export async function acknowledgeAlert(id: string) {
  const session = await requireAgendaManager();
  await prisma.alert.update({
    where: { id },
    data: { acknowledgedAt: new Date(), acknowledgedByUserId: session.user.id },
  });
  revalidatePath("/admin/alertas");
  revalidatePath("/admin");
}

export async function acknowledgeAllAlerts() {
  const session = await requireAgendaManager();
  await prisma.alert.updateMany({
    where: { acknowledgedAt: null },
    data: { acknowledgedAt: new Date(), acknowledgedByUserId: session.user.id },
  });
  revalidatePath("/admin/alertas");
  revalidatePath("/admin");
}

export async function deleteAlert(id: string) {
  await requireAgendaManager();
  await prisma.alert.delete({ where: { id } });
  revalidatePath("/admin/alertas");
  revalidatePath("/admin");
}

export async function deleteAlerts(ids: string[]) {
  await requireAgendaManager();
  await prisma.alert.deleteMany({ where: { id: { in: ids } } });
  revalidatePath("/admin/alertas");
  revalidatePath("/admin");
}

export async function deleteAllAlerts() {
  await requireAgendaManager();
  await prisma.alert.deleteMany({});
  revalidatePath("/admin/alertas");
  revalidatePath("/admin");
}
