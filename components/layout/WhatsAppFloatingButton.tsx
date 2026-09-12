import { MessageCircle } from "lucide-react";
import { whatsappLink } from "@/lib/branding";

export function WhatsAppFloatingButton() {
  return (
    <a
      href={whatsappLink("Hola, quisiera consultar por un tratamiento en Dermalash")}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contactar por WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105"
    >
      <MessageCircle className="h-7 w-7" strokeWidth={2} />
    </a>
  );
}
