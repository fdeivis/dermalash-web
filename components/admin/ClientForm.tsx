import type { Client } from "@prisma/client";
import { Button } from "@/components/ui/button";

function toDateInputValue(date?: Date | null) {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export function ClientForm({
  client,
  action,
}: {
  client?: Client;
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
            defaultValue={client?.firstName}
            className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Apellido</label>
          <input
            name="lastName"
            required
            defaultValue={client?.lastName}
            className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">Fecha de nacimiento</label>
          <input
            type="date"
            name="birthDate"
            defaultValue={toDateInputValue(client?.birthDate)}
            className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Sexo</label>
          <div className="mt-2 flex gap-4 text-sm">
            {[
              ["HOMBRE", "Hombre"],
              ["MUJER", "Mujer"],
              ["OTRO", "Otro"],
            ].map(([value, label]) => (
              <label key={value} className="flex items-center gap-1.5">
                <input type="radio" name="sex" value={value} defaultChecked={client?.sex === value} />
                {label}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium">Documento de identidad</label>
        <input
          name="documentId"
          defaultValue={client?.documentId ?? undefined}
          className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium">Teléfono</label>
          <input
            name="phone"
            defaultValue={client?.phone ?? undefined}
            className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">WhatsApp</label>
          <input
            name="whatsapp"
            inputMode="numeric"
            pattern="[0-9]{9,12}"
            title="Solo dígitos, entre 9 y 12 (con o sin código de país)"
            placeholder="51999999999"
            defaultValue={client?.whatsapp ?? undefined}
            className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Email</label>
          <input
            type="email"
            name="email"
            defaultValue={client?.email ?? undefined}
            className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium">Observaciones</label>
        <textarea
          name="notes"
          rows={3}
          defaultValue={client?.notes ?? undefined}
          className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Antecedentes de salud</label>
        <textarea
          name="healthNotes"
          rows={3}
          defaultValue={client?.healthNotes ?? undefined}
          className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-brand-muted">
          Información sensible: solo visible para usuarios del panel autenticados.
        </p>
      </div>

      <Button type="submit">{client ? "Guardar cambios" : "Crear cliente"}</Button>
    </form>
  );
}
