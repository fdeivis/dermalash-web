import { PostForm } from "@/components/admin/PostForm";
import { requirePagePermission } from "@/lib/auth";
import { createPost } from "../actions";

export default async function NuevaNovedadPage() {
  await requirePagePermission("novedades.gestionar");
  return (
    <div>
      <h1 className="font-display text-2xl">Nueva novedad</h1>
      <div className="mt-6">
        <PostForm action={createPost} />
      </div>
    </div>
  );
}
