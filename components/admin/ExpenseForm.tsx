"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PrivateDocumentUploadField } from "@/components/admin/PrivateDocumentUploadField";

type Option = { id: string; name: string };

const CATEGORY_LABEL: Record<string, string> = {
  ALQUILER: "Alquiler",
  INTERNET: "Internet",
  LUZ: "Luz",
  AGUA: "Agua",
  INVENTARIO: "Inventario",
  SUELDOS: "Sueldos",
  ADELANTO_GANANCIAS: "Adelanto de ganancias",
  OTROS: "Otros",
};

const PAYMENT_METHODS = [
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "YAPE", label: "Yape" },
  { value: "PLIN", label: "Plin" },
  { value: "TARJETA", label: "Tarjeta" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "OTRO", label: "Otro" },
];

export function ExpenseForm({
  suppliers,
  employees,
  action,
  defaultCategory,
  canRegisterAdelanto = false,
}: {
  suppliers: Option[];
  employees: Option[];
  action: (formData: FormData) => Promise<void>;
  defaultCategory?: string;
  canRegisterAdelanto?: boolean;
}) {
  const [category, setCategory] = useState(defaultCategory ?? "ALQUILER");
  const categoryOptions = Object.entries(CATEGORY_LABEL).filter(
    ([value]) => value !== "ADELANTO_GANANCIAS" || canRegisterAdelanto
  );

  return (
    <form action={action} className="max-w-xl space-y-5">
      <div>
        <label className="block text-sm font-medium">Concepto</label>
        <input
          name="concept"
          required
          className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">Categoría</label>
          <select
            name="category"
            required
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
          >
            {categoryOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Fecha</label>
          <input
            type="date"
            name="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">Monto (S/)</label>
          <input
            type="number"
            name="amount"
            step="0.01"
            min={0.01}
            required
            className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Medio de pago</label>
          <select
            name="paymentMethod"
            required
            className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium">Proveedor (opcional)</label>
        <select
          name="supplierId"
          className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
        >
          <option value="">Sin proveedor</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {category === "SUELDOS" && (
        <div>
          <label className="block text-sm font-medium">Empleado</label>
          <select
            name="employeeId"
            required
            className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
          >
            <option value="">Seleccionar...</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium">Comprobante (opcional)</label>
        <div className="mt-1">
          <PrivateDocumentUploadField name="receiptPath" folder="gastos" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium">Observaciones</label>
        <textarea
          name="notes"
          rows={3}
          className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
        />
      </div>

      <Button type="submit">Registrar gasto</Button>
    </form>
  );
}
