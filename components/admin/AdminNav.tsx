"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/servicios", label: "Servicios" },
  { href: "/admin/promociones", label: "Promociones" },
  { href: "/admin/novedades", label: "Novedades" },
  { href: "/admin/clientes", label: "Clientes" },
  { href: "/admin/sesiones", label: "Facturas" },
  // Visible para todos los roles: Esteticista ve su propia agenda de solo
  // lectura; el resto administra (ver /admin/agenda).
  { href: "/admin/agenda", label: "Agenda" },
];

export function AdminNav({
  alertCount = 0,
  canViewEmployees = false,
  canManageAgenda = false,
  canManagePermissions = false,
  canUseAssistant = false,
}: {
  alertCount?: number;
  canViewEmployees?: boolean;
  canManageAgenda?: boolean;
  canManagePermissions?: boolean;
  canUseAssistant?: boolean;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  // Con muchas secciones ya no entran en una sola fila (esto se notaba sobre
  // todo en mobile, donde el header se desbordaba en vez de mostrar un menú):
  // el resto del panel arma esta lista una sola vez y la reusa en la barra
  // de escritorio y en el menú desplegable de mobile. La visibilidad viene
  // calculada en el layout (server) a partir de los permisos reales del rol,
  // no de un array de roles hardcodeado acá.
  const links = [
    ...LINKS,
    ...(canViewEmployees ? [{ href: "/admin/empleados", label: "Empleados" }] : []),
    ...(canManageAgenda
      ? [{ href: "/admin/alertas", label: `Alertas${alertCount > 0 ? ` (${alertCount})` : ""}` }]
      : []),
    ...(canManagePermissions
      ? [
          { href: "/admin/permisos", label: "Permisos" },
          { href: "/admin/logs", label: "Logs" },
        ]
      : []),
    ...(canUseAssistant ? [{ href: "/admin/asistente-ia", label: "Asistente IA" }] : []),
  ];

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="border-b border-brand-border bg-brand-surface">
      <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
        <div className="flex items-center gap-4">
          <span className="font-display text-lg">Admin</span>
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden text-sm text-brand-muted hover:text-brand-ink sm:inline"
          >
            ↗ Ver sitio
          </Link>
        </div>

        <nav className="hidden flex-wrap items-center gap-x-5 gap-y-1 text-sm xl:flex">
          {links.map((link) => {
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

        <div className="hidden items-center gap-3 text-sm text-brand-muted xl:flex">
          {session?.user?.name && <span>{session.user.name}</span>}
          <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
            Salir
          </Button>
        </div>

        <button
          type="button"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          onClick={() => setOpen((v) => !v)}
          className="text-brand-ink xl:hidden"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 border-t border-brand-border px-4 py-3 text-sm xl:hidden">
          <Link href="/" target="_blank" rel="noopener noreferrer" className="py-2 text-brand-muted">
            ↗ Ver sitio
          </Link>
          {links.map((link) => {
            const active =
              link.href === "/admin" ? pathname === "/admin" : pathname?.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "py-2 text-brand-muted hover:text-brand-ink",
                  active && "font-medium text-brand-ink"
                )}
              >
                {link.label}
              </Link>
            );
          })}
          <div className="mt-2 flex items-center justify-between border-t border-brand-border pt-3">
            {session?.user?.name && <span className="text-brand-muted">{session.user.name}</span>}
            <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
              Salir
            </Button>
          </div>
        </nav>
      )}
    </header>
  );
}
