import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    const loginUrl = new URL("/admin/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Todo lo bajo /admin es contenido por sesión. El Cache-Control por
  // defecto de Next para páginas dinámicas ("no-cache, must-revalidate")
  // no varía por Cookie, así que un proxy intermedio (ej. el forwarding de
  // puertos de Codespaces) podría llegar a servirle a un usuario la
  // respuesta cacheada de otro. Se fuerza acá porque `headers()` en
  // next.config.mjs no alcanza a pisar el Cache-Control que Next asigna a
  // las páginas dinámicas.
  const response = NextResponse.next();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/admin", "/admin/((?!login).*)"],
};
