import { Fragment } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPermissionMatrix, CONFIGURABLE_ROLES, CONFIGURABLE_ROLE_LABEL } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { savePermissions } from "./actions";

// La matriz debe reflejar siempre el último guardado: no hay ninguna otra
// acción que revalide esta página puntualmente.
export const dynamic = "force-dynamic";

export default async function PermisosPage({
  searchParams,
}: {
  searchParams: Promise<{ guardado?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/admin/login");
  if (!["SOCIO", "ADMIN"].includes(session.user.role)) redirect("/admin");
  const { guardado } = await searchParams;
  const modules = await getPermissionMatrix();

  return (
    <div>
      <h1 className="font-display text-2xl">Permisos por rol</h1>
      <p className="mt-1 max-w-2xl text-sm text-brand-muted">
        Qué puede hacer cada rol en el panel. Administrador nunca tiene restricciones y no aparece
        acá. Los cambios se aplican de inmediato a todas las cuentas con ese rol.
      </p>

      {guardado !== undefined && (
        <p className="mt-4 rounded-brand border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Permisos actualizados.
        </p>
      )}

      <form action={savePermissions} className="mt-6">
        <div className="overflow-x-auto rounded-brand border border-brand-border bg-brand-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-brand-border text-brand-muted">
              <tr>
                <th className="px-4 py-3">Permiso</th>
                <th className="px-4 py-3 text-center">Admin</th>
                {CONFIGURABLE_ROLES.map((role) => (
                  <th key={role} className="px-4 py-3 text-center">
                    {CONFIGURABLE_ROLE_LABEL[role]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modules.map((module) => (
                <Fragment key={module.key}>
                  <tr className="border-b border-brand-border bg-brand-bg">
                    <th
                      colSpan={2 + CONFIGURABLE_ROLES.length}
                      className="px-4 py-2 text-left font-display text-brand-ink"
                    >
                      {module.label}
                    </th>
                  </tr>
                  {module.permissions.map((permission) => (
                    <tr key={permission.key} className="border-b border-brand-border last:border-0">
                      <td className="px-4 py-3">{permission.label}</td>
                      <td className="px-4 py-3 text-center text-brand-muted" title="Admin nunca tiene restricciones">
                        ✓
                      </td>
                      {CONFIGURABLE_ROLES.map((role) => (
                        <td key={role} className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            name={`perm__${role}__${permission.key}`}
                            defaultChecked={permission.byRole[role]}
                            className="h-4 w-4 accent-brand-accent"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        <Button type="submit" className="mt-4">
          Guardar cambios
        </Button>
      </form>
    </div>
  );
}
