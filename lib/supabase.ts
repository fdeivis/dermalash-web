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
 * Borra un archivo privado del bucket (usado al eliminar un cliente).
 */
export async function deletePrivateFile(path: string): Promise<void> {
  const supabase = getSupabaseStorageClient();
  await supabase.storage.from(PRIVATE_STORAGE_BUCKET).remove([path]);
}

/**
 * Extrae el path dentro de STORAGE_BUCKET a partir de una URL pública de
 * Supabase Storage. Devuelve null si la URL no pertenece a este bucket (por
 * ejemplo, una URL externa pegada a mano en el campo de imagen), para que el
 * llamador la ignore en vez de intentar borrarla.
 */
export function getStoragePathFromPublicUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${STORAGE_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return decodeURIComponent(url.slice(index + marker.length));
}

/**
 * Borra una imagen del bucket público a partir de su URL pública. No hace
 * nada (sin lanzar error) si la URL no pertenece a este bucket, para no
 * romper el guardado si el campo tenía una URL externa.
 */
export async function deleteImage(url: string): Promise<void> {
  const path = getStoragePathFromPublicUrl(url);
  if (!path) return;

  const supabase = getSupabaseStorageClient();
  await supabase.storage.from(STORAGE_BUCKET).remove([path]);
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
