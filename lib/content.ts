import { prisma } from "@/lib/prisma";

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
