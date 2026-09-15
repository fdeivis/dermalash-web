import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { AdminNav } from "@/components/admin/AdminNav";

export default async function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const [alertCount, session] = await Promise.all([
    prisma.alert.count({ where: { acknowledgedAt: null } }),
    getServerSession(authOptions),
  ]);

  const role = session?.user.role;
  // La visibilidad de cada link depende de un permiso real (administrable
  // desde /admin/permisos), no de un rol hardcodeado: si mañana cambia el
  // permiso, el menú tiene que cambiar solo.
  const [canViewEmployees, canManageAgenda, canUseAssistant] = role
    ? await Promise.all([
        hasPermission(role, "empleados.ver"),
        hasPermission(role, "agenda.gestionar"),
        hasPermission(role, "asistente_ia.chat"),
      ])
    : [false, false, false];
  // Ver/purgar logs y administrar permisos quedan fuera de /admin/permisos
  // a propósito (ver requireSocioOrAdmin en lib/auth.ts).
  const canManagePermissions = role === "SOCIO" || role === "ADMIN";

  return (
    <div className="min-h-screen bg-brand-bg">
      <AdminNav
        alertCount={alertCount}
        canViewEmployees={canViewEmployees}
        canManageAgenda={canManageAgenda}
        canManagePermissions={canManagePermissions}
        canUseAssistant={canUseAssistant}
      />
      <main className="mx-auto max-w-6xl px-4 py-10">{children}</main>
    </div>
  );
}
