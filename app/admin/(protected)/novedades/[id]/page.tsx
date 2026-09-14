import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PostForm } from "@/components/admin/PostForm";
import { requirePagePermission } from "@/lib/auth";
import { updatePost } from "../actions";

export default async function EditarNovedadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePagePermission("novedades.gestionar");
  const { id } = await params;
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) notFound();

  return (
    <div>
      <h1 className="font-display text-2xl">Editar novedad</h1>
      <div className="mt-6">
        <PostForm post={post} action={updatePost.bind(null, post.id)} />
      </div>
    </div>
  );
}
