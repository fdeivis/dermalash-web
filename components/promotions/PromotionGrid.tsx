import type { Promotion } from "@prisma/client";
import { PromotionCard } from "@/components/promotions/PromotionCard";

export function PromotionGrid({ promotions }: { promotions: Promotion[] }) {
  if (promotions.length === 0) {
    return (
      <p className="text-center text-brand-muted">
        No hay promociones vigentes en este momento.
      </p>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {promotions.map((promotion) => (
        <PromotionCard key={promotion.id} promotion={promotion} />
      ))}
    </div>
  );
}
