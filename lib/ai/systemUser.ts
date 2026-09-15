import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

/**
 * Cuenta "sistema" a la que se atribuyen los turnos/clientes que crea el
 * asistente de IA (`createdByUserId` es obligatorio en Appointment/Client
 * pero es texto plano, sin FK — igual que AuditLog.userId). `active: false`
 * para que nunca aparezca como profesional agendable ni pueda loguearse de
 * verdad (la contraseña es aleatoria y no se comparte).
 */
const SYSTEM_ASSISTANT_EMAIL = "asistente@dermalash.internal";

let cachedId: string | null = null;

export async function getSystemAssistantUserId(): Promise<string> {
  if (cachedId) return cachedId;

  const existing = await prisma.adminUser.findUnique({ where: { email: SYSTEM_ASSISTANT_EMAIL } });
  if (existing) {
    cachedId = existing.id;
    return existing.id;
  }

  const passwordHash = await bcrypt.hash(crypto.randomUUID(), 10);
  const created = await prisma.adminUser.create({
    data: {
      email: SYSTEM_ASSISTANT_EMAIL,
      passwordHash,
      name: "Asistente Virtual",
      role: "ADMIN",
      active: false,
    },
  });
  cachedId = created.id;
  return created.id;
}
