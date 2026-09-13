import type { Employee, AdminUser } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { DocumentUploadField } from "@/components/admin/DocumentUploadField";

function toDateInputValue(date?: Date | null) {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export function EmployeeForm({
  employee,
  action,
}: {
  employee?: Employee & { adminUser: AdminUser };
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <form action={action} className="max-w-xl space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">Nombre</label>
          <input
            name="firstName"
            required
            defaultValue={employee?.firstName}
            className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Apellido</label>
          <input
            name="lastName"
            required
            defaultValue={employee?.lastName}
            className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium">Tipo de empleado</label>
        <select
          name="role"
          required
          defaultValue={employee?.adminUser.role ?? "ESTETICISTA"}
          className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
        >
          <option value="ESTETICISTA">Esteticista</option>
          <option value="ENCARGADO">Encargado</option>
          <option value="SOCIO">Socio</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">Dirección</label>
          <input
            name="address"
            defaultValue={employee?.address ?? undefined}
            className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Fecha de nacimiento</label>
          <input
            type="date"
            name="birthDate"
            defaultValue={toDateInputValue(employee?.birthDate)}
            className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">Documento de identidad</label>
          <input
            name="documentId"
            defaultValue={employee?.documentId ?? undefined}
            className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Teléfono</label>
          <input
            name="phone"
            defaultValue={employee?.phone ?? undefined}
            className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium">Currículum (CV)</label>
        <div className="mt-1">
          <DocumentUploadField name="cvUrl" initial={employee?.cvUrl} folder="empleados" />
        </div>
      </div>

      {employee ? (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Email de acceso</label>
            <input
              type="email"
              name="email"
              required
              defaultValue={employee.adminUser.email}
              className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Nueva contraseña (opcional)</label>
            <input
              type="password"
              name="newPassword"
              placeholder="Dejar vacío para no cambiarla"
              className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Email de acceso</label>
            <input
              type="email"
              name="email"
              required
              className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Contraseña inicial</label>
            <input
              type="password"
              name="password"
              required
              minLength={8}
              className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
            />
          </div>
        </div>
      )}

      <Button type="submit">{employee ? "Guardar cambios" : "Crear empleado"}</Button>
    </form>
  );
}
