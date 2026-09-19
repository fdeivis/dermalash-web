import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePagePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getSchedulableProfessionals, professionalLabel, peruParts } from "@/lib/scheduling";
import { generateTimeOptions } from "@/lib/time";

const TIME_OPTIONS = generateTimeOptions();
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import {
  rescheduleAppointment,
  cancelAppointment,
  markNoShow,
  confirmAppointment,
  deleteAppointment,
} from "../actions";

export const dynamic = "force-dynamic";

const ERROR_LABEL: Record<string, string> = {
  "fuera-de-horario":
    "Ese horario está fuera del horario habitual del profesional. Marca \"Forzar\" si igual quieres reprogramarlo ahí.",
  feriado:
    "Ese día el profesional tiene una ausencia o es feriado. Marca \"Forzar\" si igual quieres reprogramarlo ahí.",
};

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

// `date` acá es el startAt real de un turno: se lee en hora de Perú, no en
// el huso del servidor (ver lib/time.ts).
function toDateKey(date: Date) {
  const { year, month, day } = peruParts(date);
  return `${year}-${pad(month)}-${pad(day)}`;
}

function toTimeKey(date: Date) {
  const { hour, minute } = peruParts(date);
  return `${pad(hour)}:${pad(minute)}`;
}

export default async function TurnoDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requirePagePermission("agenda.gestionar");
  const { id } = await params;
  const { error } = await searchParams;

  const [appointment, professionals] = await Promise.all([
    prisma.appointment.findUniqueOrThrow({
      where: { id },
      include: {
        client: true,
        professional: true,
        services: { include: { service: true } },
        session: true,
      },
    }),
    getSchedulableProfessionals(),
  ]);

  const isActive = appointment.status === "RESERVADO" || appointment.status === "CONFIRMADO";
  const canCancel = isActive && !appointment.session;
  const canDeleteAppointment = await hasPermission(session.user.role, "agenda.eliminar");

  return (
    <div className="max-w-xl">
      <Link href="/admin/agenda" className="text-sm text-brand-muted underline">
        ← Volver a la agenda
      </Link>
      <h1 className="mt-2 font-display text-2xl">
        Turno de {appointment.client.firstName} {appointment.client.lastName}
      </h1>
      <p className="mt-1 text-sm text-brand-muted">
        {appointment.services.map((l) => l.service.name).join(", ")} · con{" "}
        {professionalLabel(appointment.professional)} · estado: {appointment.status}
        {appointment.source === "WHATSAPP" && " · originado por WhatsApp"}
      </p>

      {error && (
        <p className="mt-4 rounded-brand border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {ERROR_LABEL[error] ?? "No se pudo aplicar el cambio."}
        </p>
      )}

      {appointment.session && (
        <p className="mt-4 rounded-brand border border-brand-border bg-brand-bg px-3 py-2 text-sm">
          Este turno ya tiene una factura registrada. Para liberar o cancelar el turno, primero hay
          que borrar la factura desde{" "}
          <Link href="/admin/sesiones" className="underline">
            Facturas
          </Link>
          .
        </p>
      )}

      {!appointment.session && isActive && (
        <div className="mt-6">
          <Link href={`/admin/sesiones/nuevo?appointmentId=${appointment.id}`}>
            <Button>Registrar factura</Button>
          </Link>
        </div>
      )}

      {isActive && (
        <section className="mt-8">
          <h2 className="font-display text-lg">Reprogramar</h2>
          <form action={rescheduleAppointment.bind(null, appointment.id)} className="mt-3 space-y-4">
            <div>
              <label className="block text-sm font-medium">Profesional</label>
              <select
                name="professionalId"
                required
                defaultValue={appointment.professionalId}
                className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
              >
                {professionals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {professionalLabel(p)}
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
                  defaultValue={toDateKey(appointment.startAt)}
                  className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Hora de inicio</label>
                <select
                  name="startTime"
                  required
                  defaultValue={toTimeKey(appointment.startAt)}
                  className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
                >
                  {TIME_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-brand-muted">
              <input type="checkbox" name="force" />
              Forzar fuera del horario habitual, o pese a una ausencia/feriado
            </label>
            <Button type="submit" variant="outline">
              Guardar cambios
            </Button>
          </form>
        </section>
      )}

      {appointment.status === "RESERVADO" && (
        <form action={confirmAppointment.bind(null, appointment.id)} className="mt-6">
          <Button type="submit" variant="outline" size="sm">
            Marcar como confirmado
          </Button>
        </form>
      )}

      {isActive && !appointment.session && (
        <form action={markNoShow.bind(null, appointment.id)} className="mt-3">
          <ConfirmSubmitButton
            type="submit"
            variant="outline"
            size="sm"
            confirmMessage="¿Marcar este turno como no asistió?"
          >
            Marcar no asistió
          </ConfirmSubmitButton>
        </form>
      )}

      {canCancel && (
        <section className="mt-8">
          <h2 className="font-display text-lg">Cancelar turno</h2>
          <form action={cancelAppointment.bind(null, appointment.id)} className="mt-3 space-y-3">
            <textarea
              name="cancelReason"
              rows={2}
              placeholder="Motivo (opcional)"
              className="w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
            />
            <ConfirmSubmitButton
              type="submit"
              variant="danger"
              confirmMessage="¿Cancelar este turno? Se notificará en el panel."
            >
              Cancelar turno
            </ConfirmSubmitButton>
          </form>
        </section>
      )}

      {canDeleteAppointment && (
        <section className="mt-10 border-t border-brand-border pt-6">
          <h2 className="font-display text-lg text-red-700">Zona de administrador</h2>
          <form action={deleteAppointment.bind(null, appointment.id)} className="mt-3">
            <ConfirmSubmitButton
              type="submit"
              variant="danger"
              confirmMessage="¿Borrar este turno definitivamente? No se puede deshacer."
            >
              Borrar turno definitivamente
            </ConfirmSubmitButton>
          </form>
        </section>
      )}
    </div>
  );
}
