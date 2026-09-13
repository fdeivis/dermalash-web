import type { Service } from "@prisma/client";
import { ImageUrlList } from "@/components/admin/ImageUrlList";
import { Button } from "@/components/ui/button";

export function ServiceForm({
  service,
  action,
}: {
  service?: Service;
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <form action={action} className="max-w-xl space-y-5">
      <div>
        <label className="block text-sm font-medium">Nombre</label>
        <input
          name="name"
          required
          defaultValue={service?.name}
          className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Descripción</label>
        <textarea
          name="description"
          required
          rows={4}
          defaultValue={service?.description}
          className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">Duración (minutos)</label>
          <input
            type="number"
            name="durationMinutes"
            min={1}
            required
            defaultValue={service?.durationMinutes ?? 60}
            className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Precio (S/)</label>
          <input
            type="number"
            name="price"
            step="0.01"
            min={0}
            required
            defaultValue={service?.price?.toString()}
            className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="priceFrom" defaultChecked={service?.priceFrom} />
        Mostrar como "precio desde"
      </label>

      <div>
        <label className="block text-sm font-medium">Imágenes</label>
        <div className="mt-1">
          <ImageUrlList name="images" initial={service?.images} folder="servicios" />
        </div>
      </div>

      <Button type="submit">{service ? "Guardar cambios" : "Crear servicio"}</Button>
    </form>
  );
}
