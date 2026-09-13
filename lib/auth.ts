import type { AuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

// Hash bcrypt de un valor arbitrario, nunca alcanzable con ninguna
// contraseña real: solo existe para que bcrypt.compare tarde lo mismo
// exista o no el usuario (mitiga enumeración de emails por timing).
const DUMMY_PASSWORD_HASH = "$2b$10$CwTycUXWue0Thq9StjUM0uJ8n/AXi/A8B7XBJvvnKG4AmYABtRJUS";

export const authOptions: AuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/admin/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credenciales",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;
        const email = credentials.email.toLowerCase();

        // Bloqueo por fuerza bruta respaldado en la propia base (no en
        // memoria): funciona igual aunque cada invocación serverless sea
        // una instancia distinta. 5 intentos fallidos / 15 min por email.
        const recentFailures = await prisma.auditLog.count({
          where: {
            action: "login.fallido",
            detail: email,
            createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
          },
        });
        if (recentFailures >= 5) return null;

        const user = await prisma.adminUser.findUnique({ where: { email } });
        // Comparar siempre contra un hash (real o señuelo) para que el
        // tiempo de respuesta no delate si el email existe o no.
        const hashToCompare = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
        const valid = await bcrypt.compare(credentials.password, hashToCompare);

        if (!user || !user.active || !valid) {
          await prisma.auditLog
            .create({
              data: { userName: email, action: "login.fallido", entityType: "AdminUser", detail: email },
            })
            .catch((error) => console.error("No se pudo registrar el log de auditoría:", error));
          return null;
        }

        await prisma.auditLog
          .create({
            data: { userId: user.id, userName: user.name, userRole: user.role, action: "login", entityType: "AdminUser", entityId: user.id },
          })
          .catch((error) => console.error("No se pudo registrar el log de auditoría:", error));

        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
};

/**
 * Guard para invocar al inicio de cada Server Action que mute contenido.
 * El proxy (proxy.ts) ya protege las páginas /admin, pero las Server
 * Actions se invocan como su propio endpoint: no depender únicamente
 * del proxy ante un cambio de matcher o de ruta.
 */
export async function requireAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("No autorizado");
  return session;
}

/**
 * Primer punto real de restricción por rol (el resto del panel todavía no
 * las aplica a propósito): la vista de logs y su purga son solo para Socio.
 */
export async function requireSocio() {
  const session = await requireAdminSession();
  if (session.user.role !== "SOCIO") throw new Error("Solo el Socio puede acceder a esta sección");
  return session;
}

/**
 * MVP3: quién puede administrar la Agenda (crear/modificar/cancelar turnos,
 * y configurar horarios). El Esteticista queda afuera a propósito: solo
 * puede consultar su propia agenda.
 */
export async function requireAgendaManager() {
  const session = await requireAdminSession();
  if (!["SOCIO", "ADMIN", "ENCARGADO"].includes(session.user.role)) {
    throw new Error("No tenés permiso para administrar la agenda");
  }
  return session;
}

/**
 * MVP3: borrado definitivo de un turno (distinto de cancelar) es exclusivo
 * de Administrador, como capa adicional de control sobre acciones
 * irreversibles.
 */
export async function requireAdminRole() {
  const session = await requireAdminSession();
  if (session.user.role !== "ADMIN") throw new Error("Solo Administrador puede realizar esta acción");
  return session;
}

/**
 * MVP3: borrar una sesión ya registrada por error es exclusivo de Socio y
 * Administrador (no de Encargado).
 */
export async function requireSocioOrAdmin() {
  const session = await requireAdminSession();
  if (!["SOCIO", "ADMIN"].includes(session.user.role)) {
    throw new Error("Solo Socio o Administrador pueden realizar esta acción");
  }
  return session;
}
