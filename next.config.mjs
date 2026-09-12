/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // MVP1: las imágenes se suben a Supabase Storage (dominio variable según
    // el proyecto) o pueden referenciar URLs externas ya hosteadas. Se
    // permite cualquier host https; ajustar a un allowlist concreto cuando
    // el proyecto Supabase definitivo esté configurado.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
