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
