"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { uniqueSlug } from "@/lib/slug";
import { requireAdminSession } from "@/lib/auth";

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
  await requireAdminSession();
  const data = parseFormData(formData);
  const slug = await uniqueSlug(
    data.title,
    async (s) => (await prisma.post.count({ where: { slug: s } })) > 0
  );

  await prisma.post.create({
    data: { ...data, coverImage: data.coverImage || null, slug },
  });

  revalidatePath("/admin/novedades");
  revalidatePath("/novedades");
  redirect("/admin/novedades");
}

export async function updatePost(id: string, formData: FormData) {
  await requireAdminSession();
  const data = parseFormData(formData);

  await prisma.post.update({
    where: { id },
    data: { ...data, coverImage: data.coverImage || null },
  });

  revalidatePath("/admin/novedades");
  revalidatePath("/novedades");
  redirect("/admin/novedades");
}

export async function deletePost(id: string) {
  await requireAdminSession();
  await prisma.post.delete({ where: { id } });
  revalidatePath("/admin/novedades");
  revalidatePath("/novedades");
}

export async function setPostStatus(id: string, status: "DRAFT" | "PUBLISHED") {
  await requireAdminSession();
  await prisma.post.update({
    where: { id },
    data: {
      status,
      publishedAt: status === "PUBLISHED" ? new Date() : null,
    },
  });
  revalidatePath("/admin/novedades");
  revalidatePath("/novedades");
}
