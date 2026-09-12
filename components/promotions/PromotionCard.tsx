import Link from "next/link";
import Image from "next/image";
import type { Promotion } from "@prisma/client";
import { formatPrice } from "@/lib/utils";

const dateFormatter = new Intl.DateTimeFormat("es-PE", { dateStyle: "long" });

export function PromotionCard({ promotion }: { promotion: Promotion }) {
  const image = promotion.images[0];

  return (
    <Link
      href={`/promociones/${promotion.slug}`}
      className="group block overflow-hidden rounded-brand border border-brand-border bg-brand-surface transition-shadow hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] w-full bg-brand-bg">
        {image ? (
          <Image
            src={image}
            alt={promotion.name}
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
        <h3 className="font-display text-lg">{promotion.name}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-brand-muted">{promotion.description}</p>
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-brand-muted">
            Válido hasta {dateFormatter.format(promotion.endDate)}
          </span>
          {promotion.promoPrice && (
            <span className="font-medium text-brand-accent">
              {formatPrice(promotion.promoPrice.toString())}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
