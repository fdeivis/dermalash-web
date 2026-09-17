import { cn } from "@/lib/utils";

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: "default" | "draft" | "active" | "published";
  className?: string;
}) {
  const styles = {
    default: "bg-brand-surface text-brand-ink border-brand-border",
    draft: "bg-amber-50 text-amber-700 border-amber-200",
    active: "bg-sky-50 text-sky-700 border-sky-200",
    published: "bg-emerald-50 text-emerald-700 border-emerald-200",
  }[variant];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        styles,
        className
      )}
    >
      {children}
    </span>
  );
}
