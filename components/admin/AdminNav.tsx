"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/servicios", label: "Servicios" },
  { href: "/admin/promociones", label: "Promociones" },
  { href: "/admin/novedades", label: "Novedades" },
  { href: "/admin/clientes", label: "Clientes" },
  { href: "/admin/empleados", label: "Empleados" },
  { href: "/admin/sesiones", label: "Sesiones" },
];

export function AdminNav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <header className="border-b border-brand-border bg-brand-surface">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <nav className="flex items-center gap-6 text-sm">
          <span className="font-display text-lg">Admin</span>
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-muted hover:text-brand-ink"
          >
            ↗ Ver sitio
          </Link>
          {LINKS.map((link) => {
            const active =
              link.href === "/admin" ? pathname === "/admin" : pathname?.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-brand-muted hover:text-brand-ink",
                  active && "font-medium text-brand-ink"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3 text-sm text-brand-muted">
          {session?.user?.name && <span>{session.user.name}</span>}
          <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
            Salir
          </Button>
        </div>
      </div>
    </header>
  );
}
