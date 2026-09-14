import { ServiceForm } from "@/components/admin/ServiceForm";
import { requirePagePermission } from "@/lib/auth";
import { createService } from "../actions";

export default async function NuevoServicioPage() {
  await requirePagePermission("servicios.gestionar");
  return (
    <div>
      <h1 className="font-display text-2xl">Nuevo servicio</h1>
      <div className="mt-6">
        <ServiceForm action={createService} />
      </div>
    </div>
  );
}
