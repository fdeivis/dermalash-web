import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { requirePagePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { addSalaryPeriod, setEmployeeActive } from "../actions";

const ROLE_LABEL: Record<string, string> = {
  SOCIO: "Socio",
  ENCARGADO: "Encargado",
  ESTETICISTA: "Esteticista",
};

export default async function VerEmpleadoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePagePermission("empleados.ver");
  const canManage = await hasPermission(session.user.role, "empleados.gestionar");
  const { id } = await params;
  const employee = await prisma.employee.findUnique({
    where: { id },
    include: { adminUser: true, salaryPeriods: { orderBy: { validFrom: "desc" } } },
  });
  if (!employee) notFound();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">
          {employee.firstName} {employee.lastName}
        </h1>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <Link href={`/admin/empleados/${employee.id}/editar`}>
              <Button variant="outline" size="sm">
                Editar
              </Button>
            </Link>
            <form action={setEmployeeActive.bind(null, employee.id, !employee.active)}>
              <Button type="submit" variant="outline" size="sm">
                {employee.active ? "Desactivar" : "Activar"}
              </Button>
            </form>
          </div>
        )}
      </div>

      <dl className="mt-6 max-w-xl space-y-3 rounded-brand border border-brand-border bg-brand-surface p-5 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-brand-muted">Tipo</dt>
          <dd>{ROLE_LABEL[employee.adminUser.role]}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-brand-muted">Atiende clientes</dt>
          <dd>
            <Badge variant={employee.adminUser.canAttend ? "published" : "draft"}>
              {employee.adminUser.canAttend ? "Sí" : "No"}
            </Badge>
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-brand-muted">Estado</dt>
          <dd>
            <Badge variant={employee.active ? "published" : "draft"}>
              {employee.active ? "Activo" : "Inactivo"}
            </Badge>
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-brand-muted">Email de acceso</dt>
          <dd>{employee.adminUser.email}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-brand-muted">Dirección</dt>
          <dd>{employee.address ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-brand-muted">Fecha de nacimiento</dt>
          <dd>{employee.birthDate ? employee.birthDate.toLocaleDateString("es-PE") : "—"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-brand-muted">Documento</dt>
          <dd>{employee.documentId ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-brand-muted">Teléfono</dt>
          <dd>{employee.phone ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-brand-muted">CV</dt>
          <dd>
            {employee.cvUrl ? (
              <a
                href={employee.cvUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-accent underline"
              >
                Ver archivo
              </a>
            ) : (
              "—"
            )}
          </dd>
        </div>
      </dl>

      <div className="mt-10 max-w-xl">
        <h2 className="font-display text-lg">Sueldo referencial</h2>
        <p className="mt-1 text-sm text-brand-muted">
          Se conserva el historial completo; agregar un período no borra los anteriores.
        </p>

        {canManage && (
        <form
          action={addSalaryPeriod.bind(null, employee.id)}
          className="mt-4 grid grid-cols-2 gap-4 rounded-brand border border-brand-border bg-brand-surface p-4"
        >
          <div>
            <label className="block text-sm font-medium">Monto (S/)</label>
            <input
              type="number"
              name="amount"
              step="0.01"
              min={0}
              required
              className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Desde</label>
            <input
              type="date"
              name="validFrom"
              required
              className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Hasta (opcional)</label>
            <input
              type="date"
              name="validTo"
              className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Observaciones</label>
            <input
              name="notes"
              className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
            />
          </div>
          <div className="col-span-2">
            <Button type="submit" size="sm">
              Agregar período
            </Button>
          </div>
        </form>
        )}

        <div className="mt-4 overflow-x-auto rounded-brand border border-brand-border bg-brand-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-brand-border text-brand-muted">
              <tr>
                <th className="px-4 py-3">Desde</th>
                <th className="px-4 py-3">Hasta</th>
                <th className="px-4 py-3">Monto</th>
                <th className="px-4 py-3">Observaciones</th>
              </tr>
            </thead>
            <tbody>
              {employee.salaryPeriods.map((period) => (
                <tr key={period.id} className="border-b border-brand-border last:border-0">
                  <td className="px-4 py-3">{period.validFrom.toLocaleDateString("es-PE")}</td>
                  <td className="px-4 py-3">
                    {period.validTo ? period.validTo.toLocaleDateString("es-PE") : "—"}
                  </td>
                  <td className="px-4 py-3">{formatPrice(period.amount.toString())}</td>
                  <td className="px-4 py-3">{period.notes ?? "—"}</td>
                </tr>
              ))}
              {employee.salaryPeriods.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-brand-muted">
                    Todavía no hay períodos de sueldo cargados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
