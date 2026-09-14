"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { uploadImageAction } from "@/lib/actions/upload";

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
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
    </div>
  );
}
