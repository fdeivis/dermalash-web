"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { uniqueSlug } from "@/lib/slug";
import { requirePermission } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { deleteImage } from "@/lib/supabase";

const postSchema = z.object({
  title: z.string().min(1, "El título es obligatorio"),
  excerpt: z.string().min(1, "El resumen es obligatorio").max(500, "Máximo 500 caracteres"),
  content: z.string().min(1, "El contenido es obligatorio").max(20000, "Máximo 20000 caracteres"),
  coverImage: z.string().url().optional().or(z.literal("")),
});

function parseFormData(formData: FormData) {
  return postSchema.parse({
    title: formData.get("title"),
    excerpt: formData.get("excerpt"),
    content: formData.get("content"),
    coverImage: formData.get("coverImage") || "",
  });
}

export async function createPost(formData: FormData) {
  const session = await requirePermission("novedades.gestionar");
  const data = parseFormData(formData);
  const slug = await uniqueSlug(
    data.title,
    async (s) => (await prisma.post.count({ where: { slug: s } })) > 0
  );

  const post = await prisma.post.create({
    data: { ...data, coverImage: data.coverImage || null, slug },
  });
  await logAction(session, "novedad.crear", "Post", post.id, post.title);

  revalidatePath("/admin/novedades");
  revalidatePath("/novedades");
  redirect("/admin/novedades");
}

export async function updatePost(id: string, formData: FormData) {
  const session = await requirePermission("novedades.gestionar");
  const data = parseFormData(formData);
  const previous = await prisma.post.findUniqueOrThrow({ where: { id } });
  const newCoverImage = data.coverImage || null;

  await prisma.post.update({
    where: { id },
    data: { ...data, coverImage: newCoverImage },
  });
  await logAction(session, "novedad.editar", "Post", id, data.title);

  if (previous.coverImage && previous.coverImage !== newCoverImage) {
    await deleteImage(previous.coverImage).catch(() => {});
  }

  revalidatePath("/admin/novedades");
  revalidatePath("/novedades");
  redirect("/admin/novedades");
}

export async function deletePost(id: string) {
  const session = await requirePermission("novedades.gestionar");
  const deleted = await prisma.post.delete({ where: { id } });
  await logAction(session, "novedad.eliminar", "Post", id, deleted.title);
  if (deleted.coverImage) await deleteImage(deleted.coverImage).catch(() => {});
  revalidatePath("/admin/novedades");
  revalidatePath("/novedades");
}

export async function setPostStatus(id: string, status: "DRAFT" | "PUBLISHED") {
  const session = await requirePermission("novedades.gestionar");
  const post = await prisma.post.update({
    where: { id },
    data: {
      status,
      publishedAt: status === "PUBLISHED" ? new Date() : null,
    },
  });
  await logAction(
    session,
    status === "PUBLISHED" ? "novedad.publicar" : "novedad.despublicar",
    "Post",
    id,
    post.title
  );
  revalidatePath("/admin/novedades");
  revalidatePath("/novedades");
}
