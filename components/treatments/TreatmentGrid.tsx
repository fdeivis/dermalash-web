import type { Service } from "@prisma/client";
import { TreatmentCard } from "@/components/treatments/TreatmentCard";

export function TreatmentGrid({ services }: { services: Service[] }) {
  if (services.length === 0) {
    return (
      <p className="text-center text-brand-muted">
        Todavía no hay tratamientos publicados.
      </p>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {services.map((service) => (
        <TreatmentCard key={service.id} service={service} />
      ))}
    </div>
  );
}
