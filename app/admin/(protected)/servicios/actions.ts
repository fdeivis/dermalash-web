"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { uniqueSlug } from "@/lib/slug";
import { requirePermission } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { deleteImage } from "@/lib/supabase";

const serviceSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  description: z.string().min(1, "La descripción es obligatoria").max(5000, "Máximo 5000 caracteres"),
  durationMinutes: z.coerce.number().int().positive(),
  price: z.coerce.number().nonnegative(),
  priceFrom: z.boolean(),
  images: z.array(z.string().url()),
  showInCarousel: z.boolean(),
  carouselImage: z.string().url().nullable(),
});

function parseFormData(formData: FormData) {
  const carouselImage = String(formData.get("carouselImage") ?? "").trim();
  return serviceSchema.parse({
    name: formData.get("name"),
    description: formData.get("description"),
    durationMinutes: formData.get("durationMinutes") || undefined,
    price: formData.get("price"),
    priceFrom: formData.get("priceFrom") === "on",
    images: formData.getAll("images").filter((v) => String(v).trim().length > 0),
    showInCarousel: formData.get("showInCarousel") === "on",
    carouselImage: carouselImage.length > 0 ? carouselImage : null,
  });
}

export async function createService(formData: FormData) {
  const session = await requirePermission("servicios.gestionar");
  const data = parseFormData(formData);
  const slug = await uniqueSlug(
    data.name,
    async (s) => (await prisma.service.count({ where: { slug: s } })) > 0
  );
  const last = await prisma.service.findFirst({ orderBy: { order: "desc" } });

  const service = await prisma.service.create({
    data: { ...data, slug, order: (last?.order ?? 0) + 1 },
  });
  await logAction(session, "servicio.crear", "Service", service.id, service.name);

  revalidatePath("/admin/servicios");
  revalidatePath("/tratamientos");
  revalidatePath("/");
  redirect("/admin/servicios");
}

export async function updateService(id: string, formData: FormData) {
  const session = await requirePermission("servicios.gestionar");
  const data = parseFormData(formData);
  const previous = await prisma.service.findUniqueOrThrow({ where: { id } });
  await prisma.service.update({ where: { id }, data });
  await logAction(session, "servicio.editar", "Service", id, data.name);

  const droppedImages = previous.images.filter((url) => !data.images.includes(url));
  const droppedCarouselImage =
    previous.carouselImage && previous.carouselImage !== data.carouselImage
      ? previous.carouselImage
      : null;
  await Promise.all(
    [...droppedImages, droppedCarouselImage]
      .filter((url): url is string => !!url)
      .map((url) => deleteImage(url).catch(() => {}))
  );

  revalidatePath("/admin/servicios");
  revalidatePath("/tratamientos");
  revalidatePath("/");
  redirect("/admin/servicios");
}

export async function deleteService(id: string) {
  const session = await requirePermission("servicios.gestionar");
  let deleted: Awaited<ReturnType<typeof prisma.service.delete>>;
  try {
    deleted = await prisma.service.delete({ where: { id } });
  } catch (error) {
    // El servicio tiene sesiones registradas (ON DELETE RESTRICT): no se
    // borra el historial. Se informa en vez de romper la página.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      redirect("/admin/servicios?error=tiene-sesiones");
    }
    throw error;
  }
  await logAction(session, "servicio.eliminar", "Service", id, deleted.name);
  await Promise.all(
    [...deleted.images, deleted.carouselImage]
      .filter((url): url is string => !!url)
      .map((url) => deleteImage(url).catch(() => {}))
  );

  revalidatePath("/admin/servicios");
  revalidatePath("/tratamientos");
  revalidatePath("/");
  redirect("/admin/servicios");
}

const STATUS_ACTION: Record<"DRAFT" | "ACTIVO" | "PUBLISHED", string> = {
  DRAFT: "servicio.marcar_borrador",
  ACTIVO: "servicio.activar",
  PUBLISHED: "servicio.publicar",
};

export async function setServiceStatus(id: string, status: "DRAFT" | "ACTIVO" | "PUBLISHED") {
  const session = await requirePermission("servicios.gestionar");
  const service = await prisma.service.update({ where: { id }, data: { status } });
  await logAction(session, STATUS_ACTION[status], "Service", id, service.name);
  revalidatePath("/admin/servicios");
  revalidatePath("/tratamientos");
  revalidatePath("/");
}

export async function moveService(id: string, direction: "up" | "down") {
  await requirePermission("servicios.gestionar");
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
  revalidatePath("/");
}
