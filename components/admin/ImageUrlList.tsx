"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ImageUrlList({ name, initial = [] }: { name: string; initial?: string[] }) {
  const [urls, setUrls] = useState<string[]>(initial.length > 0 ? initial : [""]);

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
      <Button type="button" variant="outline" size="sm" onClick={() => setUrls([...urls, ""])}>
        Agregar imagen
      </Button>
      <p className="text-xs text-brand-muted">
        Pegá la URL de la imagen (por ahora subida manual; próximamente subida directa de
        archivos).
      </p>
    </div>
  );
}
