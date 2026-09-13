import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { setEmployeeActive } from "./actions";

const ROLE_LABEL: Record<string, string> = {
  ENCARGADO: "Encargado",
  ESTETICISTA: "Esteticista",
};

export default async function AdminEmpleadosPage() {
  const employees = await prisma.employee.findMany({
    include: { adminUser: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Empleados</h1>
        <Link href="/admin/empleados/nuevo">
          <Button>Nuevo empleado</Button>
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-brand border border-brand-border bg-brand-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-brand-border text-brand-muted">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Tipo</th>
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
                    <form action={setEmployeeActive.bind(null, employee.id, !employee.active)}>
                      <Button type="submit" variant="outline" size="sm">
                        {employee.active ? "Desactivar" : "Activar"}
                      </Button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {employees.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-brand-muted">
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
