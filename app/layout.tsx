import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import { branding } from "@/lib/branding";
import { hasActivePromotions } from "@/lib/content";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { Providers } from "@/app/providers";
import "./globals.css";

const display = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${branding.siteName} — ${branding.tagline}`,
  description:
    "Dermalash, centro estético en Lima, Perú. Tratamientos, promociones y reservas por WhatsApp.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // El menú solo muestra "Promociones" si hay alguna vigente hoy — mismo
  // criterio que usa /promociones para decidir qué mostrar, así el link
  // nunca lleva a una página vacía.
  const showPromotions = await hasActivePromotions();

  return (
    <html lang="es">
      <body className={`${display.variable} ${body.variable} font-body`}>
        <Providers>
          <SiteChrome hasActivePromotions={showPromotions}>{children}</SiteChrome>
        </Providers>
      </body>
    </html>
  );
}
