import { getPublishedServices, getActivePromotions } from "@/lib/content";
import { Hero } from "@/components/home/Hero";
import { FeaturedTreatments } from "@/components/home/FeaturedTreatments";
import { PromotionsStrip } from "@/components/home/PromotionsStrip";
import { CtaSection } from "@/components/home/CtaSection";

export const revalidate = 60;

export default async function HomePage() {
  const [services, promotions] = await Promise.all([
    getPublishedServices(),
    getActivePromotions(),
  ]);

  return (
    <>
      <Hero />
      <FeaturedTreatments services={services.slice(0, 6)} />
      <PromotionsStrip promotions={promotions.slice(0, 3)} />
      <CtaSection />
    </>
  );
}
