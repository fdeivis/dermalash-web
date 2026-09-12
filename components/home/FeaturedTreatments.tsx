import Link from "next/link";
import type { Service } from "@prisma/client";
import { TreatmentGrid } from "@/components/treatments/TreatmentGrid";

export function FeaturedTreatments({ services }: { services: Service[] }) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="mb-8 flex items-end justify-between">
        <h2 className="font-display text-2xl md:text-3xl">Tratamientos destacados</h2>
        <Link href="/tratamientos" className="text-sm text-brand-accent hover:underline">
          Ver todos
        </Link>
      </div>
      <TreatmentGrid services={services} />
    </section>
  );
}
