// En GitHub Codespaces, el proxy de forwarding de puertos reescribe
// `x-forwarded-host` al dominio público (*.app.github.dev) aunque el
// navegador esté apuntando a localhost:3000. Next.js compara ese host
// contra el `origin` de cada Server Action para prevenir CSRF, y sin este
// origin permitido rechaza la acción con "Invalid Server Actions request."
// (esto afecta a cualquier acción, no solo a las nuevas de MVP2).
const codespaceOrigin =
  process.env.CODESPACE_NAME && process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN
    ? `${process.env.CODESPACE_NAME}-3000.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`
    : null;

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // MVP1: las imágenes se suben a Supabase Storage (dominio variable según
    // el proyecto) o pueden referenciar URLs externas ya hosteadas. Se
    // permite cualquier host https; ajustar a un allowlist concreto cuando
    // el proyecto Supabase definitivo esté configurado.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  experimental: {
    serverActions: {
      // Permite subir imágenes desde el panel (límite por defecto: 1mb).
      bodySizeLimit: "10mb",
      allowedOrigins: [
        "localhost:3000",
        "127.0.0.1:3000",
        ...(codespaceOrigin ? [codespaceOrigin] : []),
      ],
    },
  },
};

export default nextConfig;
