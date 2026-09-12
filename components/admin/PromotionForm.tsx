import type { Promotion, Service } from "@prisma/client";
import { ImageUrlList } from "@/components/admin/ImageUrlList";
import { Button } from "@/components/ui/button";

function toDateInputValue(date?: Date | null) {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export function PromotionForm({
  promotion,
  allServices,
  action,
}: {
  promotion?: Promotion & { services: Service[] };
  allServices: Service[];
  action: (formData: FormData) => Promise<void>;
}) {
  const selectedIds = new Set(promotion?.services.map((s) => s.id) ?? []);

  return (
    <form action={action} className="max-w-xl space-y-5">
      <div>
        <label className="block text-sm font-medium">Nombre</label>
        <input
          name="name"
          required
          defaultValue={promotion?.name}
          className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Descripción</label>
        <textarea
          name="description"
          required
          rows={4}
          defaultValue={promotion?.description}
          className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Condiciones (opcional)</label>
        <input
          name="conditions"
          defaultValue={promotion?.conditions ?? undefined}
          className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium">Desde</label>
          <input
            type="date"
            name="startDate"
            required
            defaultValue={toDateInputValue(promotion?.startDate)}
            className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Hasta</label>
          <input
            type="date"
            name="endDate"
            required
            defaultValue={toDateInputValue(promotion?.endDate)}
            className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Precio promo (S/)</label>
          <input
            type="number"
            name="promoPrice"
            step="0.01"
            min={0}
            defaultValue={promotion?.promoPrice?.toString()}
            className="mt-1 w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium">Servicios asociados</label>
        <div className="mt-1 max-h-48 space-y-1 overflow-y-auto rounded-brand border border-brand-border p-3">
          {allServices.length === 0 && (
            <p className="text-sm text-brand-muted">No hay servicios cargados todavía.</p>
          )}
          {allServices.map((service) => (
            <label key={service.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="serviceIds"
                value={service.id}
                defaultChecked={selectedIds.has(service.id)}
              />
              {service.name}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium">Imágenes</label>
        <div className="mt-1">
          <ImageUrlList name="images" initial={promotion?.images} />
        </div>
      </div>

      <Button type="submit">{promotion ? "Guardar cambios" : "Crear promoción"}</Button>
    </form>
  );
}
