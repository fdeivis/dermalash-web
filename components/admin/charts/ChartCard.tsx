"use client";

import { useState } from "react";
import { BarChart, type ChartSeries, type ChartDatum } from "./BarChart";

export function ChartCard({
  title,
  periods,
  defaultPeriod,
  dataByPeriod,
  series,
  mode,
  valuePrefix,
}: {
  title: string;
  periods: { key: string; label: string }[];
  defaultPeriod: string;
  dataByPeriod: Record<string, ChartDatum[]>;
  series: ChartSeries[];
  mode: "stacked" | "grouped";
  valuePrefix?: string;
}) {
  const [period, setPeriod] = useState(defaultPeriod);

  return (
    <div className="rounded-brand border border-brand-border bg-brand-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-lg">{title}</h3>
        <div className="flex gap-1 rounded-brand border border-brand-border p-0.5 text-xs">
          {periods.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              className={`rounded px-2 py-1 ${
                period === p.key ? "bg-brand-accent text-white" : "text-brand-muted hover:bg-brand-bg"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4">
        <BarChart series={series} data={dataByPeriod[period] ?? []} mode={mode} valuePrefix={valuePrefix} />
      </div>
    </div>
  );
}
