import Link from "next/link";
import Image from "next/image";
import type { Post } from "@prisma/client";

const dateFormatter = new Intl.DateTimeFormat("es-PE", { dateStyle: "long" });

export function PostCard({ post }: { post: Post }) {
  return (
    <Link
      href={`/novedades/${post.slug}`}
      className="group block overflow-hidden rounded-brand border border-brand-border bg-brand-surface transition-shadow hover:shadow-lg"
    >
      <div className="relative aspect-[16/9] w-full bg-brand-bg">
        {post.coverImage ? (
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-brand-muted">
            Sin imagen
          </div>
        )}
      </div>
      <div className="p-5">
        {post.publishedAt && (
          <p className="text-xs text-brand-muted">{dateFormatter.format(post.publishedAt)}</p>
        )}
        <h3 className="mt-1 font-display text-lg">{post.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-brand-muted">{post.excerpt}</p>
      </div>
    </Link>
  );
}
