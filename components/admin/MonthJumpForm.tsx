"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

// Ir directo a un mes/año lejano (ej. diciembre 2027) sin apretar "mes
// siguiente" uno por uno. router.push con scroll:false para no reiniciar el
// scroll de la página, igual que los links de mes anterior/siguiente.
export function MonthJumpForm({ month }: { month: string }) {
  const router = useRouter();

  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const value = new FormData(e.currentTarget).get("month");
        if (value) router.push(`?month=${value}`, { scroll: false });
      }}
    >
      <input
        type="month"
        name="month"
        defaultValue={month}
        className="rounded-brand border border-brand-border px-2 py-1.5 text-sm"
      />
      <Button type="submit" variant="outline" size="sm">
        Ir
      </Button>
    </form>
  );
}
