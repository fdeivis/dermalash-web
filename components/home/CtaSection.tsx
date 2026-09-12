import { whatsappLink } from "@/lib/branding";
import { Button } from "@/components/ui/button";

export function CtaSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 text-center">
      <h2 className="font-display text-2xl md:text-3xl">¿Lista para tu próxima sesión?</h2>
      <p className="mx-auto mt-2 max-w-md text-brand-muted">
        Escribinos por WhatsApp y coordinamos el mejor horario para vos.
      </p>
      <a
        href={whatsappLink("Hola, quisiera reservar una cita")}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 inline-block"
      >
        <Button size="lg">Escribir por WhatsApp</Button>
      </a>
    </section>
  );
}
