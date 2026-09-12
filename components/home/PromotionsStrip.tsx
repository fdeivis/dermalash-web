import Link from "next/link";
import type { Promotion } from "@prisma/client";
import { PromotionGrid } from "@/components/promotions/PromotionGrid";

export function PromotionsStrip({ promotions }: { promotions: Promotion[] }) {
  if (promotions.length === 0) return null;

  return (
    <section className="bg-brand-surface py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="font-display text-2xl md:text-3xl">Promociones vigentes</h2>
          <Link href="/promociones" className="text-sm text-brand-accent hover:underline">
            Ver todas
          </Link>
        </div>
        <PromotionGrid promotions={promotions} />
      </div>
    </section>
  );
}
