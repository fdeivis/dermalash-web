import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("dermalash123", 10);

  await prisma.adminUser.upsert({
    where: { email: "admin@dermalash.pe" },
    update: {},
    create: {
      email: "admin@dermalash.pe",
      passwordHash,
      name: "Admin Dermalash",
    },
  });

  const facial = await prisma.service.upsert({
    where: { slug: "limpieza-facial-profunda" },
    update: {},
    create: {
      name: "Limpieza facial profunda",
      slug: "limpieza-facial-profunda",
      description:
        "Limpieza facial con extracción, exfoliación e hidratación para dejar tu piel renovada.",
      durationMinutes: 60,
      price: 120,
      priceFrom: false,
      status: "PUBLISHED",
      order: 1,
      images: ["https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800"],
    },
  });

  const laser = await prisma.service.upsert({
    where: { slug: "depilacion-laser" },
    update: {},
    create: {
      name: "Depilación láser",
      slug: "depilacion-laser",
      description: "Depilación láser de última tecnología, segura y progresiva.",
      durationMinutes: 30,
      price: 90,
      priceFrom: true,
      status: "PUBLISHED",
      order: 2,
      images: ["https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=800"],
    },
  });

  await prisma.service.upsert({
    where: { slug: "masaje-relajante" },
    update: {},
    create: {
      name: "Masaje relajante",
      slug: "masaje-relajante",
      description: "Masaje corporal para liberar tensión y mejorar tu bienestar.",
      durationMinutes: 50,
      price: 100,
      priceFrom: false,
      status: "DRAFT",
      order: 3,
      images: [],
    },
  });

  const now = new Date();
  const nextMonth = new Date();
  nextMonth.setMonth(now.getMonth() + 1);

  await prisma.promotion.upsert({
    where: { slug: "combo-facial-laser" },
    update: {},
    create: {
      name: "Combo Facial + Láser",
      slug: "combo-facial-laser",
      description: "Combiná limpieza facial y depilación láser con precio especial.",
      conditions: "Válido de lunes a jueves. No acumulable con otras promociones.",
      promoPrice: 180,
      startDate: now,
      endDate: nextMonth,
      status: "PUBLISHED",
      order: 1,
      images: ["https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800"],
      services: { connect: [{ id: facial.id }, { id: laser.id }] },
    },
  });

  await prisma.post.upsert({
    where: { slug: "bienvenida-dermalash" },
    update: {},
    create: {
      title: "¡Bienvenidos a Dermalash!",
      slug: "bienvenida-dermalash",
      excerpt: "Abrimos nuestras puertas en Lima con tratamientos estéticos de calidad.",
      content:
        "Estamos muy contentas de compartir con vos el lanzamiento de Dermalash. Conocé nuestros tratamientos y reservá tu cita por WhatsApp.",
      coverImage: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800",
      status: "PUBLISHED",
      publishedAt: now,
    },
  });

  console.log("Seed completado. Admin: admin@dermalash.pe / dermalash123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
