import { prisma } from "@/lib/prisma";
import { requireAgendaManager } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import { AlertList } from "@/components/admin/AlertList";
import { acknowledgeAllAlerts, deleteAllAlerts } from "./actions";

export const dynamic = "force-dynamic";

export default async function AlertasPage() {
  await requireAgendaManager();
  const alerts = await prisma.alert.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  const unacknowledgedCount = alerts.filter((a) => !a.acknowledgedAt).length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl">Alertas</h1>
        <div className="flex items-center gap-2">
          {unacknowledgedCount > 0 && (
            <form action={acknowledgeAllAlerts}>
              <Button type="submit" variant="outline" size="sm">
                Marcar todas como vistas
              </Button>
            </form>
          )}
          {alerts.length > 0 && (
            <form action={deleteAllAlerts}>
              <ConfirmSubmitButton
                type="submit"
                variant="danger"
                size="sm"
                confirmMessage="¿Eliminar TODAS las alertas? No se puede deshacer."
              >
                Eliminar todas
              </ConfirmSubmitButton>
            </form>
          )}
        </div>
      </div>

      <div className="mt-6">
        <AlertList
          alerts={alerts.map((a) => ({
            id: a.id,
            type: a.type,
            message: a.message,
            source: a.source,
            appointmentId: a.appointmentId,
            acknowledgedAt: a.acknowledgedAt ? a.acknowledgedAt.toISOString() : null,
            createdAtLabel: a.createdAt.toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" }),
          }))}
        />
      </div>
    </div>
  );
}
