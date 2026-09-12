import { notFound } from "next/navigation";
import Image from "next/image";
import { getPromotionBySlug } from "@/lib/content";
import { formatPrice } from "@/lib/utils";
import { whatsappLink } from "@/lib/branding";
import { Button } from "@/components/ui/button";

const dateFormatter = new Intl.DateTimeFormat("es-PE", { dateStyle: "long" });

export const revalidate = 60;

export default async function PromotionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const promotion = await getPromotionBySlug(slug);
  if (!promotion) notFound();

  const image = promotion.images[0];

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-brand bg-brand-surface">
        {image ? (
          <Image src={image} alt={promotion.name} fill className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-brand-muted">
            Sin imagen
          </div>
        )}
      </div>

      <h1 className="mt-8 font-display text-3xl md:text-4xl">{promotion.name}</h1>

      <p className="mt-3 text-brand-muted">
        Válido del {dateFormatter.format(promotion.startDate)} al{" "}
        {dateFormatter.format(promotion.endDate)}
      </p>

      {promotion.promoPrice && (
        <p className="mt-2 text-xl font-medium text-brand-accent">
          {formatPrice(promotion.promoPrice.toString())}
        </p>
      )}

      <p className="mt-6 whitespace-pre-line text-brand-ink">{promotion.description}</p>

      {promotion.conditions && (
        <p className="mt-4 text-sm text-brand-muted">Condiciones: {promotion.conditions}</p>
      )}

      {promotion.services.length > 0 && (
        <div className="mt-6">
          <h2 className="font-display text-lg">Aplica a</h2>
          <ul className="mt-2 list-inside list-disc text-brand-ink">
            {promotion.services.map((service) => (
              <li key={service.id}>{service.name}</li>
            ))}
          </ul>
        </div>
      )}

      <a
        href={whatsappLink(`Hola, quisiera consultar por la promoción "${promotion.name}"`)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-8 inline-block"
      >
        <Button size="lg">Consultar por WhatsApp</Button>
      </a>
    </div>
  );
}
