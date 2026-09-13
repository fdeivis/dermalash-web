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

/**
 * Bucket privado (marcado como "private" en Supabase Storage) para archivos
 * sensibles de clientes: fotos, documentos y antecedentes de salud. Nunca se
 * expone su URL pública; solo se generan URLs firmadas bajo demanda.
 */
export const PRIVATE_STORAGE_BUCKET = process.env.SUPABASE_PRIVATE_BUCKET ?? "private";

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

/**
 * Sube un archivo privado de cliente (foto, documento, antecedente) y
 * devuelve el path dentro del bucket, no una URL. El path es lo único que se
 * persiste en la base de datos.
 */
export async function uploadPrivateFile(file: File, folder: string): Promise<string> {
  const supabase = getSupabaseStorageClient();
  const ext = file.name.split(".").pop();
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(PRIVATE_STORAGE_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) throw new Error(`Error al subir el archivo: ${error.message}`);

  return path;
}

/**
 * Genera una URL firmada de corta duración para leer un archivo privado.
 * Debe invocarse siempre desde el servidor, después de requireAdminSession().
 */
export async function getSignedUrl(path: string, expiresInSeconds = 300): Promise<string> {
  const supabase = getSupabaseStorageClient();
  const { data, error } = await supabase.storage
    .from(PRIVATE_STORAGE_BUCKET)
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data) throw new Error(`Error al generar la URL firmada: ${error?.message}`);

  return data.signedUrl;
}
