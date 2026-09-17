import type { Metadata } from "next";
import { branding } from "@/lib/branding";

export const metadata: Metadata = {
  title: "Ubicación — Dermalash",
};

export default function UbicacionPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-display text-3xl md:text-4xl">Ubicación</h1>
      <div className="mt-6 space-y-2 text-brand-ink">
        <p>
          <strong>Dirección:</strong> {branding.contact.address}
        </p>
        <p>
          <strong>Horario:</strong> {branding.contact.schedule}
        </p>
      </div>
      <div className="mt-8 aspect-video overflow-hidden rounded-brand border border-brand-border">
        <iframe
          title="Ubicación de Dermalash en el mapa"
          src={`https://www.google.com/maps?q=${encodeURIComponent(branding.contact.address)}&output=embed`}
          className="h-full w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </div>
  );
}
