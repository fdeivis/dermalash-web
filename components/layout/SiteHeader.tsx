import Image from "next/image";
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

export function SiteHeader({ hasActivePromotions }: { hasActivePromotions: boolean }) {
  const links = hasActivePromotions
    ? NAV_LINKS
    : NAV_LINKS.filter((link) => link.href !== "/promociones");

  return (
    <header className="sticky top-0 z-40 border-b border-brand-border bg-brand-bg/90 shadow-sm backdrop-blur">
      <div className="mx-auto flex h-24 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center">
          {branding.logoUrl ? (
            <Image
              src={branding.logoUrl}
              alt={branding.siteName}
              width={1254}
              height={1254}
              priority
              className="h-16 w-auto md:h-[4.5rem]"
            />
          ) : (
            <span className="font-display text-xl tracking-wide">{branding.siteName}</span>
          )}
        </Link>
        <nav className="hidden gap-6 text-sm md:flex">
          {links.map((link) => (
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
