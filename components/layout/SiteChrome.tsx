"use client";

import { usePathname } from "next/navigation";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { WhatsAppFloatingButton } from "@/components/layout/WhatsAppFloatingButton";

// El panel /admin tiene su propio layout (AdminNav) y no debe mostrar
// el header/footer/WhatsApp del sitio público.
export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  if (isAdmin) return <>{children}</>;

  return (
    <>
      <SiteHeader />
      <main className="min-h-[60vh]">{children}</main>
      <SiteFooter />
      <WhatsAppFloatingButton />
    </>
  );
}
