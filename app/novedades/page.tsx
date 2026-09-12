import type { Metadata } from "next";
import { getPublishedPosts } from "@/lib/content";
import { PostGrid } from "@/components/posts/PostGrid";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Novedades — Dermalash",
};

export default async function NovedadesPage() {
  const posts = await getPublishedPosts();

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="font-display text-3xl md:text-4xl">Novedades</h1>
      <p className="mt-2 max-w-2xl text-brand-muted">Noticias y novedades de Dermalash.</p>
      <div className="mt-10">
        <PostGrid posts={posts} />
      </div>
    </div>
  );
}
