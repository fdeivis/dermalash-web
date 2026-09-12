import type { Metadata } from "next";
import { getActivePromotions } from "@/lib/content";
import { PromotionGrid } from "@/components/promotions/PromotionGrid";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Promociones — Dermalash",
};

export default async function PromocionesPage() {
  const promotions = await getActivePromotions();

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="font-display text-3xl md:text-4xl">Promociones</h1>
      <p className="mt-2 max-w-2xl text-brand-muted">Promociones vigentes por tiempo limitado.</p>
      <div className="mt-10">
        <PromotionGrid promotions={promotions} />
      </div>
    </div>
  );
}
