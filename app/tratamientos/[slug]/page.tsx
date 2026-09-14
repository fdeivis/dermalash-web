import { notFound } from "next/navigation";
import Image from "next/image";
import { getServiceBySlug } from "@/lib/content";
import { formatPrice } from "@/lib/utils";
import { whatsappLink } from "@/lib/branding";
import { Button } from "@/components/ui/button";

export const revalidate = 60;

export default async function TreatmentDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);
  if (!service) notFound();

  const image = service.images[0];

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-brand bg-brand-surface">
        {image ? (
          <Image src={image} alt={service.name} fill className="object-contain" />
        ) : (
          <div className="flex h-full items-center justify-center text-brand-muted">
            Sin imagen
          </div>
        )}
      </div>

      <h1 className="mt-8 font-display text-3xl md:text-4xl">{service.name}</h1>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-brand-muted">
        {service.durationMinutes && <span>{service.durationMinutes} minutos</span>}
        <span className="font-medium text-brand-accent">
          {service.priceFrom && "Desde "}
          {formatPrice(service.price.toString())}
        </span>
      </div>

      <p className="mt-6 whitespace-pre-line text-brand-ink">{service.description}</p>

      <a
        href={whatsappLink(`Hola, quisiera consultar por el tratamiento "${service.name}"`)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-8 inline-block"
      >
        <Button size="lg">Consultar por WhatsApp</Button>
      </a>
    </div>
  );
}
