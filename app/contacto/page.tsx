import type { Metadata } from "next";
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
          También podés escribirnos a {branding.contact.email}
        </p>
      )}
    </div>
  );
}
