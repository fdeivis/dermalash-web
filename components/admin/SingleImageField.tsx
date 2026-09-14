"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { uploadImageAction } from "@/lib/actions/upload";
import { getImageDimensions } from "@/lib/imageDimensions";

// El carrusel se muestra a todo el ancho de la pantalla: por debajo de este
// ancho la foto se ve pixelada en monitores grandes.
const MIN_RECOMMENDED_WIDTH = 1600;

export function SingleImageField({
  name,
  initial,
  folder,
}: {
  name: string;
  initial?: string | null;
  folder: string;
}) {
  const [url, setUrl] = useState(initial ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setWarning(null);

    try {
      const { width, height } = await getImageDimensions(file);
      if (width < MIN_RECOMMENDED_WIDTH) {
        setWarning(
          `Esta imagen es de ${width}×${height}px, más chica de lo recomendado (mínimo ${MIN_RECOMMENDED_WIDTH}px de ancho). Se puede ver pixelada en el carrusel.`
        );
      }
    } catch {
      // Si no se pudo leer el tamaño, seguimos con la subida igual.
    }

    const formData = new FormData();
    formData.set("file", file);
    const result = await uploadImageAction(folder, formData);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";

    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.url) setUrl(result.url);
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="url"
          name={name}
          value={url}
          placeholder="https://..."
          onChange={(e) => setUrl(e.target.value)}
          className="w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
        />
        {url && (
          <Button type="button" variant="outline" size="sm" onClick={() => setUrl("")}>
            Quitar
          </Button>
        )}
      </div>

      <label className="inline-flex cursor-pointer items-center gap-2 rounded-brand border border-brand-border px-3 py-1.5 text-sm hover:bg-brand-bg">
        {uploading ? "Subiendo..." : "Subir imagen"}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          disabled={uploading}
          onChange={handleFileChange}
        />
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {warning && <p className="text-xs text-amber-600">{warning}</p>}
      <p className="text-xs text-brand-muted">
        Para que no se vea pixelada en el carrusel, subí una foto horizontal de al menos{" "}
        {MIN_RECOMMENDED_WIDTH}px de ancho.
      </p>
    </div>
  );
}
