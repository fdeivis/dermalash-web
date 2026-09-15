"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { uploadPrivateFile, deletePrivateFile } from "@/lib/supabase";
import { logAction } from "@/lib/audit";

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
  source: z.enum(["WHATSAPP", "INSTAGRAM", "FACEBOOK", "REFERIDO", "PRESENCIAL", "OTRO"]).optional(),
  notes: z.string().max(2000, "Máximo 2000 caracteres").optional(),
  healthNotes: z.string().max(5000, "Máximo 5000 caracteres").optional(),
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
    source: formData.get("source") || undefined,
    notes: formData.get("notes") || undefined,
    healthNotes: formData.get("healthNotes") || undefined,
  });
}

export async function createClient(formData: FormData) {
  const session = await requirePermission("clientes.gestionar");
  const data = parseFormData(formData);

  const client = await prisma.client.create({
    data: { ...data, createdByUserId: session.user.id },
  });
  await logAction(session, "cliente.crear", "Client", client.id, `${data.firstName} ${data.lastName}`);

  revalidatePath("/admin/clientes");
  redirect(`/admin/clientes/${client.id}`);
}

export async function updateClient(id: string, formData: FormData) {
  const session = await requirePermission("clientes.gestionar");
  const data = parseFormData(formData);

  await prisma.client.update({ where: { id }, data });
  await logAction(session, "cliente.editar", "Client", id, `${data.firstName} ${data.lastName}`);

  revalidatePath("/admin/clientes");
  revalidatePath(`/admin/clientes/${id}`);
  redirect(`/admin/clientes/${id}`);
}

export async function deleteClient(id: string) {
  const session = await requirePermission("clientes.gestionar");

  const sessionCount = await prisma.clientSession.count({ where: { clientId: id } });
  if (sessionCount > 0) {
    redirect("/admin/clientes?error=tiene-sesiones");
  }
  // Appointment.clientId no permite ON DELETE (RESTRICT): sin este chequeo,
  // borrar un cliente con turnos (aunque estén cancelados) tira un error de
  // base de datos sin capturar en vez de este mensaje.
  const appointmentCount = await prisma.appointment.count({ where: { clientId: id } });
  if (appointmentCount > 0) {
    redirect("/admin/clientes?error=tiene-turnos");
  }

  const client = await prisma.client.findUniqueOrThrow({ where: { id } });
  const attachments = await prisma.clientAttachment.findMany({ where: { clientId: id } });
  await Promise.all(attachments.map((a) => deletePrivateFile(a.storagePath).catch(() => {})));

  await prisma.$transaction([
    prisma.clientAttachment.deleteMany({ where: { clientId: id } }),
    prisma.client.delete({ where: { id } }),
  ]);
  await logAction(session, "cliente.eliminar", "Client", id, `${client.firstName} ${client.lastName}`);

  revalidatePath("/admin/clientes");
  redirect("/admin/clientes");
}

const attachmentKindSchema = z.enum(["PHOTO", "DOCUMENT", "HEALTH_RECORD"]);
// Sin SVG a propósito (puede llevar <script> embebido).
const ATTACHMENT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];

export async function addClientAttachment(
  clientId: string,
  kind: string,
  formData: FormData
): Promise<{ error?: string }> {
  const session = await requirePermission("clientes.gestionar");
  const parsedKind = attachmentKindSchema.parse(kind);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "No se seleccionó ningún archivo" };
  }
  if (!ATTACHMENT_TYPES.includes(file.type)) {
    return { error: "El archivo debe ser una imagen (JPG, PNG, WEBP, GIF) o un PDF" };
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
    await logAction(session, "cliente.adjunto.subir", "Client", clientId, parsedKind);
    revalidatePath(`/admin/clientes/${clientId}`);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Error al subir el archivo" };
  }
}

export async function deleteClientAttachment(clientId: string, attachmentId: string) {
  const session = await requirePermission("clientes.gestionar");
  const attachment = await prisma.clientAttachment.findUniqueOrThrow({
    where: { id: attachmentId },
  });

  await prisma.clientAttachment.delete({ where: { id: attachmentId } });
  await deletePrivateFile(attachment.storagePath).catch(() => {});
  await logAction(session, "cliente.adjunto.eliminar", "Client", clientId, attachment.kind);

  revalidatePath(`/admin/clientes/${clientId}`);
}
