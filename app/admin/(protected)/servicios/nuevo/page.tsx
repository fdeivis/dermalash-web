import { ServiceForm } from "@/components/admin/ServiceForm";
import { createService } from "../actions";

export default function NuevoServicioPage() {
  return (
    <div>
      <h1 className="font-display text-2xl">Nuevo servicio</h1>
      <div className="mt-6">
        <ServiceForm action={createService} />
      </div>
    </div>
  );
}
