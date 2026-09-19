"use client";

import { Button } from "@/components/ui/button";
import { generateTimeOptions } from "@/lib/time";

type PersonOption = { id: string; name: string };
type ServiceOption = { id: string; name: string; durationMinutes: number };

const TIME_OPTIONS = generateTimeOptions();

export function AppointmentForm({
  clients,
  professionals,
  services,
  action,
  defaultValues,
}: {
  clients: PersonOption[];
  professionals: PersonOption[];
  services: ServiceOption[];
  action: (formData: FormData) => Promise<void>;
  defaultValues?: {
    clientId?: string;
    professionalId?: string;
    serviceIds?: string[];
    date?: string;
    startTime?: string;
  };
}) {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const hasService = new FormData(e.currentTarget).getAll("serviceIds").length > 0;
    if (!hasService) {
      e.preventDefault();
      alert("Selecciona al menos un servicio.");
    }
  }

  return (
    <form action={action} onSubmit={handleSubmit} className="max-w-xl space-y-5">
      <div>
        <label className="block text-sm font-medium">Cliente</label>
        <select
          name="clientId"
          required
          defaultValue={defaultValues?.clientId ?? ""}
          className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
        >
          <option value="">Seleccionar...</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium">Profesional</label>
        <select
          name="professionalId"
          required
          defaultValue={defaultValues?.professionalId ?? ""}
          className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
        >
          <option value="">Seleccionar...</option>
          {professionals.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">Fecha</label>
          <input
            type="date"
            name="date"
            required
            defaultValue={defaultValues?.date}
            className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Hora de inicio</label>
          <select
            name="startTime"
            required
            defaultValue={defaultValues?.startTime ?? ""}
            className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
          >
            <option value="">Seleccionar...</option>
            {TIME_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium">Servicios</label>
        <div className="mt-1 max-h-56 space-y-1 overflow-y-auto rounded-brand border border-brand-border p-3">
          {services.length === 0 && (
            <p className="text-sm text-brand-muted">No hay servicios publicados.</p>
          )}
          {services.map((service) => (
            <label key={service.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="serviceIds"
                  value={service.id}
                  defaultChecked={defaultValues?.serviceIds?.includes(service.id)}
                />
                {service.name}
              </span>
              <span className="text-brand-muted">{service.durationMinutes} min</span>
            </label>
          ))}
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

      <label className="flex items-center gap-2 text-sm text-brand-muted">
        <input type="checkbox" name="force" />
        Forzar fuera del horario habitual, o pese a una ausencia/feriado
      </label>

      <Button type="submit">Guardar turno</Button>
    </form>
  );
}
