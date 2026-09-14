import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ClientForm } from "@/components/admin/ClientForm";
import { requirePagePermission } from "@/lib/auth";
import { updateClient } from "../../actions";

export default async function EditarClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePagePermission("clientes.gestionar");
  const { id } = await params;
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) notFound();

  return (
    <div>
      <h1 className="font-display text-2xl">Editar cliente</h1>
      <div className="mt-6">
        <ClientForm client={client} action={updateClient.bind(null, client.id)} />
      </div>
    </div>
  );
}
