import { prisma } from "@/lib/prisma";
import { PromotionForm } from "@/components/admin/PromotionForm";
import { requirePagePermission } from "@/lib/auth";
import { createPromotion } from "../actions";

// La lista de servicios debe reflejar siempre el estado actual: crear un
// servicio nuevo no revalida esta página (solo revalida /admin/servicios).
export const dynamic = "force-dynamic";

export default async function NuevaPromocionPage() {
  await requirePagePermission("promociones.gestionar");
  const allServices = await prisma.service.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { order: "asc" },
  });

  return (
    <div>
      <h1 className="font-display text-2xl">Nueva promoción</h1>
      <div className="mt-6">
        <PromotionForm allServices={allServices} action={createPromotion} />
      </div>
    </div>
  );
}
