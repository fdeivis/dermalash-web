import type { Post } from "@prisma/client";
import { Button } from "@/components/ui/button";

export function PostForm({
  post,
  action,
}: {
  post?: Post;
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <form action={action} className="max-w-xl space-y-5">
      <div>
        <label className="block text-sm font-medium">Título</label>
        <input
          name="title"
          required
          defaultValue={post?.title}
          className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Resumen</label>
        <textarea
          name="excerpt"
          required
          rows={2}
          defaultValue={post?.excerpt}
          className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Contenido</label>
        <textarea
          name="content"
          required
          rows={8}
          defaultValue={post?.content}
          className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Imagen de portada (URL, opcional)</label>
        <input
          type="url"
          name="coverImage"
          defaultValue={post?.coverImage ?? undefined}
          placeholder="https://..."
          className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
        />
      </div>

      <Button type="submit">{post ? "Guardar cambios" : "Crear novedad"}</Button>
    </form>
  );
}
