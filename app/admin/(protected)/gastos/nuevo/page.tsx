import { prisma } from "@/lib/prisma";
import { requirePagePermission } from "@/lib/auth";
import { ExpenseForm } from "@/components/admin/ExpenseForm";
import { createExpense } from "../actions";

const ERROR_LABEL: Record<string, string> = {
  "empleado-requerido": "Para la categoría Sueldos hay que elegir un empleado.",
};

export default async function NuevoGastoPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; category?: string }>;
}) {
  const session = await requirePagePermission("gastos.gestionar");
  const { error, category } = await searchParams;

  const [suppliers, employees] = await Promise.all([
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
    prisma.employee.findMany({ where: { active: true }, orderBy: { lastName: "asc" } }),
  ]);

  return (
    <div>
      <h1 className="font-display text-2xl">Nuevo gasto</h1>
      {error && (
        <p className="mt-2 rounded-brand border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {ERROR_LABEL[error] ?? "No se pudo registrar el gasto."}
        </p>
      )}
      <div className="mt-6">
        <ExpenseForm
          suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
          employees={employees.map((e) => ({ id: e.id, name: `${e.firstName} ${e.lastName}` }))}
          action={createExpense}
          defaultCategory={category}
          canRegisterAdelanto={["SOCIO", "ADMIN"].includes(session.user.role)}
        />
      </div>
    </div>
  );
}
