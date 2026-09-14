-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "permission" TEXT NOT NULL,
    "allowed" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RolePermission_role_idx" ON "RolePermission"("role");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_role_permission_key" ON "RolePermission"("role", "permission");

-- Valores por defecto: reflejan las reglas de negocio descritas en
-- lib/permissions.ts (DEFAULT_PERMISSIONS). Socio = sin restricciones por
-- ahora; Encargado = todo menos Empleados; Esteticista = solo consulta,
-- salvo crear sesiones de sus propios turnos.
INSERT INTO "RolePermission" ("id", "role", "permission", "allowed", "updatedAt") VALUES
('rp_socio_empleados_ver', 'SOCIO', 'empleados.ver', true, CURRENT_TIMESTAMP),
('rp_socio_empleados_gestionar', 'SOCIO', 'empleados.gestionar', true, CURRENT_TIMESTAMP),
('rp_socio_servicios_ver', 'SOCIO', 'servicios.ver', true, CURRENT_TIMESTAMP),
('rp_socio_servicios_gestionar', 'SOCIO', 'servicios.gestionar', true, CURRENT_TIMESTAMP),
('rp_socio_promociones_ver', 'SOCIO', 'promociones.ver', true, CURRENT_TIMESTAMP),
('rp_socio_promociones_gestionar', 'SOCIO', 'promociones.gestionar', true, CURRENT_TIMESTAMP),
('rp_socio_novedades_ver', 'SOCIO', 'novedades.ver', true, CURRENT_TIMESTAMP),
('rp_socio_novedades_gestionar', 'SOCIO', 'novedades.gestionar', true, CURRENT_TIMESTAMP),
('rp_socio_clientes_ver', 'SOCIO', 'clientes.ver', true, CURRENT_TIMESTAMP),
('rp_socio_clientes_gestionar', 'SOCIO', 'clientes.gestionar', true, CURRENT_TIMESTAMP),
('rp_socio_agenda_ver', 'SOCIO', 'agenda.ver', true, CURRENT_TIMESTAMP),
('rp_socio_agenda_gestionar', 'SOCIO', 'agenda.gestionar', true, CURRENT_TIMESTAMP),
('rp_socio_agenda_eliminar', 'SOCIO', 'agenda.eliminar', true, CURRENT_TIMESTAMP),
('rp_socio_sesiones_ver', 'SOCIO', 'sesiones.ver', true, CURRENT_TIMESTAMP),
('rp_socio_sesiones_crear', 'SOCIO', 'sesiones.crear', true, CURRENT_TIMESTAMP),
('rp_socio_sesiones_eliminar', 'SOCIO', 'sesiones.eliminar', true, CURRENT_TIMESTAMP),
('rp_encargado_empleados_ver', 'ENCARGADO', 'empleados.ver', false, CURRENT_TIMESTAMP),
('rp_encargado_empleados_gestionar', 'ENCARGADO', 'empleados.gestionar', false, CURRENT_TIMESTAMP),
('rp_encargado_servicios_ver', 'ENCARGADO', 'servicios.ver', true, CURRENT_TIMESTAMP),
('rp_encargado_servicios_gestionar', 'ENCARGADO', 'servicios.gestionar', true, CURRENT_TIMESTAMP),
('rp_encargado_promociones_ver', 'ENCARGADO', 'promociones.ver', true, CURRENT_TIMESTAMP),
('rp_encargado_promociones_gestionar', 'ENCARGADO', 'promociones.gestionar', true, CURRENT_TIMESTAMP),
('rp_encargado_novedades_ver', 'ENCARGADO', 'novedades.ver', true, CURRENT_TIMESTAMP),
('rp_encargado_novedades_gestionar', 'ENCARGADO', 'novedades.gestionar', true, CURRENT_TIMESTAMP),
('rp_encargado_clientes_ver', 'ENCARGADO', 'clientes.ver', true, CURRENT_TIMESTAMP),
('rp_encargado_clientes_gestionar', 'ENCARGADO', 'clientes.gestionar', true, CURRENT_TIMESTAMP),
('rp_encargado_agenda_ver', 'ENCARGADO', 'agenda.ver', true, CURRENT_TIMESTAMP),
('rp_encargado_agenda_gestionar', 'ENCARGADO', 'agenda.gestionar', true, CURRENT_TIMESTAMP),
('rp_encargado_agenda_eliminar', 'ENCARGADO', 'agenda.eliminar', true, CURRENT_TIMESTAMP),
('rp_encargado_sesiones_ver', 'ENCARGADO', 'sesiones.ver', true, CURRENT_TIMESTAMP),
('rp_encargado_sesiones_crear', 'ENCARGADO', 'sesiones.crear', true, CURRENT_TIMESTAMP),
('rp_encargado_sesiones_eliminar', 'ENCARGADO', 'sesiones.eliminar', true, CURRENT_TIMESTAMP),
('rp_esteticista_empleados_ver', 'ESTETICISTA', 'empleados.ver', false, CURRENT_TIMESTAMP),
('rp_esteticista_empleados_gestionar', 'ESTETICISTA', 'empleados.gestionar', false, CURRENT_TIMESTAMP),
('rp_esteticista_servicios_ver', 'ESTETICISTA', 'servicios.ver', true, CURRENT_TIMESTAMP),
('rp_esteticista_servicios_gestionar', 'ESTETICISTA', 'servicios.gestionar', false, CURRENT_TIMESTAMP),
('rp_esteticista_promociones_ver', 'ESTETICISTA', 'promociones.ver', true, CURRENT_TIMESTAMP),
('rp_esteticista_promociones_gestionar', 'ESTETICISTA', 'promociones.gestionar', false, CURRENT_TIMESTAMP),
('rp_esteticista_novedades_ver', 'ESTETICISTA', 'novedades.ver', true, CURRENT_TIMESTAMP),
('rp_esteticista_novedades_gestionar', 'ESTETICISTA', 'novedades.gestionar', false, CURRENT_TIMESTAMP),
('rp_esteticista_clientes_ver', 'ESTETICISTA', 'clientes.ver', true, CURRENT_TIMESTAMP),
('rp_esteticista_clientes_gestionar', 'ESTETICISTA', 'clientes.gestionar', false, CURRENT_TIMESTAMP),
('rp_esteticista_agenda_ver', 'ESTETICISTA', 'agenda.ver', true, CURRENT_TIMESTAMP),
('rp_esteticista_agenda_gestionar', 'ESTETICISTA', 'agenda.gestionar', false, CURRENT_TIMESTAMP),
('rp_esteticista_agenda_eliminar', 'ESTETICISTA', 'agenda.eliminar', false, CURRENT_TIMESTAMP),
('rp_esteticista_sesiones_ver', 'ESTETICISTA', 'sesiones.ver', true, CURRENT_TIMESTAMP),
('rp_esteticista_sesiones_crear', 'ESTETICISTA', 'sesiones.crear', true, CURRENT_TIMESTAMP),
('rp_esteticista_sesiones_eliminar', 'ESTETICISTA', 'sesiones.eliminar', false, CURRENT_TIMESTAMP);
