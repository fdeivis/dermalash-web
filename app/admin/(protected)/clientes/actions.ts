"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth";
import { uploadPrivateFile } from "@/lib/supabase";

const clientSchema = z.object({
  firstName: z.string().min(1, "El nombre es obligatorio"),
  lastName: z.string().min(1, "El apellido es obligatorio"),
  birthDate: z.coerce.date().optional(),
  sex: z.enum(["HOMBRE", "MUJER", "OTRO"]).optional(),
  documentId: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z
    .string()
    .regex(/^\d{9,12}$/, "El WhatsApp debe tener entre 9 y 12 dígitos, sin espacios ni símbolos")
    .optional(),
  email: z.string().email("Email inválido").optional(),
  notes: z.string().optional(),
  healthNotes: z.string().optional(),
});

function parseFormData(formData: FormData) {
  return clientSchema.parse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    birthDate: formData.get("birthDate") || undefined,
    sex: formData.get("sex") || undefined,
    documentId: formData.get("documentId") || undefined,
    phone: formData.get("phone") || undefined,
    whatsapp: formData.get("whatsapp") || undefined,
    email: formData.get("email") || undefined,
    notes: formData.get("notes") || undefined,
    healthNotes: formData.get("healthNotes") || undefined,
  });
}

export async function createClient(formData: FormData) {
  const session = await requireAdminSession();
  const data = parseFormData(formData);

  const client = await prisma.client.create({
    data: { ...data, createdByUserId: session.user.id },
  });

  revalidatePath("/admin/clientes");
  redirect(`/admin/clientes/${client.id}`);
}

export async function updateClient(id: string, formData: FormData) {
  await requireAdminSession();
  const data = parseFormData(formData);

  await prisma.client.update({ where: { id }, data });

  revalidatePath("/admin/clientes");
  revalidatePath(`/admin/clientes/${id}`);
  redirect(`/admin/clientes/${id}`);
}

const attachmentKindSchema = z.enum(["PHOTO", "DOCUMENT", "HEALTH_RECORD"]);

export async function addClientAttachment(
  clientId: string,
  kind: string,
  formData: FormData
): Promise<{ error?: string }> {
  const session = await requireAdminSession();
  const parsedKind = attachmentKindSchema.parse(kind);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "No se seleccionó ningún archivo" };
  }

  try {
    const path = await uploadPrivateFile(file, `clientes/${clientId}`);
    await prisma.clientAttachment.create({
      data: {
        clientId,
        kind: parsedKind,
        storagePath: path,
        uploadedByUserId: session.user.id,
      },
    });
    revalidatePath(`/admin/clientes/${clientId}`);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Error al subir el archivo" };
  }
}
