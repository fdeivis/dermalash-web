"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import { formatPrice } from "@/lib/utils";
import { peruParts } from "@/lib/time";

type PersonOption = { id: string; name: string };
type ServiceOption = { id: string; name: string; price: number };
type PromotionOption = { id: string; name: string; promoPrice: number; serviceIds: string[] };
export type AppointmentOption = {
  id: string;
  startAt: string;
  professionalId: string;
  professionalLabel: string;
  serviceIds: string[];
  serviceNames: string[];
};
export type PriceComparisonLine = {
  serviceName: string;
  quotedPrice: number;
  quotedPromotionName: string | null;
  quotedPromotionEndDate: string | null;
  currentPrice: number;
  currentPromotionName: string | null;
  currentPromotionEndDate: string | null;
};

const PAYMENT_METHODS = [
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "YAPE", label: "Yape" },
  { value: "PLIN", label: "Plin" },
  { value: "TARJETA", label: "Tarjeta" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "OTRO", label: "Otro" },
];

// A diferencia de un <input type="datetime-local"> genérico, acá el valor
// SIEMPRE se interpreta como hora de Perú al enviarlo (parseDateTimeLocal,
// del lado del servidor) — así que el valor por defecto tiene que calcularse
// en hora de Perú también, no en la hora local del dispositivo. Si no,
// alguien con la notebook o el celular en otro huso ve "ahora" a una hora
// que después el sistema guarda corrida (ver nota de lib/time.ts).
function toPeruInputValue(date: Date) {
  const { year, month, day, hour, minute } = peruParts(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}`;
}

function nowInputValue() {
  return toPeruInputValue(new Date());
}

function toDateTimeLocalValue(iso: string) {
  return toPeruInputValue(new Date(iso));
}

function isSameLocalDay(iso: string, dateTimeLocalValue: string) {
  const { year, month, day } = peruParts(new Date(iso));
  const [datePart] = dateTimeLocalValue.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  return year === y && month === m && day === d;
}

function formatAppointmentOption(a: AppointmentOption) {
  const d = new Date(a.startAt);
  const isToday =
    d.toLocaleDateString("es-PE", { timeZone: "America/Lima" }) ===
    new Date().toLocaleDateString("es-PE", { timeZone: "America/Lima" });
  const datePart = isToday
    ? "Hoy"
    : d.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", timeZone: "America/Lima" });
  const timePart = d.toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Lima",
  });
  return `${datePart} ${timePart} — ${a.serviceNames.join(", ") || "sin servicios"}`;
}

/**
 * Suma simple: servicios sueltos a precio base + promociones tildadas a su
 * promoPrice. No hay detección automática de combo — cada promo se cobra
 * solo si el usuario la tildó explícitamente.
 */
function computeSuggestedTotal(
  selected: Record<string, boolean>,
  coveredServiceIds: Set<string>,
  services: ServiceOption[],
  promotions: PromotionOption[],
  selectedPromotions: Record<string, boolean>
) {
  let total = 0;
  for (const id of Object.keys(selected)) {
    if (!selected[id] || coveredServiceIds.has(id)) continue;
    total += services.find((s) => s.id === id)?.price ?? 0;
  }
  for (const promotion of promotions) {
    if (selectedPromotions[promotion.id]) total += promotion.promoPrice;
  }
  return total;
}

export function SessionForm({
  clients,
  professionals,
  services,
  promotions,
  action,
  getClientAppointments,
  initialAppointments = [],
  defaultValues,
  priceComparison = [],
  canApplyDiscount = false,
}: {
  clients: PersonOption[];
  professionals: PersonOption[];
  services: ServiceOption[];
  promotions: PromotionOption[];
  action: (formData: FormData) => Promise<void>;
  getClientAppointments: (clientId: string) => Promise<AppointmentOption[]>;
  initialAppointments?: AppointmentOption[];
  defaultValues?: {
    clientId?: string;
    attendedByUserId?: string;
    serviceIds?: string[];
    appointmentId?: string;
    sessionDate?: string;
  };
  priceComparison?: PriceComparisonLine[];
  canApplyDiscount?: boolean;
}) {
  const [clientId, setClientId] = useState(defaultValues?.clientId ?? "");
  const [attendedByUserId, setAttendedByUserId] = useState(defaultValues?.attendedByUserId ?? "");
  const [sessionDateValue, setSessionDateValue] = useState(
    defaultValues?.sessionDate ?? nowInputValue()
  );
  const [selected, setSelected] = useState<Record<string, boolean>>(
    Object.fromEntries((defaultValues?.serviceIds ?? []).map((id) => [id, true]))
  );
  const [selectedPromotions, setSelectedPromotions] = useState<Record<string, boolean>>({});
  const [appointments, setAppointments] = useState<AppointmentOption[]>(initialAppointments);
  const [linkedAppointmentId, setLinkedAppointmentId] = useState(
    defaultValues?.appointmentId ?? ""
  );
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [totalTouched, setTotalTouched] = useState(false);
  const [total, setTotal] = useState(0);
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discountType, setDiscountType] = useState<"MONTO" | "PORCENTAJE">("MONTO");
  const [discountValue, setDiscountValue] = useState(0);
  const [discountReason, setDiscountReason] = useState("");

  const fetchToken = useRef(0);
  const didInitialAutoPick = useRef(false);

  function applyAppointment(appt: AppointmentOption) {
    setLinkedAppointmentId(appt.id);
    setAttendedByUserId(appt.professionalId);
    setSelected(Object.fromEntries(appt.serviceIds.map((id) => [id, true])));
    setSessionDateValue(toDateTimeLocalValue(appt.startAt));
  }

  function autoPickAppointment(list: AppointmentOption[]) {
    if (list.length === 0) return;
    if (list.length === 1) {
      applyAppointment(list[0]);
      return;
    }
    const matches = list.filter((a) => isSameLocalDay(a.startAt, sessionDateValue));
    if (matches.length === 1) applyAppointment(matches[0]);
  }

  // Si la página ya trajo turnos de un cliente conocido (?clientId=) pero sin
  // un turno fijo (?appointmentId=), se sugiere uno apenas se monta el form.
  useEffect(() => {
    if (didInitialAutoPick.current) return;
    didInitialAutoPick.current = true;
    if (!defaultValues?.appointmentId) autoPickAppointment(initialAppointments);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleClientChange(newClientId: string) {
    setClientId(newClientId);
    setLinkedAppointmentId("");
    if (!newClientId) {
      setAppointments([]);
      return;
    }
    const token = ++fetchToken.current;
    setLoadingAppointments(true);
    try {
      const result = await getClientAppointments(newClientId);
      if (token !== fetchToken.current) return; // el cliente cambió de nuevo mientras esperábamos
      setAppointments(result);
      autoPickAppointment(result);
    } finally {
      if (token === fetchToken.current) setLoadingAppointments(false);
    }
  }

  function handleAppointmentSelect(id: string) {
    if (!id) {
      setLinkedAppointmentId("");
      return;
    }
    const appt = appointments.find((a) => a.id === id);
    if (appt) applyAppointment(appt);
  }

  function togglePromotion(promotion: PromotionOption, checked: boolean) {
    setSelectedPromotions((prev) => ({ ...prev, [promotion.id]: checked }));
    setSelected((prev) => {
      const next = { ...prev };
      for (const serviceId of promotion.serviceIds) next[serviceId] = checked;
      return next;
    });
  }

  const coveredServiceIds = useMemo(() => {
    const set = new Set<string>();
    for (const promotion of promotions) {
      if (selectedPromotions[promotion.id]) promotion.serviceIds.forEach((id) => set.add(id));
    }
    return set;
  }, [promotions, selectedPromotions]);

  const suggestedTotal = useMemo(
    () => computeSuggestedTotal(selected, coveredServiceIds, services, promotions, selectedPromotions),
    [selected, coveredServiceIds, services, promotions, selectedPromotions]
  );

  const discountAmount =
    discountEnabled && discountValue > 0
      ? discountType === "PORCENTAJE"
        ? (suggestedTotal * discountValue) / 100
        : discountValue
      : 0;
  const suggestedTotalWithDiscount = Math.max(0, suggestedTotal - discountAmount);

  const displayedTotal = totalTouched ? total : suggestedTotalWithDiscount;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const hasService = new FormData(e.currentTarget).getAll("serviceIds").length > 0;
    if (!hasService) {
      e.preventDefault();
      alert("Seleccioná al menos un servicio.");
    }
  }

  return (
    <form action={action} onSubmit={handleSubmit} className="max-w-xl space-y-5">
      <input type="hidden" name="appointmentId" value={linkedAppointmentId} />
      <div>
        <label className="block text-sm font-medium">Cliente</label>
        <select
          name="clientId"
          required
          value={clientId}
          onChange={(e) => handleClientChange(e.target.value)}
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

      {clientId && (
        <div>
          <label className="block text-sm font-medium">Turno vinculado (opcional)</label>
          <select
            value={linkedAppointmentId}
            onChange={(e) => handleAppointmentSelect(e.target.value)}
            disabled={loadingAppointments}
            className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
          >
            <option value="">Sin turno</option>
            {appointments.map((a) => (
              <option key={a.id} value={a.id}>
                {formatAppointmentOption(a)}
              </option>
            ))}
          </select>
          {loadingAppointments && (
            <p className="mt-1 text-xs text-brand-muted">Buscando turnos del cliente...</p>
          )}
          {!loadingAppointments && appointments.length === 0 && (
            <p className="mt-1 text-xs text-brand-muted">
              Este cliente no tiene turnos reservados o confirmados pendientes.
            </p>
          )}
        </div>
      )}

      {priceComparison.length > 0 && (
        <div className="rounded-brand border border-brand-border bg-brand-bg p-3 text-sm">
          <p className="font-medium">Precio cotizado al reservar vs. precio actual</p>
          <div className="mt-2 space-y-2">
            {priceComparison.map((line, i) => {
              const changed = line.quotedPrice !== line.currentPrice;
              return (
                <div key={i} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span>{line.serviceName}</span>
                  <span className="text-brand-muted">
                    Cotizado: {formatPrice(line.quotedPrice)}
                    {line.quotedPromotionName && (
                      <> ({line.quotedPromotionName}, vigente hasta {line.quotedPromotionEndDate})</>
                    )}
                    {" · "}
                    Actual:{" "}
                    <span className={changed ? "font-medium text-brand-accent" : undefined}>
                      {formatPrice(line.currentPrice)}
                    </span>
                    {line.currentPromotionName && (
                      <> ({line.currentPromotionName}, vigente hasta {line.currentPromotionEndDate})</>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-brand-muted">
            Es solo informativo — el monto sugerido abajo usa el precio actual; ajustalo a mano si
            corresponde honrar lo cotizado.
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium">Profesional que atendió</label>
        <select
          name="attendedByUserId"
          required
          value={attendedByUserId}
          onChange={(e) => setAttendedByUserId(e.target.value)}
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
        <label className="block text-sm font-medium">Fecha y hora de la factura</label>
        <input
          type="datetime-local"
          name="sessionDate"
          required
          value={sessionDateValue}
          onChange={(e) => setSessionDateValue(e.target.value)}
          className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Servicios realizados</label>
        <div className="mt-1 max-h-56 space-y-1 overflow-y-auto rounded-brand border border-brand-border p-3">
          {services.length === 0 && (
            <p className="text-sm text-brand-muted">No hay servicios publicados.</p>
          )}
          {services.map((service) => {
            const covered = coveredServiceIds.has(service.id);
            return (
              <label
                key={service.id}
                className={`flex items-center justify-between gap-2 text-sm ${
                  covered ? "text-brand-muted" : ""
                }`}
              >
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="serviceIds"
                    value={service.id}
                    checked={!!selected[service.id]}
                    // No se usa `disabled`: un checkbox disabled no viaja en
                    // el FormData al enviar el form, y este servicio sigue
                    // yendo en `serviceIds` aunque su precio lo ponga la
                    // promo. Se bloquea el destilde individual a mano acá.
                    className={covered ? "cursor-not-allowed" : undefined}
                    onChange={(e) => {
                      if (covered) return;
                      setSelected((prev) => ({ ...prev, [service.id]: e.target.checked }));
                    }}
                  />
                  {service.name}
                  {covered && <span className="text-xs">(incluido en promoción)</span>}
                </span>
                <span className="text-brand-muted">{formatPrice(service.price)}</span>
              </label>
            );
          })}
        </div>
      </div>

      {promotions.length > 0 && (
        <div>
          <label className="block text-sm font-medium">Promociones vigentes</label>
          <p className="mt-1 text-xs text-brand-muted">
            Tildá una promoción para cobrarla como combo en vez de sus servicios por separado.
          </p>
          <div className="mt-1 space-y-1 rounded-brand border border-brand-border p-3">
            {promotions.map((promotion) => (
              <label key={promotion.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="promotionIds"
                    value={promotion.id}
                    checked={!!selectedPromotions[promotion.id]}
                    onChange={(e) => togglePromotion(promotion, e.target.checked)}
                  />
                  🏷 {promotion.name} (combo)
                </span>
                <span className="text-brand-accent">{formatPrice(promotion.promoPrice)}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {canApplyDiscount && (
        <div className="rounded-brand border border-brand-border p-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={discountEnabled}
              onChange={(e) => setDiscountEnabled(e.target.checked)}
            />
            Aplicar descuento
          </label>
          {discountEnabled && (
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium">Tipo</label>
                  <select
                    name="discountType"
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as "MONTO" | "PORCENTAJE")}
                    className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
                  >
                    <option value="MONTO">Monto fijo (S/)</option>
                    <option value="PORCENTAJE">Porcentaje (%)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium">
                    {discountType === "PORCENTAJE" ? "Porcentaje" : "Monto"}
                  </label>
                  <input
                    type="number"
                    name="discountValue"
                    step="0.01"
                    min={0}
                    max={discountType === "PORCENTAJE" ? 100 : undefined}
                    value={discountValue || ""}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium">Motivo</label>
                <input
                  type="text"
                  name="discountReason"
                  required={discountEnabled}
                  value={discountReason}
                  onChange={(e) => setDiscountReason(e.target.value)}
                  className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
                />
              </div>
              {discountAmount > 0 && (
                <p className="text-xs text-brand-muted">
                  Descuento aplicado: {formatPrice(discountAmount)}
                </p>
              )}
            </div>
          )}
        </div>
      )}

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
            Sugerido según precio/promos tildadas: {formatPrice(suggestedTotal)}
            {discountAmount > 0 && <> − {formatPrice(discountAmount)} de descuento = {formatPrice(suggestedTotalWithDiscount)}</>}
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
        confirmMessage="¿Confirmar el registro de esta factura con estos servicios y este monto? Revisá que estén todos los servicios realizados antes de continuar."
      >
        Registrar factura
      </ConfirmSubmitButton>
    </form>
  );
}
