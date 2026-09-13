import Link from "next/link";
import Image from "next/image";
import type { Service } from "@prisma/client";
import { formatPrice } from "@/lib/utils";

export function TreatmentCard({ service }: { service: Service }) {
  const image = service.images[0];

  return (
    <Link
      href={`/tratamientos/${service.slug}`}
      className="group block overflow-hidden rounded-brand border border-brand-border bg-brand-surface shadow-sm transition-shadow hover:shadow-xl"
    >
      <div className="relative aspect-[4/3] w-full bg-brand-bg">
        {image ? (
          <Image
            src={image}
            alt={service.name}
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
        <h3 className="font-display text-lg">{service.name}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-brand-muted">{service.description}</p>
        <div className="mt-3 flex items-center justify-between text-sm">
          {service.durationMinutes && (
            <span className="text-brand-muted">{service.durationMinutes} min</span>
          )}
          <span className="font-medium text-brand-accent">
            {service.priceFrom && "Desde "}
            {formatPrice(service.price.toString())}
          </span>
        </div>
      </div>
    </Link>
  );
}
