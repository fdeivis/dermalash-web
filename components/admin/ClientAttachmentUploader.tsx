"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { addClientAttachment } from "@/app/admin/(protected)/clientes/actions";

const KIND_OPTIONS = [
  { value: "PHOTO", label: "Foto" },
  { value: "DOCUMENT", label: "Documento" },
  { value: "HEALTH_RECORD", label: "Antecedente de salud" },
];

export function ClientAttachmentUploader({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [kind, setKind] = useState("PHOTO");
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
    const result = await addClientAttachment(clientId, kind, formData);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";

    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-brand border border-brand-border bg-brand-surface p-3">
      <select
        value={kind}
        onChange={(e) => setKind(e.target.value)}
        className="rounded-brand border border-brand-border px-3 py-2 text-sm"
      >
        {KIND_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-brand border border-brand-border px-3 py-1.5 text-sm hover:bg-brand-bg">
        {uploading ? "Subiendo..." : "Subir archivo"}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          disabled={uploading}
          onChange={handleFileChange}
        />
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
