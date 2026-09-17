import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PromotionForm } from "@/components/admin/PromotionForm";
import { requirePagePermission } from "@/lib/auth";
import { updatePromotion } from "../actions";

export default async function EditarPromocionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePagePermission("promociones.gestionar");
  const { id } = await params;
  const promotion = await prisma.promotion.findUnique({ where: { id }, include: { services: true } });
  if (!promotion) notFound();

  // Solo se ofrecen servicios agendables (Activo o Publicado) para agregar,
  // pero los que ya estaban asociados (aunque después se hayan pasado a
  // borrador) se mantienen visibles para no sacarlos de la promoción sin
  // querer.
  const allServices = await prisma.service.findMany({
    where: {
      OR: [{ status: { in: ["ACTIVO", "PUBLISHED"] } }, { id: { in: promotion.services.map((s) => s.id) } }],
    },
    orderBy: { order: "asc" },
  });

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
