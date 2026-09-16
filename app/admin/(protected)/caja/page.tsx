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
  "ya-abierta": "Ya hay una caja abierta.",
};

export default async function CajaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requirePagePermission("caja.ver");
  const canManage = await hasPermission(session.user.role, "caja.gestionar");
  const { error } = await searchParams;

  const [openSession, closedSessions] = await Promise.all([
    prisma.cashSession.findFirst({ where: { closedAt: null }, include: { accounts: true } }),
    prisma.cashSession.findMany({
      where: { closedAt: { not: null } },
      include: { accounts: true },
      orderBy: { closedAt: "desc" },
      take: 50,
    }),
  ]);

  const now = new Date();
  const openAccountsWithExpected = openSession
    ? await Promise.all(
        openSession.accounts.map(async (account) => ({
          ...account,
          expected: await computeCashBalance(
            account.paymentMethod,
            Number(account.openingAmount),
            openSession.id,
            openSession.openedAt,
            now
          ),
        }))
      )
    : [];

  return (
    <div>
      <h1 className="font-display text-2xl">Caja</h1>
      <p className="mt-2 text-sm text-brand-muted">
        Una sola caja, con una sola fecha de apertura. Efectivo es obligatorio; sumá Yape, Plin,
        tarjeta o transferencia si también querés conciliarlas esta vez.
      </p>

      {error && (
        <p className="mt-4 rounded-brand border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {ERROR_LABEL[error] ?? "No se pudo completar la operación."}
        </p>
      )}

      {openSession ? (
        <div className="mt-6 rounded-brand border border-brand-border bg-brand-surface p-5">
          <p className="text-sm text-brand-muted">Abierta el {formatDateTime12(openSession.openedAt)}</p>

          <form action={closeCashSession.bind(null, openSession.id)} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {openAccountsWithExpected.map((account) => (
                <div key={account.id} className="rounded-brand border border-brand-border p-3">
                  <p className="font-medium">{METHOD_LABEL[account.paymentMethod]}</p>
                  <p className="text-sm text-brand-muted">
                    Saldo apertura: {formatPrice(account.openingAmount.toString())}
                  </p>
                  <p className="text-sm text-brand-muted">
                    Movimiento (ingresos − egresos): {formatPrice(account.expected - Number(account.openingAmount))}
                  </p>
                  <p className="text-sm font-medium">Saldo esperado: {formatPrice(account.expected)}</p>
                  {canManage && (
                    <div className="mt-2">
                      <label className="block text-xs font-medium">Saldo real</label>
                      <input
                        type="number"
                        name={`actual_${account.paymentMethod}`}
                        step="0.01"
                        min={0}
                        required
                        className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
            {canManage && (
              <ConfirmSubmitButton
                type="submit"
                confirmMessage="¿Cerrar la caja? Se van a registrar los saldos reales de todas las cuentas."
              >
                Cerrar caja
              </ConfirmSubmitButton>
            )}
          </form>
        </div>
      ) : canManage ? (
        <form action={openCashSession} className="mt-6 max-w-xl space-y-4 rounded-brand border border-brand-border bg-brand-surface p-5">
          <div>
            <label className="block text-sm font-medium">Efectivo (obligatorio)</label>
            <input
              type="number"
              name="EFECTIVO"
              step="0.01"
              min={0}
              required
              className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
            />
          </div>
          <details className="rounded-brand border border-dashed border-brand-border p-3">
            <summary className="cursor-pointer text-sm font-medium">
              + Agregar otras cuentas (opcional)
            </summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {RECONCILABLE_METHODS.filter((m) => m !== "EFECTIVO").map((m) => (
                <div key={m}>
                  <label className="block text-xs font-medium">{METHOD_LABEL[m]}</label>
                  <input
                    type="number"
                    name={m}
                    step="0.01"
                    min={0}
                    placeholder="Sin conciliar"
                    className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
                  />
                </div>
              ))}
            </div>
          </details>
          <Button type="submit">Abrir caja</Button>
        </form>
      ) : (
        <p className="mt-6 text-sm text-brand-muted">La caja está cerrada.</p>
      )}

      <h2 className="mt-8 font-display text-lg">Historial</h2>
      <div className="mt-3 overflow-x-auto rounded-brand border border-brand-border bg-brand-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-brand-border text-brand-muted">
            <tr>
              <th className="px-4 py-3">Apertura</th>
              <th className="px-4 py-3">Cierre</th>
              <th className="px-4 py-3">Cuentas</th>
            </tr>
          </thead>
          <tbody>
            {closedSessions.map((s) => (
              <tr key={s.id} className="border-b border-brand-border last:border-0">
                <td className="px-4 py-3 align-top">{formatDateTime12(s.openedAt)}</td>
                <td className="px-4 py-3 align-top">{s.closedAt ? formatDateTime12(s.closedAt) : "—"}</td>
                <td className="px-4 py-3">
                  <div className="space-y-1">
                    {s.accounts.map((a) => (
                      <div key={a.id} className="flex justify-between gap-4">
                        <span>{METHOD_LABEL[a.paymentMethod] ?? a.paymentMethod}</span>
                        <span>
                          Apertura {formatPrice(a.openingAmount.toString())} · Esperado{" "}
                          {formatPrice(a.expectedAmount?.toString() ?? "0")} · Real{" "}
                          {formatPrice(a.actualAmount?.toString() ?? "0")} ·{" "}
                          <span
                            className={
                              a.difference && Number(a.difference) !== 0
                                ? "font-medium text-brand-accent"
                                : undefined
                            }
                          >
                            Dif. {formatPrice(a.difference?.toString() ?? "0")}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
            {closedSessions.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-brand-muted">
                  Todavía no hay cajas cerradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
