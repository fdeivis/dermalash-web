import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("dermalash123", 10);

  await prisma.adminUser.upsert({
    where: { email: "admin@dermalash.pe" },
    update: { role: "SOCIO" },
    create: {
      email: "admin@dermalash.pe",
      passwordHash,
      name: "Admin Dermalash",
      role: "SOCIO",
    },
  });

  await prisma.adminUser.upsert({
    where: { email: "administrador@dermalash.pe" },
    update: { role: "ADMIN" },
    create: {
      email: "administrador@dermalash.pe",
      passwordHash,
      name: "Administrador Dermalash",
      role: "ADMIN",
    },
  });

  const esteticistaUser = await prisma.adminUser.upsert({
    where: { email: "esteticista@dermalash.pe" },
    update: { role: "ESTETICISTA", canAttend: true },
    create: {
      email: "esteticista@dermalash.pe",
      passwordHash,
      name: "Ana Esteticista",
      role: "ESTETICISTA",
      canAttend: true,
    },
  });

  await prisma.employee.upsert({
    where: { adminUserId: esteticistaUser.id },
    update: {},
    create: {
      adminUserId: esteticistaUser.id,
      firstName: "Ana",
      lastName: "Esteticista",
      phone: "51999999998",
    },
  });

  // Para poder probar los permisos de Encargado (acceso a todo salvo
  // Empleados, ver /admin/permisos).
  const encargadoUser = await prisma.adminUser.upsert({
    where: { email: "encargado@dermalash.pe" },
    update: { role: "ENCARGADO", canAttend: true },
    create: {
      email: "encargado@dermalash.pe",
      passwordHash,
      name: "Luis Encargado",
      role: "ENCARGADO",
      canAttend: true,
    },
  });

  await prisma.employee.upsert({
    where: { adminUserId: encargadoUser.id },
    update: {},
    create: {
      adminUserId: encargadoUser.id,
      firstName: "Luis",
      lastName: "Encargado",
      phone: "51999999996",
    },
  });

  await prisma.client.upsert({
    where: { id: "seed-client-demo" },
    update: {},
    create: {
      id: "seed-client-demo",
      firstName: "Camila",
      lastName: "Cliente Demo",
      phone: "51999999997",
      createdByUserId: esteticistaUser.id,
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

  // MVP3: horario de lunes a viernes 09:00-18:00 para poder ver la agenda
  // con disponibilidad sin tener que cargarla a mano en cada entorno nuevo.
  for (let dayOfWeek = 1; dayOfWeek <= 5; dayOfWeek++) {
    const exists = await prisma.schedule.findFirst({
      where: { adminUserId: esteticistaUser.id, dayOfWeek },
    });
    if (!exists) {
      await prisma.schedule.create({
        data: { adminUserId: esteticistaUser.id, dayOfWeek, startMinute: 540, endMinute: 1080 },
      });
    }
  }

  console.log("Seed completado.");
  console.log("Socio: admin@dermalash.pe / dermalash123");
  console.log("Administrador: administrador@dermalash.pe / dermalash123");
  console.log("Encargado: encargado@dermalash.pe / dermalash123");
  console.log("Esteticista: esteticista@dermalash.pe / dermalash123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
