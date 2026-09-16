import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { requirePagePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { computeCashBalance } from "@/lib/cash";
import { formatDateTime12 } from "@/lib/scheduling";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import { openCashSession, closeCashSession } from "./actions";
import type { PaymentMethod } from "@prisma/client";

export const dynamic = "force-dynamic";

// OTRO queda afuera: no representa una cuenta real que tenga sentido
// arquear (a diferencia de efectivo, Yape, Plin, tarjeta o transferencia).
const RECONCILABLE_METHODS: PaymentMethod[] = ["EFECTIVO", "YAPE", "PLIN", "TARJETA", "TRANSFERENCIA"];
const METHOD_LABEL: Record<string, string> = {
  EFECTIVO: "Efectivo",
  YAPE: "Yape",
  PLIN: "Plin",
  TARJETA: "Tarjeta",
  TRANSFERENCIA: "Transferencia",
};

const ERROR_LABEL: Record<string, string> = {
  "ya-abierta": "Ese medio de pago ya tiene una sesión abierta.",
};

export default async function CajaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requirePagePermission("caja.ver");
  const canManage = await hasPermission(session.user.role, "caja.gestionar");
  const { error } = await searchParams;

  const [openSessions, closedSessions] = await Promise.all([
    prisma.cashSession.findMany({ where: { closedAt: null } }),
    prisma.cashSession.findMany({
      where: { closedAt: { not: null } },
      orderBy: { closedAt: "desc" },
      take: 50,
    }),
  ]);

  const now = new Date();
  // Efectivo (la caja física) siempre está visible, se use o no — el resto
  // de los medios son opcionales: solo aparecen si alguien decidió abrir
  // una conciliación para ellos.
  const shownMethods: PaymentMethod[] = [
    "EFECTIVO",
    ...openSessions
      .map((s) => s.paymentMethod)
      .filter((m): m is PaymentMethod => m !== "EFECTIVO"),
  ];
  const addableMethods = RECONCILABLE_METHODS.filter((m) => !shownMethods.includes(m));

  const cards = await Promise.all(
    shownMethods.map(async (method) => {
      const open = openSessions.find((s) => s.paymentMethod === method);
      const expected = open
        ? await computeCashBalance(method, Number(open.openingAmount), open.openedAt, now)
        : null;
      return { method, open, expected };
    })
  );

  return (
    <div>
      <h1 className="font-display text-2xl">Caja</h1>
      <p className="mt-2 text-sm text-brand-muted">
        Efectivo es la caja principal. Si además querés conciliar Yape, Plin, tarjeta o
        transferencia contra el saldo real de esa cuenta, agregalos abajo.
      </p>

      {error && (
        <p className="mt-4 rounded-brand border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {ERROR_LABEL[error] ?? "No se pudo completar la operación."}
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ method, open, expected }) => (
          <div key={method} className="rounded-brand border border-brand-border bg-brand-surface p-4">
            <p className="font-medium">{METHOD_LABEL[method]}</p>
            {open ? (
              <div className="mt-2 space-y-1 text-sm">
                <p className="text-brand-muted">Abierta el {formatDateTime12(open.openedAt)}</p>
                <p>Saldo inicial: {formatPrice(open.openingAmount.toString())}</p>
                <p className="font-medium">Saldo esperado ahora: {formatPrice(expected ?? 0)}</p>
                {canManage && (
                  <form
                    action={closeCashSession.bind(null, open.id)}
                    className="mt-3 space-y-2"
                  >
                    <label className="block text-xs font-medium">Saldo real</label>
                    <input
                      type="number"
                      name="actualAmount"
                      step="0.01"
                      min={0}
                      required
                      className="w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
                    />
                    <ConfirmSubmitButton
                      type="submit"
                      size="sm"
                      confirmMessage={`¿Cerrar la sesión de ${METHOD_LABEL[method]}?`}
                    >
                      Cerrar sesión
                    </ConfirmSubmitButton>
                  </form>
                )}
              </div>
            ) : canManage ? (
              <form action={openCashSession} className="mt-3 space-y-2">
                <input type="hidden" name="paymentMethod" value={method} />
                <label className="block text-xs font-medium">Saldo inicial</label>
                <input
                  type="number"
                  name="openingAmount"
                  step="0.01"
                  min={0}
                  required
                  className="w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
                />
                <Button type="submit" size="sm">
                  Abrir caja
                </Button>
              </form>
            ) : (
              <p className="mt-2 text-sm text-brand-muted">Sin sesión abierta.</p>
            )}
          </div>
        ))}
      </div>

      {canManage && addableMethods.length > 0 && (
        <div className="mt-4">
          <details className="rounded-brand border border-dashed border-brand-border p-4">
            <summary className="cursor-pointer text-sm font-medium">
              + Conciliar otro medio de pago
            </summary>
            <form action={openCashSession} className="mt-3 flex flex-wrap items-end gap-3 text-sm">
              <div>
                <label className="block text-xs font-medium">Medio de pago</label>
                <select
                  name="paymentMethod"
                  required
                  className="mt-1 rounded-brand border border-brand-border px-3 py-2"
                >
                  {addableMethods.map((m) => (
                    <option key={m} value={m}>
                      {METHOD_LABEL[m]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium">Saldo inicial</label>
                <input
                  type="number"
                  name="openingAmount"
                  step="0.01"
                  min={0}
                  required
                  className="mt-1 rounded-brand border border-brand-border px-3 py-2"
                />
              </div>
              <Button type="submit" size="sm">
                Agregar
              </Button>
            </form>
          </details>
        </div>
      )}

      <h2 className="mt-8 font-display text-lg">Historial</h2>
      <div className="mt-3 overflow-x-auto rounded-brand border border-brand-border bg-brand-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-brand-border text-brand-muted">
            <tr>
              <th className="px-4 py-3">Medio de pago</th>
              <th className="px-4 py-3">Apertura</th>
              <th className="px-4 py-3">Cierre</th>
              <th className="px-4 py-3">Esperado</th>
              <th className="px-4 py-3">Real</th>
              <th className="px-4 py-3">Diferencia</th>
            </tr>
          </thead>
          <tbody>
            {closedSessions.map((s) => (
              <tr key={s.id} className="border-b border-brand-border last:border-0">
                <td className="px-4 py-3">{METHOD_LABEL[s.paymentMethod] ?? s.paymentMethod}</td>
                <td className="px-4 py-3">{formatDateTime12(s.openedAt)}</td>
                <td className="px-4 py-3">{s.closedAt ? formatDateTime12(s.closedAt) : "—"}</td>
                <td className="px-4 py-3">{formatPrice(s.expectedAmount?.toString() ?? "0")}</td>
                <td className="px-4 py-3">{formatPrice(s.actualAmount?.toString() ?? "0")}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      s.difference && Number(s.difference) !== 0 ? "font-medium text-brand-accent" : undefined
                    }
                  >
                    {formatPrice(s.difference?.toString() ?? "0")}
                  </span>
                </td>
              </tr>
            ))}
            {closedSessions.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-brand-muted">
                  Todavía no hay sesiones cerradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
