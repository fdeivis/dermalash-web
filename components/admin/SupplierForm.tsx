import type { Supplier } from "@prisma/client";
import { Button } from "@/components/ui/button";

const RATING_LABEL: Record<string, string> = {
  BUENA: "Buena",
  REGULAR: "Regular",
  MALA: "Mala",
};

export function SupplierForm({
  supplier,
  action,
}: {
  supplier?: Supplier;
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <form action={action} className="max-w-xl space-y-5">
      <div>
        <label className="block text-sm font-medium">Nombre / razón social</label>
        <input
          name="name"
          required
          defaultValue={supplier?.name}
          className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">RUC / identificador fiscal</label>
        <input
          name="taxId"
          defaultValue={supplier?.taxId ?? ""}
          className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-3 rounded-brand border border-brand-border p-4">
        <p className="text-sm font-medium">Datos de contacto</p>
        <p className="text-xs text-brand-muted">Ingresa al menos uno.</p>
        <div>
          <label className="block text-xs font-medium">Teléfono</label>
          <input
            type="tel"
            name="phone"
            placeholder="999 999 999"
            defaultValue={supplier?.phone ?? ""}
            className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium">WhatsApp</label>
          <input
            type="tel"
            name="whatsapp"
            placeholder="999 999 999"
            defaultValue={supplier?.whatsapp ?? ""}
            className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium">Correo</label>
          <input
            type="email"
            name="email"
            placeholder="contacto@proveedor.com"
            defaultValue={supplier?.email ?? ""}
            className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium">Evaluación</label>
        <select
          name="rating"
          defaultValue={supplier?.rating ?? ""}
          className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
        >
          <option value="">Sin evaluar</option>
          {Object.entries(RATING_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <Button type="submit">{supplier ? "Guardar cambios" : "Crear proveedor"}</Button>
    </form>
  );
}
