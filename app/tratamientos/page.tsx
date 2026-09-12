import type { Metadata } from "next";
import { getPublishedServices } from "@/lib/content";
import { TreatmentGrid } from "@/components/treatments/TreatmentGrid";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Tratamientos — Dermalash",
};

export default async function TratamientosPage() {
  const services = await getPublishedServices();

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="font-display text-3xl md:text-4xl">Tratamientos</h1>
      <p className="mt-2 max-w-2xl text-brand-muted">
        Conocé nuestro catálogo de tratamientos estéticos.
      </p>
      <div className="mt-10">
        <TreatmentGrid services={services} />
      </div>
    </div>
  );
}
