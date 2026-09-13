import Link from "next/link";
import { ClientForm } from "@/components/admin/ClientForm";
import { createClient } from "../actions";

export default function NuevoClientePage() {
  return (
    <div>
      <h1 className="font-display text-2xl">Nuevo cliente</h1>
      <p className="mt-1 text-sm text-brand-muted">
        Antes de continuar, revisá el{" "}
        <Link href="/admin/clientes" className="underline">
          buscador de clientes
        </Link>{" "}
        para evitar cargar un duplicado.
      </p>
      <div className="mt-6">
        <ClientForm action={createClient} />
      </div>
    </div>
  );
}
