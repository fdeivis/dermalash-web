import type { AuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

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

        const user = await prisma.adminUser.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });
        if (!user || !user.active) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

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
