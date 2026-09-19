"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Enviando..." : "Enviar"}
    </Button>
  );
}

export function SimulatedChatForm({ action }: { action: (formData: FormData) => Promise<void> }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await action(formData);
        formRef.current?.reset();
      }}
      className="mt-4 flex gap-2"
    >
      <input
        type="text"
        name="text"
        required
        placeholder="Escribe como si fueras el cliente..."
        className="flex-1 rounded-brand border border-brand-border px-3 py-2 text-sm"
      />
      <SubmitButton />
    </form>
  );
}
