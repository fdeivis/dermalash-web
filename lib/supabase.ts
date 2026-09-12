import { createClient } from "@supabase/supabase-js";

/**
 * Cliente de Supabase para subir imágenes desde Server Actions,
 * usando la service role key (nunca exponer al cliente).
 * Requiere NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
 * configurados con las credenciales del proyecto Supabase real.
 */
export function getSupabaseStorageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Supabase no está configurado: definí NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local"
    );
  }

  return createClient(url, serviceKey);
}

export const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "media";

export async function uploadImage(file: File, folder: string): Promise<string> {
  const supabase = getSupabaseStorageClient();
  const ext = file.name.split(".").pop();
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) throw new Error(`Error al subir la imagen: ${error.message}`);

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
