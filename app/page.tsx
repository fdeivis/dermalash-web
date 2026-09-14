import { getPublishedServices, getCarouselServices, getActivePromotions } from "@/lib/content";
import { Hero } from "@/components/home/Hero";
import { ServicesCarousel } from "@/components/home/ServicesCarousel";
import { FeaturedTreatments } from "@/components/home/FeaturedTreatments";
import { PromotionsStrip } from "@/components/home/PromotionsStrip";
import { CtaSection } from "@/components/home/CtaSection";

export const revalidate = 60;

export default async function HomePage() {
  const [services, carouselServices, promotions] = await Promise.all([
    getPublishedServices(),
    getCarouselServices(),
    getActivePromotions(),
  ]);

  return (
    <>
      <ServicesCarousel
        services={carouselServices.map((service) => ({
          id: service.id,
          name: service.name,
          slug: service.slug,
          image: service.carouselImage ?? service.images[0] ?? null,
        }))}
      />
      <Hero />
      <FeaturedTreatments services={services.slice(0, 6)} />
      <PromotionsStrip promotions={promotions.slice(0, 3)} />
      <CtaSection />
    </>
  );
}
