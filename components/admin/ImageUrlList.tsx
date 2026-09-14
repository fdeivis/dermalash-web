"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { uploadImageAction } from "@/lib/actions/upload";
import { getImageDimensions } from "@/lib/imageDimensions";

// Por debajo de este ancho la foto se ve pixelada en la grilla de
// tratamientos y en la ficha del servicio (que la muestran a buen tamaño).
const MIN_RECOMMENDED_WIDTH = 1200;

export function ImageUrlList({
  name,
  initial = [],
  folder,
}: {
  name: string;
  initial?: string[];
  folder: string;
}) {
  const [urls, setUrls] = useState<string[]>(initial.length > 0 ? initial : [""]);
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
          `Esta imagen es de ${width}×${height}px, más chica de lo recomendado (mínimo ${MIN_RECOMMENDED_WIDTH}px de ancho). Puede verse pixelada en la web.`
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
    if (result.url) {
      setUrls((prev) => [...prev.filter((u) => u.trim().length > 0), result.url as string]);
    }
  }

  return (
    <div className="space-y-2">
      {urls.map((url, i) => (
        <div key={i} className="flex gap-2">
          <input
            type="url"
            name={name}
            value={url}
            placeholder="https://..."
            onChange={(e) => {
              const next = [...urls];
              next[i] = e.target.value;
              setUrls(next);
            }}
            className="w-full rounded-brand border border-brand-border px-3 py-2 text-sm"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setUrls(urls.filter((_, idx) => idx !== i))}
          >
            Quitar
          </Button>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setUrls([...urls, ""])}>
          Agregar URL
        </Button>
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
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {warning && <p className="text-xs text-amber-600">{warning}</p>}
      <p className="text-xs text-brand-muted">
        Subí una imagen desde tu computadora o pegá la URL de una imagen ya publicada. Para que
        no se vea pixelada, subí fotos de al menos {MIN_RECOMMENDED_WIDTH}px de ancho.
      </p>
    </div>
  );
}
