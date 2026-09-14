import { EmployeeForm } from "@/components/admin/EmployeeForm";
import { requirePagePermission } from "@/lib/auth";
import { createEmployee } from "../actions";

export default async function NuevoEmpleadoPage() {
  await requirePagePermission("empleados.gestionar");
  return (
    <div>
      <h1 className="font-display text-2xl">Nuevo empleado</h1>
      <div className="mt-6">
        <EmployeeForm action={createEmployee} />
      </div>
    </div>
  );
}
