import { prisma } from "@/lib/prisma";
import { peruParts, startOfDay, endOfDay } from "@/lib/scheduling";

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

// Día calendario de Perú (no el de UTC) al que pertenece un instante real —
// una sesión a las 11pm en Perú cae en el día siguiente en UTC, y debe
// seguir viendo las promociones vigentes de SU día, no del de UTC.
function peruDayOf(date: Date): Date {
  const { year, month, day } = peruParts(date);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Precio para un conjunto de servicios de una factura, a una fecha dada,
 * aplicando solo las promociones que el usuario eligió explícitamente
 * (`promotionIds`) — no se auto-detecta ninguna combinación de fondo.
 * `Promotion.promoPrice` es un precio de combo para TODO el conjunto de
 * servicios de la promoción (no un precio por servicio individual): una
 * promo elegida solo se aplica si sigue vigente/publicada para `date` y si
 * todos sus servicios están incluidos en `serviceIds`; si no, se ignora esa
 * promo puntual y sus servicios quedan a precio base (no se confía en lo que
 * mandó el formulario). El precio de combo se reparte en partes iguales
 * entre sus líneas para el detalle/reporting por servicio.
 */
export async function resolveSessionPricing(
  serviceIds: string[],
  promotionIds: string[],
  date: Date
): Promise<ResolvedSessionPricing> {
  const [services, promotions] = await Promise.all([
    prisma.service.findMany({ where: { id: { in: serviceIds } } }),
    promotionIds.length === 0
      ? Promise.resolve([])
      : prisma.promotion.findMany({
          where: {
            id: { in: promotionIds },
            status: "PUBLISHED",
            // Compara por día completo de Perú (no por instante exacto ni
            // por día de UTC): una sesión registrada a medianoche debe
            // seguir viendo vigente una promoción que arrancó más tarde ese
            // mismo día.
            startDate: { lte: endOfDay(peruDayOf(date)) },
            endDate: { gte: startOfDay(peruDayOf(date)) },
            promoPrice: { not: null },
          },
          include: { services: true },
        }),
  ]);

  const selectedSet = new Set(serviceIds);
  const basePrice = (serviceId: string) =>
    Number(services.find((s) => s.id === serviceId)?.price ?? 0);

  // Cada servicio se cubre por, a lo sumo, una promo elegida (la primera que
  // lo reclama); el resto de las promos elegidas que ya no son válidas o que
  // piden un servicio no seleccionado se ignoran en silencio.
  const coverage = new Map<string, { promotionId: string; price: number }>();
  let appliedPromotionId: string | null = null;
  for (const promotion of promotions) {
    if (promotion.services.length === 0) continue;
    if (!promotion.services.every((s) => selectedSet.has(s.id))) continue;
    if (promotion.services.some((s) => coverage.has(s.id))) continue;

    const perServicePrice = Number(promotion.promoPrice) / promotion.services.length;
    for (const s of promotion.services) {
      coverage.set(s.id, { promotionId: promotion.id, price: perServicePrice });
    }
    appliedPromotionId ??= promotion.id;
  }

  const lines: PriceLine[] = serviceIds.map((serviceId) => {
    const covered = coverage.get(serviceId);
    return covered
      ? { serviceId, priceApplied: covered.price, promotionId: covered.promotionId }
      : { serviceId, priceApplied: basePrice(serviceId), promotionId: null };
  });

  return {
    lines,
    suggestedTotal: lines.reduce((sum, l) => sum + l.priceApplied, 0),
    appliedPromotionId,
  };
}
