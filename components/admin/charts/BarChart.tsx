"use client";

import { useState } from "react";

export type ChartSeries = { key: string; label: string; color: string };
export type ChartDatum = { label: string; values: Record<string, number> };

const TEXT_MUTED = "#6b6a63";
const TEXT_PRIMARY = "#0b0b0b";
const GRID_COLOR = "#e5e3dd";
const MAX_BAR_THICKNESS = 24;
const SEGMENT_GAP = 2;

function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

function formatValue(n: number, valuePrefix?: string): string {
  const rounded = Math.round(n);
  const formatted = rounded.toLocaleString("es-PE");
  return valuePrefix ? `${valuePrefix}${formatted}` : formatted;
}

/**
 * Path de una barra con el "data-end" redondeado (4px) y la base cuadrada —
 * un <rect> con `rx` redondea las 4 esquinas por igual, lo que hace que una
 * barra apilada corta se vea como una píldora flotando en vez de una barra
 * anclada a la base. `x,y,w,h` describen el rectángulo completo (y = borde
 * superior); si `h` es menor que 2*r, el radio se recorta para no invertirse.
 */
function roundedTopPath(x: number, y: number, w: number, h: number, r: number): string {
  const radius = Math.max(0, Math.min(r, h, w / 2));
  return `M${x},${y + h} V${y + radius} Q${x},${y} ${x + radius},${y} H${x + w - radius} Q${x + w},${y} ${x + w},${y + radius} V${y + h} Z`;
}

/**
 * Barras (apiladas o agrupadas) hechas a mano en SVG, siguiendo la guía de
 * dataviz: marcas finas (<=24px), extremo redondeado 4px / cuadrado en la
 * base, gap de 2px de superficie entre segmentos/barras vecinas, grilla
 * recesiva, tooltip por marca, leyenda cuando hay 2+ series. Sin librería
 * externa — un solo componente reusado por los 3 gráficos del dashboard.
 */
export function BarChart({
  series,
  data,
  mode,
  valuePrefix,
  height = 260,
}: {
  series: ChartSeries[];
  data: ChartDatum[];
  mode: "stacked" | "grouped";
  valuePrefix?: string;
  height?: number;
}) {
  const [hover, setHover] = useState<{ bucketIndex: number; x: number; y: number } | null>(null);

  const width = 720;
  const paddingLeft = 44;
  const paddingBottom = 28;
  const paddingTop = 12;
  const plotWidth = width - paddingLeft - 8;
  const plotHeight = height - paddingTop - paddingBottom;

  const maxRaw =
    mode === "stacked"
      ? Math.max(0, ...data.map((d) => series.reduce((sum, s) => sum + (d.values[s.key] ?? 0), 0)))
      : Math.max(0, ...data.map((d) => Math.max(0, ...series.map((s) => d.values[s.key] ?? 0))));
  const max = niceMax(maxRaw || 1);
  const yTicks = [0, max / 2, max];

  const bucketWidth = data.length > 0 ? plotWidth / data.length : plotWidth;
  const barSlotWidth = Math.min(bucketWidth * 0.6, MAX_BAR_THICKNESS * (mode === "grouped" ? series.length : 1) + SEGMENT_GAP * (series.length - 1));

  function yFor(value: number) {
    return paddingTop + plotHeight - (value / max) * plotHeight;
  }

  return (
    <div>
      {series.length > 1 && (
        <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-brand-muted">
          {series.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      )}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        role="img"
        aria-label="Gráfico de barras"
        onMouseLeave={() => setHover(null)}
      >
        {/* Grilla + eje Y */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line
              x1={paddingLeft}
              x2={width - 4}
              y1={yFor(t)}
              y2={yFor(t)}
              stroke={GRID_COLOR}
              strokeWidth={1}
            />
            <text x={paddingLeft - 6} y={yFor(t)} textAnchor="end" dominantBaseline="middle" fontSize={10} fill={TEXT_MUTED}>
              {formatValue(t, valuePrefix)}
            </text>
          </g>
        ))}

        {data.map((d, i) => {
          const bucketCenter = paddingLeft + bucketWidth * i + bucketWidth / 2;
          const isHovered = hover?.bucketIndex === i;

          // En modo apilado, solo el segmento visible más arriba de la pila
          // (el último con valor > 0, en orden de series) es un "data-end"
          // real y lleva la punta redondeada — los segmentos interiores solo
          // tocan un gap de superficie de cada lado, no un extremo de dato.
          const topVisibleIndex =
            mode === "stacked"
              ? series.reduce((acc, s, idx) => ((d.values[s.key] ?? 0) > 0 ? idx : acc), -1)
              : -1;

          let stackedY = paddingTop + plotHeight;
          const segments =
            mode === "stacked"
              ? series.map((s, si) => {
                  const v = d.values[s.key] ?? 0;
                  const segHeight = (v / max) * plotHeight;
                  const y = stackedY - segHeight;
                  stackedY = y - (v > 0 ? SEGMENT_GAP : 0);
                  return {
                    s,
                    v,
                    x: bucketCenter - barSlotWidth / 2,
                    y,
                    w: barSlotWidth,
                    h: segHeight,
                    rounded: si === topVisibleIndex,
                  };
                })
              : series.map((s, si) => {
                  const v = d.values[s.key] ?? 0;
                  const segW = (barSlotWidth - SEGMENT_GAP * (series.length - 1)) / series.length;
                  const x = bucketCenter - barSlotWidth / 2 + si * (segW + SEGMENT_GAP);
                  const h = (v / max) * plotHeight;
                  return { s, v, x, y: paddingTop + plotHeight - h, w: segW, h, rounded: true };
                });

          return (
            <g
              key={i}
              onMouseEnter={() => setHover({ bucketIndex: i, x: bucketCenter, y: paddingTop })}
              onFocus={() => setHover({ bucketIndex: i, x: bucketCenter, y: paddingTop })}
              tabIndex={0}
            >
              {/* Hit area más grande que la marca */}
              <rect x={paddingLeft + bucketWidth * i} y={paddingTop} width={bucketWidth} height={plotHeight} fill="transparent" />
              {segments
                .filter((seg) => seg.h > 0)
                .map((seg, si) =>
                  seg.rounded ? (
                    <path
                      key={si}
                      d={roundedTopPath(seg.x, seg.y, seg.w, seg.h, 4)}
                      fill={seg.s.color}
                      opacity={isHovered || hover === null ? 1 : 0.55}
                    />
                  ) : (
                    <rect
                      key={si}
                      x={seg.x}
                      y={seg.y}
                      width={seg.w}
                      height={seg.h}
                      fill={seg.s.color}
                      opacity={isHovered || hover === null ? 1 : 0.55}
                    />
                  )
                )}
              <text
                x={bucketCenter}
                y={height - paddingBottom + 14}
                textAnchor="middle"
                fontSize={10}
                fill={TEXT_MUTED}
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>

      {hover && (
        <div className="pointer-events-none relative">
          <div
            className="absolute z-10 -translate-x-1/2 rounded-brand border border-brand-border bg-white px-3 py-2 text-xs shadow-md"
            style={{ left: `${(hover.x / width) * 100}%`, top: -height + 4 }}
          >
            <p className="mb-1 font-medium" style={{ color: TEXT_PRIMARY }}>
              {data[hover.bucketIndex]?.label}
            </p>
            {series.map((s) => (
              <p key={s.key} className="flex items-center gap-1.5 text-brand-muted">
                <span className="inline-block h-0.5 w-3" style={{ backgroundColor: s.color }} />
                <span className="font-medium" style={{ color: TEXT_PRIMARY }}>
                  {formatValue(data[hover.bucketIndex]?.values[s.key] ?? 0, valuePrefix)}
                </span>
                {s.label}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
