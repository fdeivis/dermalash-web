"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { branding } from "@/lib/branding";
import { Button } from "@/components/ui/button";

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Email o contraseña incorrectos.");
        setLoading(false);
        return;
      }

      // Navegación completa (no client-side): evita que el router cache de
      // Next.js reutilice una respuesta de /admin cacheada de antes de
      // loguearse (proxy.ts la había redirigido a /admin/login), lo que
      // hacía que el primer intento de login pareciera no hacer nada.
      window.location.href = callbackUrl;
    } catch {
      // Sin este catch, un error de red pasajero (frecuente en el primer
      // request luego de que el servidor estuvo inactivo) dejaba el botón
      // trabado en "Ingresando..." para siempre, sin ningún mensaje.
      setError("No se pudo conectar. Probá de nuevo en unos segundos.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4">
      {branding.logoWithBgUrl ? (
        <Image
          src={branding.logoWithBgUrl}
          alt={branding.siteName}
          width={240}
          height={240}
          priority
          className="mx-auto h-32 w-32 rounded-brand"
        />
      ) : (
        <h1 className="font-display text-2xl">Administración {branding.siteName}</h1>
      )}
      <p className="mt-4 text-center text-sm text-brand-muted">
        Ingresá con tu cuenta de administrador.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label className="block text-sm font-medium">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Contraseña</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Ingresando..." : "Ingresar"}
        </Button>
      </form>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
