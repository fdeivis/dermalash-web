"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import { formatPrice } from "@/lib/utils";

type PersonOption = { id: string; name: string };
type ServiceOption = { id: string; name: string; price: number };
type PromotionOption = { id: string; name: string; promoPrice: number; serviceIds: string[] };

const PAYMENT_METHODS = [
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "YAPE", label: "Yape" },
  { value: "PLIN", label: "Plin" },
  { value: "TARJETA", label: "Tarjeta" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "OTRO", label: "Otro" },
];

function nowInputValue() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(
    now.getHours()
  )}:${pad(now.getMinutes())}`;
}

/**
 * Replica en el cliente la misma regla que `resolveSessionPricing` en el
 * servidor: `promoPrice` es un precio de combo para TODOS los servicios de
 * la promoción, así que solo se aplica si están todos seleccionados.
 */
function computeSuggestedTotal(
  selectedIds: string[],
  services: ServiceOption[],
  promotions: PromotionOption[]
) {
  const selectedSet = new Set(selectedIds);
  const applicable = promotions
    .filter((p) => p.serviceIds.length > 0 && p.serviceIds.every((id) => selectedSet.has(id)))
    .sort((a, b) => b.serviceIds.length - a.serviceIds.length);
  const promotion = applicable[0];

  const basePrice = (id: string) => services.find((s) => s.id === id)?.price ?? 0;

  if (!promotion) {
    return { total: selectedIds.reduce((sum, id) => sum + basePrice(id), 0), promotionName: null };
  }

  const covered = new Set(promotion.serviceIds);
  const perService = promotion.promoPrice / promotion.serviceIds.length;
  const total = selectedIds.reduce(
    (sum, id) => sum + (covered.has(id) ? perService : basePrice(id)),
    0
  );
  return { total, promotionName: promotion.name };
}

export function SessionForm({
  clients,
  professionals,
  services,
  promotions,
  action,
  defaultValues,
}: {
  clients: PersonOption[];
  professionals: PersonOption[];
  services: ServiceOption[];
  promotions: PromotionOption[];
  action: (formData: FormData) => Promise<void>;
  defaultValues?: {
    clientId?: string;
    attendedByUserId?: string;
    serviceIds?: string[];
    appointmentId?: string;
    sessionDate?: string;
  };
}) {
  const [selected, setSelected] = useState<Record<string, boolean>>(
    Object.fromEntries((defaultValues?.serviceIds ?? []).map((id) => [id, true]))
  );
  const [totalTouched, setTotalTouched] = useState(false);
  const [total, setTotal] = useState(0);

  const selectedIds = useMemo(() => Object.keys(selected).filter((id) => selected[id]), [selected]);
  const { total: suggestedTotal, promotionName } = useMemo(
    () => computeSuggestedTotal(selectedIds, services, promotions),
    [selectedIds, services, promotions]
  );

  const displayedTotal = totalTouched ? total : suggestedTotal;

  return (
    <form action={action} className="max-w-xl space-y-5">
      {defaultValues?.appointmentId && (
        <input type="hidden" name="appointmentId" value={defaultValues.appointmentId} />
      )}
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
        <label className="block text-sm font-medium">Profesional que atendió</label>
        <select
          name="attendedByUserId"
          required
          defaultValue={defaultValues?.attendedByUserId ?? ""}
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

      <div>
        <label className="block text-sm font-medium">Fecha y hora de la sesión</label>
        <input
          type="datetime-local"
          name="sessionDate"
          required
          defaultValue={defaultValues?.sessionDate ?? nowInputValue()}
          className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Servicios realizados</label>
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
                  checked={!!selected[service.id]}
                  onChange={(e) =>
                    setSelected((prev) => ({ ...prev, [service.id]: e.target.checked }))
                  }
                />
                {service.name}
              </span>
              <span className="text-brand-muted">{formatPrice(service.price)}</span>
            </label>
          ))}
        </div>
        {promotionName && (
          <p className="mt-1 text-xs text-brand-accent">Promoción aplicada: {promotionName}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
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
        <div>
          <label className="block text-sm font-medium">Monto total (S/)</label>
          <input
            type="number"
            name="totalAmount"
            step="0.01"
            min={0}
            required
            value={displayedTotal}
            onChange={(e) => {
              setTotalTouched(true);
              setTotal(Number(e.target.value));
            }}
            className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-brand-muted">
            Sugerido según precio/promo vigente: {formatPrice(suggestedTotal)}
          </p>
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

      <ConfirmSubmitButton
        type="submit"
        confirmMessage="¿Confirmar el registro de esta sesión con estos servicios y este monto? Revisá que estén todos los servicios realizados antes de continuar."
      >
        Registrar sesión
      </ConfirmSubmitButton>
    </form>
  );
}
