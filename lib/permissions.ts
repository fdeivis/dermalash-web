import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Catálogo de permisos configurables desde /admin/permisos. Admin queda
 * afuera a propósito (nunca tiene restricciones, ver hasPermission): esto
 * solo cubre Socio, Encargado y Esteticista.
 */
export const PERMISSION_MODULES = [
  {
    key: "empleados",
    label: "Empleados",
    permissions: [
      { key: "empleados.ver", label: "Ver el listado y la ficha de empleados" },
      { key: "empleados.gestionar", label: "Crear, editar, activar/desactivar y eliminar empleados" },
    ],
  },
  {
    key: "servicios",
    label: "Servicios",
    permissions: [
      { key: "servicios.ver", label: "Ver el listado de servicios" },
      { key: "servicios.gestionar", label: "Crear, editar, reordenar y eliminar servicios" },
    ],
  },
  {
    key: "promociones",
    label: "Promociones",
    permissions: [
      { key: "promociones.ver", label: "Ver el listado de promociones" },
      { key: "promociones.gestionar", label: "Crear, editar, reordenar y eliminar promociones" },
    ],
  },
  {
    key: "novedades",
    label: "Novedades",
    permissions: [
      { key: "novedades.ver", label: "Ver el listado de novedades" },
      { key: "novedades.gestionar", label: "Crear, editar y eliminar novedades" },
    ],
  },
  {
    key: "clientes",
    label: "Clientes",
    permissions: [
      { key: "clientes.ver", label: "Ver el listado y la ficha de clientes" },
      { key: "clientes.gestionar", label: "Crear, editar y eliminar clientes" },
    ],
  },
  {
    key: "agenda",
    label: "Agenda",
    permissions: [
      { key: "agenda.ver", label: "Consultar la agenda" },
      {
        key: "agenda.gestionar",
        label: "Crear, reprogramar, confirmar y cancelar turnos; administrar horarios",
      },
      { key: "agenda.eliminar", label: "Borrar turnos definitivamente" },
    ],
  },
  {
    key: "sesiones",
    label: "Sesiones",
    permissions: [
      { key: "sesiones.ver", label: "Ver el listado de sesiones registradas" },
      {
        key: "sesiones.crear",
        label: "Registrar sesiones (sin permiso para gestionar agenda, solo en turnos propios)",
      },
      { key: "sesiones.eliminar", label: "Eliminar sesiones registradas" },
    ],
  },
] as const;

export type PermissionKey = (typeof PERMISSION_MODULES)[number]["permissions"][number]["key"];

export const ALL_PERMISSION_KEYS: PermissionKey[] = PERMISSION_MODULES.flatMap((m) =>
  m.permissions.map((p) => p.key)
);

/** Roles cuyos permisos se administran desde /admin/permisos. Admin no entra acá. */
export const CONFIGURABLE_ROLES = ["SOCIO", "ENCARGADO", "ESTETICISTA"] as const;
export type ConfigurableRole = (typeof CONFIGURABLE_ROLES)[number];

const ROLE_LABEL: Record<ConfigurableRole, string> = {
  SOCIO: "Socio",
  ENCARGADO: "Encargado",
  ESTETICISTA: "Esteticista",
};
export { ROLE_LABEL as CONFIGURABLE_ROLE_LABEL };

/**
 * Valores de fábrica: se insertan en la migración `role_permissions` y se
 * usan acá como respaldo si alguna fila todavía no existe en la base (por
 * ejemplo, un permiso nuevo agregado después de esa migración).
 */
export const DEFAULT_PERMISSIONS: Record<ConfigurableRole, PermissionKey[]> = {
  // Rol separado de Admin a propósito (para poder restringirlo el día de
  // mañana), pero hoy arranca sin ninguna restricción.
  SOCIO: [...ALL_PERMISSION_KEYS],
  // Acceso a todo excepto Empleados.
  ENCARGADO: ALL_PERMISSION_KEYS.filter((k) => !k.startsWith("empleados.")),
  // Solo consulta, salvo crear sesiones (acotado a sus propios turnos en
  // código, ver requirePermission/createClientSession).
  ESTETICISTA: [
    "servicios.ver",
    "promociones.ver",
    "novedades.ver",
    "clientes.ver",
    "agenda.ver",
    "sesiones.ver",
    "sesiones.crear",
  ],
};

/**
 * Admin nunca tiene restricciones: no genera filas en RolePermission y
 * siempre devuelve true acá, sin ni siquiera consultar la base.
 */
export async function hasPermission(role: Role, key: PermissionKey): Promise<boolean> {
  if (role === "ADMIN") return true;

  const row = await prisma.rolePermission.findUnique({
    where: { role_permission: { role, permission: key } },
  });
  if (row) return row.allowed;

  return DEFAULT_PERMISSIONS[role as ConfigurableRole]?.includes(key) ?? false;
}

/** Matriz completa (módulo → permiso → rol → allowed) para /admin/permisos. */
export async function getPermissionMatrix() {
  const rows = await prisma.rolePermission.findMany();
  const stored = new Map(rows.map((r) => [`${r.role}:${r.permission}`, r.allowed]));

  return PERMISSION_MODULES.map((module) => ({
    ...module,
    permissions: module.permissions.map((permission) => ({
      ...permission,
      byRole: Object.fromEntries(
        CONFIGURABLE_ROLES.map((role) => [
          role,
          stored.get(`${role}:${permission.key}`) ??
            DEFAULT_PERMISSIONS[role].includes(permission.key),
        ])
      ) as Record<ConfigurableRole, boolean>,
    })),
  }));
}

export async function saveRolePermissions(
  values: { role: ConfigurableRole; permission: PermissionKey; allowed: boolean }[]
) {
  await prisma.$transaction(
    values.map((v) =>
      prisma.rolePermission.upsert({
        where: { role_permission: { role: v.role, permission: v.permission } },
        create: v,
        update: { allowed: v.allowed },
      })
    )
  );
}
