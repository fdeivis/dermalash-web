"use server";

import { requireAdminSession } from "@/lib/auth";
import { uploadImage } from "@/lib/supabase";

export async function uploadImageAction(
  folder: string,
  formData: FormData
): Promise<{ url?: string; error?: string }> {
  await requireAdminSession();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "No se seleccionó ningún archivo" };
  }
  if (!file.type.startsWith("image/")) {
    return { error: "El archivo debe ser una imagen" };
  }

  try {
    const url = await uploadImage(file, folder);
    return { url };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Error al subir la imagen" };
  }
}
