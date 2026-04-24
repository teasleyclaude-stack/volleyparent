interface ShotChartProps {
  killZones: number[]; // array of zone 1-9 from kill events
}

export function ShotChart({ killZones }: ShotChartProps) {
  const counts = Array.from({ length: 9 }, (_, i) => killZones.filter((z) => z === i + 1).length);
  const total = counts.reduce((a, b) => a + b, 0);
  const max = Math.max(1, ...counts);
  // Top 3 zones
  const ranked = counts
    .map((c, i) => ({ zone: i + 1, c }))
    .sort((a, b) => b.c - a.c)
    .filter((x) => x.c > 0)
    .slice(0, 3)
    .map((x) => x.zone);

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Shot Chart</h3>
        <span className="text-[11px] font-semibold text-muted-foreground">{total} kills placed</span>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {counts.map((c, i) => {
          const intensity = c / max; // 0..1
          const isTop = ranked.includes(i + 1);
          const pct = total === 0 ? 0 : Math.round((c / total) * 100);
          return (
            <div
              key={i}
              className="relative flex aspect-square flex-col items-center justify-center rounded-xl border border-border"
              style={{
                backgroundColor: `color-mix(in oklab, var(--kill) ${Math.round(intensity * 60)}%, var(--popover))`,
              }}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {i + 1}
              </span>
              <span className="text-2xl font-black tabular-nums text-foreground">{c}</span>
              {isTop && c > 0 && (
                <span className="absolute bottom-1 rounded-full bg-foreground/90 px-1.5 text-[9px] font-black text-background">
                  {pct}%
                </span>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        Net side ↑ · 1 = far left, 9 = near right
      </p>
    </div>
  );
}
