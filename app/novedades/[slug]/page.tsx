import { notFound } from "next/navigation";
import Image from "next/image";
import { getPostBySlug } from "@/lib/content";

const dateFormatter = new Intl.DateTimeFormat("es-PE", { dateStyle: "long" });

export const revalidate = 60;

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  return (
    <article className="mx-auto max-w-3xl px-4 py-16">
      {post.coverImage && (
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-brand bg-brand-surface">
          <Image src={post.coverImage} alt={post.title} fill className="object-cover" />
        </div>
      )}
      {post.publishedAt && (
        <p className="mt-6 text-sm text-brand-muted">{dateFormatter.format(post.publishedAt)}</p>
      )}
      <h1 className="mt-2 font-display text-3xl md:text-4xl">{post.title}</h1>
      <div className="mt-6 whitespace-pre-line text-brand-ink">{post.content}</div>
    </article>
  );
}
