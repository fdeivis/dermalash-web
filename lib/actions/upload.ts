"use server";

import { requireAdminSession } from "@/lib/auth";
import { uploadImage, uploadPrivateFile } from "@/lib/supabase";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function uploadImageAction(
  folder: string,
  formData: FormData
): Promise<{ url?: string; error?: string }> {
  await requireAdminSession();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "No se seleccionó ningún archivo" };
  }
  // Allowlist explícito (no "image/*"): excluye SVG a propósito, que puede
  // llevar <script> embebido (vector de XSS almacenado).
  if (!IMAGE_TYPES.includes(file.type)) {
    return { error: "El archivo debe ser una imagen (JPG, PNG, WEBP o GIF)" };
  }

  try {
    const url = await uploadImage(file, folder);
    return { url };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Error al subir la imagen" };
  }
}

const DOCUMENT_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

/**
 * Sube un documento público (ej. CV de un empleado): PDF o imagen. A
 * diferencia de uploadImageAction, acepta application/pdf además de
 * imágenes.
 */
export async function uploadDocumentAction(
  folder: string,
  formData: FormData
): Promise<{ url?: string; error?: string }> {
  await requireAdminSession();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "No se seleccionó ningún archivo" };
  }
  if (!DOCUMENT_TYPES.includes(file.type)) {
    return { error: "El archivo debe ser un PDF o una imagen (JPG, PNG, WEBP)" };
  }

  try {
    const url = await uploadImage(file, folder);
    return { url };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Error al subir el archivo" };
  }
}

/**
 * Sube un archivo privado (foto, documento o antecedente de un cliente) y
 * devuelve el path dentro del bucket privado, no una URL pública.
 */
export async function uploadPrivateFileAction(
  folder: string,
  formData: FormData
): Promise<{ path?: string; error?: string }> {
  await requireAdminSession();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "No se seleccionó ningún archivo" };
  }

  try {
    const path = await uploadPrivateFile(file, folder);
    return { path };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Error al subir el archivo" };
  }
}
