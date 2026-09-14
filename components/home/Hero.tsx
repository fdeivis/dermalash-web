import Image from "next/image";
import Link from "next/link";
import { branding, whatsappLink } from "@/lib/branding";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-brand-border bg-brand-surface">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 12% 15%, var(--brand-ink) 0, transparent 40%), radial-gradient(circle at 88% 85%, var(--brand-accent) 0, transparent 45%)",
        }}
      />
      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 md:grid-cols-2 md:py-28">
        <div className="flex flex-col items-start gap-6">
          <p className="text-sm uppercase tracking-widest text-brand-accent">
            {branding.tagline}
          </p>
          <h1 className="max-w-2xl font-display text-4xl leading-tight md:text-5xl">
            Belleza y bienestar en un espacio pensado para vos
          </h1>
          <p className="max-w-xl text-brand-muted">
            Tratamientos estéticos profesionales en un ambiente elegante y cercano. Conocé
            nuestros servicios y reservá tu cita por WhatsApp.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/tratamientos">
              <Button size="lg">Ver tratamientos</Button>
            </Link>
            <a
              href={whatsappLink("Hola, quisiera reservar una cita")}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="lg" variant="outline">
                Reservar por WhatsApp
              </Button>
            </a>
          </div>
        </div>

        {branding.logoUrl && (
          <div className="relative mx-auto aspect-square w-full max-w-sm md:ml-auto">
            <Image
              src={branding.logoUrl}
              alt={branding.siteName}
              fill
              priority
              sizes="(min-width: 768px) 384px, 320px"
              className="object-contain drop-shadow-xl"
            />
          </div>
        )}
      </div>
    </section>
  );
}
