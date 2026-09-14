import { prisma } from "@/lib/prisma";
import { requirePagePermission } from "@/lib/auth";
import { getSchedulableProfessionals, professionalLabel } from "@/lib/scheduling";
import { AppointmentForm } from "@/components/admin/AppointmentForm";
import { createAppointment } from "../actions";

export const dynamic = "force-dynamic";

const ERROR_LABEL: Record<string, string> = {
  "fuera-de-horario":
    "Ese horario está fuera del horario habitual del profesional. Marcá \"Forzar\" si igual querés reservarlo.",
  solapado: "El profesional ya tiene un turno en ese horario.",
  feriado:
    "Ese día el profesional tiene una ausencia o es feriado. Marcá \"Forzar\" si igual querés reservarlo.",
};

export default async function NuevoTurnoPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    professionalId?: string;
    date?: string;
    startTime?: string;
    clientId?: string;
    serviceIds?: string | string[];
  }>;
}) {
  await requirePagePermission("agenda.gestionar");
  const { error, professionalId, date, startTime, clientId, serviceIds } = await searchParams;
  const serviceIdList = serviceIds ? (Array.isArray(serviceIds) ? serviceIds : [serviceIds]) : undefined;

  const [clients, professionals, services] = await Promise.all([
    prisma.client.findMany({ orderBy: { lastName: "asc" } }),
    getSchedulableProfessionals(),
    prisma.service.findMany({ where: { status: "PUBLISHED" }, orderBy: { order: "asc" } }),
  ]);

  return (
    <div>
      <h1 className="font-display text-2xl">Nuevo turno</h1>
      {error && (
        <p className="mt-2 rounded-brand border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {ERROR_LABEL[error] ?? "No se pudo guardar el turno."}
        </p>
      )}
      <div className="mt-6">
        <AppointmentForm
          clients={clients.map((c) => ({ id: c.id, name: `${c.firstName} ${c.lastName}` }))}
          professionals={professionals.map((p) => ({ id: p.id, name: professionalLabel(p) }))}
          services={services.map((s) => ({
            id: s.id,
            name: s.name,
            durationMinutes: s.durationMinutes,
          }))}
          action={createAppointment}
          defaultValues={{ professionalId, date, startTime, clientId, serviceIds: serviceIdList }}
        />
      </div>
    </div>
  );
}
