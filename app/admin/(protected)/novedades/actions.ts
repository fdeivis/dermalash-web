"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { uniqueSlug } from "@/lib/slug";
import { requireAdminSession } from "@/lib/auth";
import { logAction } from "@/lib/audit";

const postSchema = z.object({
  title: z.string().min(1, "El título es obligatorio"),
  excerpt: z.string().min(1, "El resumen es obligatorio"),
  content: z.string().min(1, "El contenido es obligatorio"),
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
  const session = await requireAdminSession();
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
  const session = await requireAdminSession();
  const data = parseFormData(formData);

  await prisma.post.update({
    where: { id },
    data: { ...data, coverImage: data.coverImage || null },
  });
  await logAction(session, "novedad.editar", "Post", id, data.title);

  revalidatePath("/admin/novedades");
  revalidatePath("/novedades");
  redirect("/admin/novedades");
}

export async function deletePost(id: string) {
  const session = await requireAdminSession();
  const deleted = await prisma.post.delete({ where: { id } });
  await logAction(session, "novedad.eliminar", "Post", id, deleted.title);
  revalidatePath("/admin/novedades");
  revalidatePath("/novedades");
}

export async function setPostStatus(id: string, status: "DRAFT" | "PUBLISHED") {
  const session = await requireAdminSession();
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
