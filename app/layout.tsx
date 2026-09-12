import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import { branding } from "@/lib/branding";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${display.variable} ${body.variable} font-body`}>
        <Providers>
          <SiteChrome>{children}</SiteChrome>
        </Providers>
      </body>
    </html>
  );
}
