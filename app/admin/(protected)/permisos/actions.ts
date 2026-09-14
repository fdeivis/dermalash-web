"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSocioOrAdmin } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import {
  ALL_PERMISSION_KEYS,
  CONFIGURABLE_ROLES,
  saveRolePermissions,
  type PermissionKey,
} from "@/lib/permissions";

// Ver y editar permisos es exclusivo de Socio/Administrador (ver
// requireSocioOrAdmin en lib/auth.ts): esta pantalla decide qué puede hacer
// cada rol, así que a propósito no es ella misma configurable.
export async function savePermissions(formData: FormData) {
  const session = await requireSocioOrAdmin();

  // Los checkbox desmarcados no viajan en el FormData: cada combinación
  // (rol, permiso) del catálogo se marca en `allowed` solo si su input
  // llegó marcado.
  const values = CONFIGURABLE_ROLES.flatMap((role) =>
    ALL_PERMISSION_KEYS.map((permission: PermissionKey) => ({
      role,
      permission,
      allowed: formData.get(`perm__${role}__${permission}`) === "on",
    }))
  );

  await saveRolePermissions(values);
  await logAction(session, "permisos.actualizar", "RolePermission", undefined, `${values.length} permisos`);

  revalidatePath("/admin/permisos");
  redirect("/admin/permisos?guardado=1");
}
