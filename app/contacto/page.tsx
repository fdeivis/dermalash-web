import type { Metadata } from "next";
import { Instagram } from "lucide-react";
import { branding, whatsappLink } from "@/lib/branding";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Contacto — Dermalash",
};

export default function ContactoPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="font-display text-3xl md:text-4xl">Contacto y reservas</h1>
      <p className="mt-4 text-brand-muted">
        La forma más rápida de reservar tu cita o hacer una consulta es por WhatsApp.
      </p>
      <a
        href={whatsappLink("Hola, quisiera hacer una consulta")}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-8 inline-block"
      >
        <Button size="lg">Escribir por WhatsApp</Button>
      </a>

      {branding.contact.email && (
        <p className="mt-6 text-sm text-brand-muted">
          También puedes escribirnos a {branding.contact.email}
        </p>
      )}

      {branding.social.instagram && (
        <a
          href={`https://instagram.com/${branding.social.instagram}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 flex items-center justify-center gap-1.5 text-sm text-brand-muted hover:text-brand-accent"
        >
          <Instagram className="h-4 w-4" />
          Síguenos en Instagram @{branding.social.instagram}
        </a>
      )}
    </div>
  );
}
