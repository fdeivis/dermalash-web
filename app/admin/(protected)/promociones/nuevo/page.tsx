import { prisma } from "@/lib/prisma";
import { PromotionForm } from "@/components/admin/PromotionForm";
import { createPromotion } from "../actions";

export default async function NuevaPromocionPage() {
  const allServices = await prisma.service.findMany({ orderBy: { order: "asc" } });

  return (
    <div>
      <h1 className="font-display text-2xl">Nueva promoción</h1>
      <div className="mt-6">
        <PromotionForm allServices={allServices} action={createPromotion} />
      </div>
    </div>
  );
}
