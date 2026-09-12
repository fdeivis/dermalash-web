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
      <div className="mt-8 flex aspect-video items-center justify-center rounded-brand border border-dashed border-brand-border text-sm text-brand-muted">
        [Mapa pendiente: se agrega el embed cuando esté definida la dirección
        oficial]
      </div>
    </div>
  );
}
