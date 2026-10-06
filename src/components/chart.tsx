"use client";

import { rupiah } from "@/lib/format";

function ringkas(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} rb`;
  return String(n);
}

/** Grafik batang berpasangan sederhana (SVG, tanpa library). */
export function BarChart({
  data,
  series,
  height = 200,
}: {
  data: { label: string; values: number[] }[];
  series: { name: string; color: string }[];
  height?: number;
}) {
  const max = Math.max(1, ...data.flatMap((d) => d.values));
  const step = Math.pow(10, Math.floor(Math.log10(max)));
  const top = Math.ceil(max / step) * step;
  const grid = [0, 0.5, 1].map((f) => top * f);
  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-4 text-sm">
        {series.map((s) => (
          <span key={s.name} className="inline-flex items-center gap-2 text-muted">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
      <div className="relative" style={{ height }}>
        {grid.map((g) => (
          <div key={g} className="absolute inset-x-0 flex items-center gap-2" style={{ bottom: `${(g / top) * 100}%` }}>
            <span className="w-10 shrink-0 -translate-y-1/2 text-right text-[0.7rem] text-muted">{ringkas(g)}</span>
            <span className="h-px flex-1 -translate-y-1/2 bg-line" />
          </div>
        ))}
        <div className="absolute inset-y-0 left-12 right-0 flex items-end gap-[3%]">
          {data.map((d, i) => (
            <div key={i} className="group relative flex h-full flex-1 items-end justify-center gap-[2px]">
              {d.values.map((v, j) => (
                <div
                  key={j}
                  className="w-full max-w-[18px] rounded-t-[3px] transition-opacity group-hover:opacity-80"
                  style={{ height: `${(v / top) * 100}%`, background: series[j].color, minHeight: v > 0 ? 2 : 0 }}
                />
              ))}
              <div className="pointer-events-none absolute bottom-full z-10 mb-2 hidden whitespace-nowrap rounded-lg bg-ink px-3 py-2 text-xs text-white shadow-lg group-hover:block">
                <div className="mb-1 font-semibold">{d.label}</div>
                {d.values.map((v, j) => (
                  <div key={j}>
                    {series[j].name}: {rupiah(v)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="ml-12 mt-2 flex gap-[3%]">
        {data.map((d, i) => (
          <div key={i} className={`flex-1 whitespace-nowrap text-center text-[0.7rem] text-muted ${data.length > 8 && i % 2 === 1 ? "max-sm:invisible" : ""}`}>
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Progress({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, max ? (value / max) * 100 : 0);
  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-black/[0.06]">
      <div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
    </div>
  );
}
