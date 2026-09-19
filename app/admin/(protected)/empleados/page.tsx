import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePagePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import { deleteEmployee, setEmployeeActive } from "./actions";

const ROLE_LABEL: Record<string, string> = {
  SOCIO: "Socio",
  ENCARGADO: "Encargado",
  ESTETICISTA: "Esteticista",
};

export default async function AdminEmpleadosPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requirePagePermission("empleados.ver");
  const canManage = await hasPermission(session.user.role, "empleados.gestionar");
  const { error } = await searchParams;
  const employees = await prisma.employee.findMany({
    include: { adminUser: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Empleados</h1>
        {canManage && (
          <Link href="/admin/empleados/nuevo">
            <Button>Nuevo empleado</Button>
          </Link>
        )}
      </div>

      {error === "tiene-sesiones" && (
        <p className="mt-4 rounded-brand border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          No se puede eliminar: este empleado ya atendió facturas registradas. Desactívalo en su
          lugar si ya no trabaja acá.
        </p>
      )}

      <div className="mt-6 overflow-x-auto rounded-brand border border-brand-border bg-brand-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-brand-border text-brand-muted">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Atiende</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee.id} className="border-b border-brand-border last:border-0">
                <td className="px-4 py-3">
                  {employee.firstName} {employee.lastName}
                </td>
                <td className="px-4 py-3">{ROLE_LABEL[employee.adminUser.role]}</td>
                <td className="px-4 py-3">
                  <Badge variant={employee.adminUser.canAttend ? "published" : "draft"}>
                    {employee.adminUser.canAttend ? "Sí" : "No"}
                  </Badge>
                </td>
                <td className="px-4 py-3">{employee.adminUser.email}</td>
                <td className="px-4 py-3">
                  <Badge variant={employee.active ? "published" : "draft"}>
                    {employee.active ? "Activo" : "Inactivo"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/admin/empleados/${employee.id}`}>
                      <Button variant="outline" size="sm">
                        Ver
                      </Button>
                    </Link>
                    {canManage && (
                      <>
                        <form action={setEmployeeActive.bind(null, employee.id, !employee.active)}>
                          <Button type="submit" variant="outline" size="sm">
                            {employee.active ? "Desactivar" : "Activar"}
                          </Button>
                        </form>
                        <form action={deleteEmployee.bind(null, employee.id)}>
                          <ConfirmSubmitButton
                            type="submit"
                            variant="danger"
                            size="sm"
                            confirmMessage={`¿Eliminar a "${employee.firstName} ${employee.lastName}"? Esta acción no se puede deshacer.`}
                          >
                            Eliminar
                          </ConfirmSubmitButton>
                        </form>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {employees.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-brand-muted">
                  Todavía no hay empleados cargados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
