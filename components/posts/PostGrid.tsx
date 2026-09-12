import type { Post } from "@prisma/client";
import { PostCard } from "@/components/posts/PostCard";

export function PostGrid({ posts }: { posts: Post[] }) {
  if (posts.length === 0) {
    return <p className="text-center text-brand-muted">Todavía no hay novedades publicadas.</p>;
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
