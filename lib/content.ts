import { prisma } from "@/lib/prisma";

// A diferencia de getPublishedServices (solo lo que se ve en la web
// pública), esto es para uso de staff/sistema: Agenda, Facturas,
// Promociones y el catálogo que ofrece el asistente de WhatsApp. Un
// servicio en ACTIVO ya se puede agendar/facturar/cotizar aunque todavía
// no tenga foto o descripción lista para publicarse en la web.
export function getBookableServices() {
  return prisma.service.findMany({
    where: { status: { in: ["ACTIVO", "PUBLISHED"] } },
    orderBy: { order: "asc" },
  });
}

export function getPublishedServices() {
  return prisma.service.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { order: "asc" },
  });
}

export function getCarouselServices() {
  return prisma.service.findMany({
    where: { status: "PUBLISHED", showInCarousel: true },
    orderBy: { order: "asc" },
  });
}

export function getServiceBySlug(slug: string) {
  return prisma.service.findFirst({
    where: { slug, status: "PUBLISHED" },
  });
}

export function getActivePromotions() {
  const now = new Date();
  return prisma.promotion.findMany({
    where: { status: "PUBLISHED", startDate: { lte: now }, endDate: { gte: now } },
    orderBy: { order: "asc" },
    include: { services: true },
  });
}

// Lo consulta el layout raíz en cada request (público y admin) para decidir
// si el menú muestra "Promociones". Sin caché a propósito: es un count()
// liviano e indexado, y cachearlo (probado con unstable_cache + tags) no
// invalidaba de forma confiable al publicar/despublicar una promoción —
// mejor una consulta más que un menú desactualizado.
export async function hasActivePromotions() {
  const now = new Date();
  const count = await prisma.promotion.count({
    where: { status: "PUBLISHED", startDate: { lte: now }, endDate: { gte: now } },
  });
  return count > 0;
}

export function getPromotionBySlug(slug: string) {
  return prisma.promotion.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: { services: true },
  });
}

export function getPublishedPosts() {
  return prisma.post.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
  });
}

export function getPostBySlug(slug: string) {
  return prisma.post.findFirst({
    where: { slug, status: "PUBLISHED" },
  });
}
