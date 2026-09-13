"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { acknowledgeAlert, deleteAlert, deleteAlerts } from "@/app/admin/(protected)/alertas/actions";

type AlertItem = {
  id: string;
  type: string;
  message: string;
  source: string;
  appointmentId: string | null;
  acknowledgedAt: string | null;
  // Ya formateada en el servidor (no con `new Date().toLocaleString()` acá):
  // el motor de Intl del navegador puede formatear distinto al del server
  // (ej. 24hs vs. am/pm), lo que produce un mismatch de hidratación.
  createdAtLabel: string;
};

const TYPE_LABEL: Record<string, string> = {
  TURNO_CREADO: "Turno creado",
  TURNO_MODIFICADO: "Turno modificado",
  TURNO_CANCELADO: "Turno cancelado",
  TURNO_BORRADO: "Turno borrado",
};

export function AlertList({ alerts }: { alerts: AlertItem[] }) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();

  const selectedIds = Object.keys(selected).filter((id) => selected[id]);

  function toggle(id: string) {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div>
      {selectedIds.length > 0 && (
        <div className="mb-3">
          <Button
            variant="danger"
            size="sm"
            disabled={isPending}
            onClick={() => {
              if (!confirm(`¿Eliminar ${selectedIds.length} alerta(s) seleccionada(s)?`)) return;
              startTransition(async () => {
                await deleteAlerts(selectedIds);
                setSelected({});
              });
            }}
          >
            Eliminar seleccionadas ({selectedIds.length})
          </Button>
        </div>
      )}

      <ul className="space-y-2">
        {alerts.map((alert) => (
          <li
            key={alert.id}
            className={`flex items-start gap-3 rounded-brand border px-4 py-3 text-sm ${
              alert.acknowledgedAt
                ? "border-brand-border bg-brand-surface text-brand-muted"
                : "border-brand-accent bg-brand-bg"
            }`}
          >
            <input
              type="checkbox"
              className="mt-1"
              checked={!!selected[alert.id]}
              onChange={() => toggle(alert.id)}
              aria-label="Seleccionar alerta"
            />
            <div className="flex-1">
              <span className="font-medium">{TYPE_LABEL[alert.type] ?? alert.type}</span>
              {alert.source === "WHATSAPP" && (
                <span className="ml-2 rounded bg-brand-surface px-1.5 py-0.5 text-xs">WhatsApp</span>
              )}
              <p>{alert.message}</p>
              <p className="text-xs text-brand-muted">{alert.createdAtLabel}</p>
            </div>
            <div className="flex items-center gap-3">
              {alert.appointmentId && (
                <Link href={`/admin/agenda/${alert.appointmentId}`} className="text-xs underline">
                  Ver turno
                </Link>
              )}
              {!alert.acknowledgedAt && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => startTransition(() => acknowledgeAlert(alert.id))}
                >
                  Visto
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => {
                  if (!confirm("¿Eliminar esta alerta?")) return;
                  startTransition(() => deleteAlert(alert.id));
                }}
              >
                Eliminar
              </Button>
            </div>
          </li>
        ))}
        {alerts.length === 0 && <li className="text-sm text-brand-muted">No hay alertas todavía.</li>}
      </ul>
    </div>
  );
}
