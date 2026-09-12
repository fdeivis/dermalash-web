import Link from "next/link";
import { branding, whatsappLink } from "@/lib/branding";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="border-b border-brand-border bg-brand-surface">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-20 md:py-28">
        <p className="text-sm uppercase tracking-widest text-brand-accent">
          {branding.tagline}
        </p>
        <h1 className="max-w-2xl font-display text-4xl leading-tight md:text-5xl">
          Belleza y bienestar en un espacio pensado para vos
        </h1>
        <p className="max-w-xl text-brand-muted">
          Tratamientos estéticos profesionales en un ambiente elegante y cercano.
          Conocé nuestros servicios y reservá tu cita por WhatsApp.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/tratamientos">
            <Button size="lg">Ver tratamientos</Button>
          </Link>
          <a href={whatsappLink("Hola, quisiera reservar una cita")} target="_blank" rel="noopener noreferrer">
            <Button size="lg" variant="outline">
              Reservar por WhatsApp
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}
