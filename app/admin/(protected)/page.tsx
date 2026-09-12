import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboardPage() {
  const [services, promotions, posts] = await Promise.all([
    prisma.service.count(),
    prisma.promotion.count(),
    prisma.post.count(),
  ]);

  const cards = [
    { label: "Servicios", count: services, href: "/admin/servicios" },
    { label: "Promociones", count: promotions, href: "/admin/promociones" },
    { label: "Novedades", count: posts, href: "/admin/novedades" },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl">Dashboard</h1>
      <p className="mt-1 text-sm text-brand-muted">
        Administrá el contenido público de Dermalash.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-brand border border-brand-border bg-brand-surface p-6 hover:shadow-md"
          >
            <p className="text-3xl font-display">{card.count}</p>
            <p className="mt-1 text-sm text-brand-muted">{card.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
