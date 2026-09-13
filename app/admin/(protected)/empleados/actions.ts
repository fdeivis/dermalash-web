"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth";
import { logAction } from "@/lib/audit";

const employeeSchema = z.object({
  firstName: z.string().min(1, "El nombre es obligatorio"),
  lastName: z.string().min(1, "El apellido es obligatorio"),
  role: z.enum(["SOCIO", "ENCARGADO", "ESTETICISTA"]),
  address: z.string().optional(),
  birthDate: z.coerce.date().optional(),
  documentId: z.string().optional(),
  phone: z.string().optional(),
  cvUrl: z.string().url().optional(),
});

const createEmployeeSchema = employeeSchema.extend({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

function parseEmployeeFormData(formData: FormData) {
  return employeeSchema.parse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    role: formData.get("role"),
    address: formData.get("address") || undefined,
    birthDate: formData.get("birthDate") || undefined,
    documentId: formData.get("documentId") || undefined,
    phone: formData.get("phone") || undefined,
    cvUrl: formData.get("cvUrl") || undefined,
  });
}

export async function createEmployee(formData: FormData) {
  const session = await requireAdminSession();
  const data = createEmployeeSchema.parse({
    ...parseEmployeeFormData(formData),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  const passwordHash = await bcrypt.hash(data.password, 10);

  const employee = await prisma.$transaction(async (tx) => {
    const adminUser = await tx.adminUser.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        name: `${data.firstName} ${data.lastName}`,
        role: data.role,
      },
    });
    return tx.employee.create({
      data: {
        adminUserId: adminUser.id,
        firstName: data.firstName,
        lastName: data.lastName,
        address: data.address,
        birthDate: data.birthDate,
        documentId: data.documentId,
        phone: data.phone,
        cvUrl: data.cvUrl,
      },
    });
  });
  await logAction(
    session,
    "empleado.crear",
    "Employee",
    employee.id,
    `${data.firstName} ${data.lastName}`
  );

  revalidatePath("/admin/empleados");
  redirect(`/admin/empleados/${employee.id}`);
}

const updateEmployeeSchema = employeeSchema.extend({
  email: z.string().email("Email inválido"),
});

export async function updateEmployee(id: string, formData: FormData) {
  const session = await requireAdminSession();
  const data = updateEmployeeSchema.parse({
    ...parseEmployeeFormData(formData),
    email: formData.get("email"),
  });
  const newPassword = formData.get("newPassword");

  const employee = await prisma.employee.findUniqueOrThrow({ where: { id } });

  await prisma.$transaction(async (tx) => {
    await tx.employee.update({
      where: { id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        address: data.address,
        birthDate: data.birthDate,
        documentId: data.documentId,
        phone: data.phone,
        cvUrl: data.cvUrl,
      },
    });

    const adminUserData: {
      name: string;
      role: typeof data.role;
      email: string;
      passwordHash?: string;
    } = {
      name: `${data.firstName} ${data.lastName}`,
      role: data.role,
      email: data.email.toLowerCase(),
    };
    if (newPassword && String(newPassword).length >= 6) {
      adminUserData.passwordHash = await bcrypt.hash(String(newPassword), 10);
    }

    await tx.adminUser.update({ where: { id: employee.adminUserId }, data: adminUserData });
  });
  await logAction(session, "empleado.editar", "Employee", id, `${data.firstName} ${data.lastName}`);

  revalidatePath("/admin/empleados");
  revalidatePath(`/admin/empleados/${id}`);
  redirect(`/admin/empleados/${id}`);
}

export async function setEmployeeActive(id: string, active: boolean) {
  const session = await requireAdminSession();
  const employee = await prisma.employee.findUniqueOrThrow({ where: { id } });

  await prisma.$transaction([
    prisma.employee.update({ where: { id }, data: { active } }),
    prisma.adminUser.update({ where: { id: employee.adminUserId }, data: { active } }),
  ]);
  await logAction(
    session,
    active ? "empleado.activar" : "empleado.desactivar",
    "Employee",
    id,
    `${employee.firstName} ${employee.lastName}`
  );

  revalidatePath("/admin/empleados");
}

export async function deleteEmployee(id: string) {
  const session = await requireAdminSession();
  const employee = await prisma.employee.findUniqueOrThrow({ where: { id } });

  const sessionCount = await prisma.clientSession.count({
    where: { attendedByUserId: employee.adminUserId },
  });
  if (sessionCount > 0) {
    redirect("/admin/empleados?error=tiene-sesiones");
  }

  await prisma.$transaction([
    prisma.employeeSalaryPeriod.deleteMany({ where: { employeeId: id } }),
    prisma.employee.delete({ where: { id } }),
    prisma.adminUser.delete({ where: { id: employee.adminUserId } }),
  ]);
  await logAction(
    session,
    "empleado.eliminar",
    "Employee",
    id,
    `${employee.firstName} ${employee.lastName}`
  );

  revalidatePath("/admin/empleados");
  redirect("/admin/empleados");
}

const salaryPeriodSchema = z.object({
  amount: z.coerce.number().nonnegative(),
  validFrom: z.coerce.date(),
  validTo: z.coerce.date().optional(),
  notes: z.string().optional(),
});

export async function addSalaryPeriod(employeeId: string, formData: FormData) {
  const session = await requireAdminSession();
  const data = salaryPeriodSchema.parse({
    amount: formData.get("amount"),
    validFrom: formData.get("validFrom"),
    validTo: formData.get("validTo") || undefined,
    notes: formData.get("notes") || undefined,
  });

  await prisma.employeeSalaryPeriod.create({ data: { employeeId, ...data } });
  await logAction(
    session,
    "empleado.sueldo.agregar",
    "Employee",
    employeeId,
    `S/ ${data.amount}`
  );

  revalidatePath(`/admin/empleados/${employeeId}`);
}
