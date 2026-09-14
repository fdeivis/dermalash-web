import Image from "next/image";
import Link from "next/link";
import { branding } from "@/lib/branding";

export function SiteFooter() {
  return (
    <footer className="border-t border-brand-border bg-brand-surface">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3">
        <div>
          {branding.logoUrl ? (
            <Image
              src={branding.logoUrl}
              alt={branding.siteName}
              width={1254}
              height={1254}
              className="h-9 w-auto"
            />
          ) : (
            <p className="font-display text-lg">{branding.siteName}</p>
          )}
          <p className="mt-2 text-sm text-brand-muted">{branding.tagline}</p>
        </div>
        <div className="text-sm text-brand-muted">
          <p>{branding.contact.address}</p>
          <p>{branding.contact.schedule}</p>
        </div>
        <div className="flex gap-4 text-sm">
          <Link href="/contacto" className="text-brand-ink hover:text-brand-accent">
            Contacto
          </Link>
          <Link href="/ubicacion" className="text-brand-ink hover:text-brand-accent">
            Ubicación
          </Link>
          <Link href="/admin" className="text-brand-muted hover:text-brand-accent">
            Administración
          </Link>
        </div>
      </div>
      <div className="border-t border-brand-border px-4 py-4 text-center text-xs text-brand-muted">
        © {new Date().getFullYear()} {branding.siteName}. Todos los derechos reservados.
      </div>
    </footer>
  );
}
