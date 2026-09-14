import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ServiceForm } from "@/components/admin/ServiceForm";
import { requirePagePermission } from "@/lib/auth";
import { updateService } from "../actions";

export default async function EditarServicioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePagePermission("servicios.gestionar");
  const { id } = await params;
  const service = await prisma.service.findUnique({ where: { id } });
  if (!service) notFound();

  return (
    <div>
      <h1 className="font-display text-2xl">Editar servicio</h1>
      <div className="mt-6">
        <ServiceForm service={service} action={updateService.bind(null, service.id)} />
      </div>
    </div>
  );
}
