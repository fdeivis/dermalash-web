"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { uniqueSlug } from "@/lib/slug";
import { requireAdminSession } from "@/lib/auth";
import { logAction } from "@/lib/audit";

const promotionSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  description: z.string().min(1, "La descripción es obligatoria"),
  conditions: z.string().optional(),
  promoPrice: z.coerce.number().nonnegative().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  images: z.array(z.string().url()),
  serviceIds: z.array(z.string()),
});

function parseFormData(formData: FormData) {
  return promotionSchema.parse({
    name: formData.get("name"),
    description: formData.get("description"),
    conditions: formData.get("conditions") || undefined,
    promoPrice: formData.get("promoPrice") || undefined,
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    images: formData.getAll("images").filter((v) => String(v).trim().length > 0),
    serviceIds: formData.getAll("serviceIds"),
  });
}

export async function createPromotion(formData: FormData) {
  const session = await requireAdminSession();
  const { serviceIds, ...data } = parseFormData(formData);
  const slug = await uniqueSlug(
    data.name,
    async (s) => (await prisma.promotion.count({ where: { slug: s } })) > 0
  );
  const last = await prisma.promotion.findFirst({ orderBy: { order: "desc" } });

  const promotion = await prisma.promotion.create({
    data: {
      ...data,
      slug,
      order: (last?.order ?? 0) + 1,
      services: { connect: serviceIds.map((id) => ({ id })) },
    },
  });
  await logAction(session, "promocion.crear", "Promotion", promotion.id, promotion.name);

  revalidatePath("/admin/promociones");
  revalidatePath("/promociones");
  revalidatePath("/");
  redirect("/admin/promociones");
}

export async function updatePromotion(id: string, formData: FormData) {
  const session = await requireAdminSession();
  const { serviceIds, ...data } = parseFormData(formData);

  await prisma.promotion.update({
    where: { id },
    data: { ...data, services: { set: serviceIds.map((sid) => ({ id: sid })) } },
  });
  await logAction(session, "promocion.editar", "Promotion", id, data.name);

  revalidatePath("/admin/promociones");
  revalidatePath("/promociones");
  revalidatePath("/");
  redirect("/admin/promociones");
}

export async function deletePromotion(id: string) {
  const session = await requireAdminSession();
  const deleted = await prisma.promotion.delete({ where: { id } });
  await logAction(session, "promocion.eliminar", "Promotion", id, deleted.name);
  revalidatePath("/admin/promociones");
  revalidatePath("/promociones");
  revalidatePath("/");
}

export async function setPromotionStatus(id: string, status: "DRAFT" | "PUBLISHED") {
  const session = await requireAdminSession();
  const promotion = await prisma.promotion.update({ where: { id }, data: { status } });
  await logAction(
    session,
    status === "PUBLISHED" ? "promocion.publicar" : "promocion.despublicar",
    "Promotion",
    id,
    promotion.name
  );
  revalidatePath("/admin/promociones");
  revalidatePath("/promociones");
  revalidatePath("/");
}

export async function movePromotion(id: string, direction: "up" | "down") {
  await requireAdminSession();
  const promotions = await prisma.promotion.findMany({ orderBy: { order: "asc" } });
  const index = promotions.findIndex((p) => p.id === id);
  const swapWith = direction === "up" ? index - 1 : index + 1;

  if (index === -1 || swapWith < 0 || swapWith >= promotions.length) return;

  const a = promotions[index];
  const b = promotions[swapWith];

  await prisma.$transaction([
    prisma.promotion.update({ where: { id: a.id }, data: { order: b.order } }),
    prisma.promotion.update({ where: { id: b.id }, data: { order: a.order } }),
  ]);

  revalidatePath("/admin/promociones");
  revalidatePath("/promociones");
  revalidatePath("/");
}
