/**
 * Identidad de marca centralizada — reemplazar acá, no en los
 * componentes. Los colores reales viven como CSS vars en
 * app/globals.css.
 */
export const branding = {
  siteName: "Dermalash",
  tagline: "Centro estético en Lima, Perú",
  // Logo sobre fondo transparente: para el header y footer del sitio
  // público (fondos claros).
  logoUrl: "/brand/logo-transparente.png" as string | null,
  // Versión con fondo propio (medallón dorado sobre marfil): para momentos
  // "hero" como el login del panel, donde el logo se luce como imagen completa.
  logoWithBgUrl: "/brand/logo-confondo.png" as string | null,
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "51999999999",
  contact: {
    address: "Jirón Carlos Monge 449, Los Olivos, Lima, Perú",
    schedule: "Por definir",
    email: null as string | null,
  },
  social: {
    instagram: "dermalash.pe" as string | null,
    facebook: null as string | null,
  },
};

export function whatsappLink(message?: string) {
  const base = `https://wa.me/${branding.whatsappNumber}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
