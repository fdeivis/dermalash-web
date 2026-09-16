"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { uploadPrivateFileAction } from "@/lib/actions/upload";

/**
 * Igual que DocumentUploadField, pero para el bucket privado: sube el
 * archivo y guarda un `path` interno (no una URL pública que tenga sentido
 * mostrar/editar como texto) en un input oculto. Para ver el archivo más
 * tarde hace falta generar una URL firmada del lado del servidor
 * (`getSignedUrl`), igual que ya se hace con los adjuntos de cliente.
 */
export function PrivateDocumentUploadField({
  name,
  initial,
  folder,
}: {
  name: string;
  initial?: string | null;
  folder: string;
}) {
  const [path, setPath] = useState(initial ?? "");
  const [fileName, setFileName] = useState<string | null>(initial ? "Comprobante subido" : null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.set("file", file);
    const result = await uploadPrivateFileAction(folder, formData);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";

    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.path) {
      setPath(result.path);
      setFileName(file.name);
    }
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={path} />
      {path && (
        <div className="flex items-center justify-between gap-2 rounded-brand border border-brand-border px-3 py-2 text-sm">
          <span>📎 {fileName}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setPath("");
              setFileName(null);
            }}
          >
            Quitar
          </Button>
        </div>
      )}
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-brand border border-brand-border px-3 py-1.5 text-sm hover:bg-brand-bg">
        {uploading ? "Subiendo..." : path ? "Reemplazar comprobante" : "Subir comprobante (PDF o imagen)"}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className="hidden"
          disabled={uploading}
          onChange={handleFileChange}
        />
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
