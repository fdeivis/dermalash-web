"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { uniqueSlug } from "@/lib/slug";
import { requireAdminSession } from "@/lib/auth";

const serviceSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  description: z.string().min(1, "La descripción es obligatoria"),
  durationMinutes: z.coerce.number().int().positive().optional(),
  price: z.coerce.number().nonnegative(),
  priceFrom: z.boolean(),
  images: z.array(z.string().url()),
});

function parseFormData(formData: FormData) {
  return serviceSchema.parse({
    name: formData.get("name"),
    description: formData.get("description"),
    durationMinutes: formData.get("durationMinutes") || undefined,
    price: formData.get("price"),
    priceFrom: formData.get("priceFrom") === "on",
    images: formData.getAll("images").filter((v) => String(v).trim().length > 0),
  });
}

export async function createService(formData: FormData) {
  await requireAdminSession();
  const data = parseFormData(formData);
  const slug = await uniqueSlug(
    data.name,
    async (s) => (await prisma.service.count({ where: { slug: s } })) > 0
  );
  const last = await prisma.service.findFirst({ orderBy: { order: "desc" } });

  await prisma.service.create({ data: { ...data, slug, order: (last?.order ?? 0) + 1 } });

  revalidatePath("/admin/servicios");
  revalidatePath("/tratamientos");
  redirect("/admin/servicios");
}

export async function updateService(id: string, formData: FormData) {
  await requireAdminSession();
  const data = parseFormData(formData);
  await prisma.service.update({ where: { id }, data });

  revalidatePath("/admin/servicios");
  revalidatePath("/tratamientos");
  redirect("/admin/servicios");
}

export async function deleteService(id: string) {
  await requireAdminSession();
  await prisma.service.delete({ where: { id } });
  revalidatePath("/admin/servicios");
  revalidatePath("/tratamientos");
}

export async function setServiceStatus(id: string, status: "DRAFT" | "PUBLISHED") {
  await requireAdminSession();
  await prisma.service.update({ where: { id }, data: { status } });
  revalidatePath("/admin/servicios");
  revalidatePath("/tratamientos");
}

export async function moveService(id: string, direction: "up" | "down") {
  await requireAdminSession();
  const services = await prisma.service.findMany({ orderBy: { order: "asc" } });
  const index = services.findIndex((s) => s.id === id);
  const swapWith = direction === "up" ? index - 1 : index + 1;

  if (index === -1 || swapWith < 0 || swapWith >= services.length) return;

  const a = services[index];
  const b = services[swapWith];

  await prisma.$transaction([
    prisma.service.update({ where: { id: a.id }, data: { order: b.order } }),
    prisma.service.update({ where: { id: b.id }, data: { order: a.order } }),
  ]);

  revalidatePath("/admin/servicios");
  revalidatePath("/tratamientos");
}
