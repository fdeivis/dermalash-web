"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type CarouselService = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
};

const AUTOPLAY_MS = 5000;

export function ServicesCarousel({ services }: { services: CarouselService[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = services.length;

  const goTo = useCallback(
    (i: number) => setIndex(((i % count) + count) % count),
    [count],
  );

  useEffect(() => {
    if (count <= 1 || paused) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [count, paused]);

  if (count === 0) return null;

  return (
    <section
      className="relative overflow-hidden bg-brand-ink"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative h-[38vh] max-h-[320px] min-h-[200px] w-full sm:h-[42vh] sm:max-h-[380px] md:h-[45vh] md:max-h-[440px]">
        <div
          className="flex h-full transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {services.map((service) => (
            <Link
              key={service.id}
              href={`/tratamientos/${service.slug}`}
              className="relative h-full w-full flex-shrink-0"
            >
              {service.image ? (
                <Image
                  src={service.image}
                  alt={service.name}
                  fill
                  sizes="100vw"
                  className="object-cover"
                />
              ) : (
                <div className="h-full w-full bg-brand-muted" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 md:p-8">
                <p className="text-xs uppercase tracking-widest text-brand-accent md:text-sm">
                  Tratamiento
                </p>
                <h3 className="mt-1 max-w-xl font-display text-xl text-white drop-shadow-sm md:text-3xl">
                  {service.name}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            aria-label="Tratamiento anterior"
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-2 text-white backdrop-blur transition-colors hover:bg-white/30 md:left-6 md:p-3"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            aria-label="Siguiente tratamiento"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-2 text-white backdrop-blur transition-colors hover:bg-white/30 md:right-6 md:p-3"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2 md:bottom-6">
            {services.map((service, i) => (
              <button
                key={service.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Ir al tratamiento ${i + 1}`}
                className={`h-2 rounded-full transition-all ${
                  i === index ? "w-6 bg-brand-accent" : "w-2 bg-white/50 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
