import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PromotionForm } from "@/components/admin/PromotionForm";
import { updatePromotion } from "../actions";

export default async function EditarPromocionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [promotion, allServices] = await Promise.all([
    prisma.promotion.findUnique({ where: { id }, include: { services: true } }),
    prisma.service.findMany({ orderBy: { order: "asc" } }),
  ]);

  if (!promotion) notFound();

  return (
    <div>
      <h1 className="font-display text-2xl">Editar promoción</h1>
      <div className="mt-6">
        <PromotionForm
          promotion={promotion}
          allServices={allServices}
          action={updatePromotion.bind(null, promotion.id)}
        />
      </div>
    </div>
  );
}
