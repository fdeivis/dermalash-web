import { prisma } from "@/lib/prisma";

export type PriceLine = {
  serviceId: string;
  priceApplied: number;
  promotionId: string | null;
};

export type ResolvedSessionPricing = {
  lines: PriceLine[];
  suggestedTotal: number;
  appliedPromotionId: string | null;
};

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

/**
 * Precio/promoción vigente para un conjunto de servicios de una sesión, a una
 * fecha dada. `Promotion.promoPrice` es un precio de combo para TODO el
 * conjunto de servicios de la promoción (no un precio por servicio
 * individual): solo se aplica cuando los servicios de la promoción están
 * todos incluidos en los seleccionados, repartiendo el precio de combo en
 * partes iguales entre esas líneas para el detalle. Si hay varias
 * promociones aplicables, se prioriza la que cubre más servicios.
 */
export async function resolveSessionPricing(
  serviceIds: string[],
  date: Date
): Promise<ResolvedSessionPricing> {
  const [services, promotions] = await Promise.all([
    prisma.service.findMany({ where: { id: { in: serviceIds } } }),
    prisma.promotion.findMany({
      where: {
        status: "PUBLISHED",
        // Compara por día completo (no por instante exacto): una sesión
        // registrada a medianoche debe seguir viendo vigente una promoción
        // que arrancó más tarde ese mismo día.
        startDate: { lte: endOfDay(date) },
        endDate: { gte: startOfDay(date) },
        promoPrice: { not: null },
      },
      include: { services: true },
    }),
  ]);

  const selectedSet = new Set(serviceIds);
  const applicable = promotions
    .filter((p) => p.services.length > 0 && p.services.every((s) => selectedSet.has(s.id)))
    .sort((a, b) => b.services.length - a.services.length);
  const promotion = applicable[0] ?? null;

  const basePrice = (serviceId: string) =>
    Number(services.find((s) => s.id === serviceId)?.price ?? 0);

  if (promotion) {
    const coveredIds = new Set(promotion.services.map((s) => s.id));
    const perServicePrice = Number(promotion.promoPrice) / promotion.services.length;

    const lines: PriceLine[] = serviceIds.map((serviceId) =>
      coveredIds.has(serviceId)
        ? { serviceId, priceApplied: perServicePrice, promotionId: promotion.id }
        : { serviceId, priceApplied: basePrice(serviceId), promotionId: null }
    );

    return {
      lines,
      suggestedTotal: lines.reduce((sum, l) => sum + l.priceApplied, 0),
      appliedPromotionId: promotion.id,
    };
  }

  const lines: PriceLine[] = serviceIds.map((serviceId) => ({
    serviceId,
    priceApplied: basePrice(serviceId),
    promotionId: null,
  }));

  return {
    lines,
    suggestedTotal: lines.reduce((sum, l) => sum + l.priceApplied, 0),
    appliedPromotionId: null,
  };
}
