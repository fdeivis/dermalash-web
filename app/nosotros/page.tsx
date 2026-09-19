import type { Metadata } from "next";
import { branding } from "@/lib/branding";

export const metadata: Metadata = {
  title: "Nosotros — Dermalash",
};

export default function NosotrosPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-display text-3xl md:text-4xl">Nosotros</h1>
      <p className="mt-6 text-brand-ink">
        {branding.siteName} es un centro estético en Lima, Perú, dedicado a brindar
        tratamientos de calidad en un ambiente elegante y cercano.
      </p>
      <p className="mt-4 text-brand-muted">
        Combinamos técnicas modernas con atención personalizada, cuidando cada detalle para
        que tu experiencia sea cómoda, segura y con resultados que se noten. Te acompañamos
        en cada sesión con un equipo dedicado a tu piel y a tu confianza.
      </p>
    </div>
  );
}
