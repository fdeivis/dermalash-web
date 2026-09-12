/**
 * Identidad de marca centralizada. Placeholder hasta contar con el
 * logo, paleta y textos definitivos de Dermalash — reemplazar acá,
 * no en los componentes. Los colores reales viven como CSS vars en
 * app/globals.css.
 */
export const branding = {
  siteName: "Dermalash",
  tagline: "Centro estético en Lima, Perú",
  logoUrl: null as string | null, // null => se muestra el nombre en texto
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "51999999999",
  contact: {
    address: "Por definir",
    schedule: "Por definir",
    email: null as string | null,
  },
  social: {
    instagram: null as string | null,
    facebook: null as string | null,
  },
};

export function whatsappLink(message?: string) {
  const base = `https://wa.me/${branding.whatsappNumber}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
