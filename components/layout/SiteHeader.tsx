import Link from "next/link";
import { branding } from "@/lib/branding";

const NAV_LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/tratamientos", label: "Tratamientos" },
  { href: "/promociones", label: "Promociones" },
  { href: "/novedades", label: "Novedades" },
  { href: "/nosotros", label: "Nosotros" },
  { href: "/ubicacion", label: "Ubicación" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-brand-border bg-brand-bg/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="font-display text-xl tracking-wide">
          {branding.siteName}
        </Link>
        <nav className="hidden gap-6 text-sm md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-brand-muted transition-colors hover:text-brand-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/contacto"
          className="rounded-brand bg-brand-accent px-4 py-2 text-sm font-medium text-brand-accent-ink hover:opacity-90"
        >
          Reservar
        </Link>
      </div>
    </header>
  );
}
