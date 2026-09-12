import type { AuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

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
        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
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
