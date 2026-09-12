"use client";

import { Button, type ButtonProps } from "@/components/ui/button";

export function ConfirmSubmitButton({
  confirmMessage,
  children,
  ...props
}: ButtonProps & { confirmMessage: string }) {
  return (
    <Button
      {...props}
      onClick={(e) => {
        if (!confirm(confirmMessage)) e.preventDefault();
      }}
    >
      {children}
    </Button>
  );
}
