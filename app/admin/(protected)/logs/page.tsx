import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateTime12 } from "@/lib/scheduling";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import { purgeOldLogs, purgeAllLogs } from "./actions";

// La actividad debe verse siempre al día: no hay ninguna acción que
// revalide esta página puntualmente (loguea desde todos lados).
export const dynamic = "force-dynamic";

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<{ purged?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session || !["SOCIO", "ADMIN"].includes(session.user.role)) {
    redirect("/admin");
  }

  const { purged } = await searchParams;

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <h1 className="font-display text-2xl">Registro de actividad</h1>
      <p className="mt-1 text-sm text-brand-muted">
        Qué hizo cada usuario y cuándo. Visible para Socio y Administrador.
      </p>

      {purged !== undefined && (
        <p className="mt-4 rounded-brand border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Se eliminaron {purged} registros del log.
        </p>
      )}

      <form
        action={purgeOldLogs}
        className="mt-6 flex flex-wrap items-end gap-3 rounded-brand border border-brand-border bg-brand-surface p-4"
      >
        <div>
          <label className="block text-sm font-medium">Purgar logs más antiguos que (días)</label>
          <input
            type="number"
            name="days"
            min={1}
            required
            defaultValue={90}
            className="mt-1 w-32 rounded-brand border border-brand-border px-3 py-2 text-sm"
          />
        </div>
        <ConfirmSubmitButton
          type="submit"
          variant="danger"
          size="sm"
          confirmMessage="¿Eliminar todos los logs más antiguos que ese número de días? No se puede deshacer."
        >
          Purgar
        </ConfirmSubmitButton>
      </form>

      <form action={purgeAllLogs} className="mt-3">
        <ConfirmSubmitButton
          type="submit"
          variant="danger"
          size="sm"
          confirmMessage="¿Eliminar TODOS los logs, incluidos los más recientes? No se puede deshacer."
        >
          Eliminar todos los logs
        </ConfirmSubmitButton>
      </form>

      <div className="mt-6 overflow-x-auto rounded-brand border border-brand-border bg-brand-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-brand-border text-brand-muted">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Acción</th>
              <th className="px-4 py-3">Entidad</th>
              <th className="px-4 py-3">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-brand-border last:border-0">
                <td className="whitespace-nowrap px-4 py-3">
                  {formatDateTime12(log.createdAt)}
                </td>
                <td className="px-4 py-3">{log.userName}</td>
                <td className="px-4 py-3">{log.userRole ?? "—"}</td>
                <td className="px-4 py-3">{log.action}</td>
                <td className="px-4 py-3">
                  {log.entityType}
                  {log.entityId ? ` (${log.entityId.slice(0, 8)}…)` : ""}
                </td>
                <td className="px-4 py-3">{log.detail ?? "—"}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-brand-muted">
                  Todavía no hay actividad registrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
