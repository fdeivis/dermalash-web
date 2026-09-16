import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { requirePagePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { computeCashBalance } from "@/lib/cash";
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
  const cards = await Promise.all(
    RECONCILABLE_METHODS.map(async (method) => {
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
        Conciliación por medio de pago: abrí una sesión con el saldo inicial y cerrala comparando
        el saldo esperado (calculado) contra el real (contado a mano, o visto en la app del
        banco/Yape).
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
                <p className="text-brand-muted">
                  Abierta el {open.openedAt.toLocaleString("es-PE")}
                </p>
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
                  Abrir sesión
                </Button>
              </form>
            ) : (
              <p className="mt-2 text-sm text-brand-muted">Sin sesión abierta.</p>
            )}
          </div>
        ))}
      </div>

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
                <td className="px-4 py-3">{s.openedAt.toLocaleString("es-PE")}</td>
                <td className="px-4 py-3">{s.closedAt?.toLocaleString("es-PE")}</td>
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
