import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EmployeeForm } from "@/components/admin/EmployeeForm";
import { updateEmployee } from "../../actions";

export default async function EditarEmpleadoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const employee = await prisma.employee.findUnique({
    where: { id },
    include: { adminUser: true },
  });
  if (!employee) notFound();

  return (
    <div>
      <h1 className="font-display text-2xl">Editar empleado</h1>
      <div className="mt-6">
        <EmployeeForm employee={employee} action={updateEmployee.bind(null, employee.id)} />
      </div>
    </div>
  );
}
