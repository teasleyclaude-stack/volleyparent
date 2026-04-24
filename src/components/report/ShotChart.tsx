interface ShotChartProps {
  killZones: number[]; // array of zone 1-6 from kill events
}

// Hitter's perspective: top row (back) 1·6·5, bottom row (front, at net) 2·3·4
const BACK_ROW = [1, 6, 5];
const FRONT_ROW = [2, 3, 4];

export function ShotChart({ killZones }: ShotChartProps) {
  const counts: Record<number, number> = {};
  for (let z = 1; z <= 6; z++) counts[z] = killZones.filter((k) => k === z).length;
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const max = Math.max(1, ...Object.values(counts));
  const ranked = Object.entries(counts)
    .map(([z, c]) => ({ zone: Number(z), c }))
    .sort((a, b) => b.c - a.c)
    .filter((x) => x.c > 0)
    .slice(0, 2)
    .map((x) => x.zone);

  const renderRow = (zones: number[], bg: string) => (
    <div className="grid grid-cols-3" style={{ backgroundColor: bg }}>
      {zones.map((zone, i) => {
        const c = counts[zone];
        const intensity = c / max;
        const isTop = ranked.includes(zone);
        const pct = total === 0 ? 0 : Math.round((c / total) * 100);
        return (
          <div
            key={zone}
            className="relative flex h-20 flex-col items-center justify-center"
            style={{
              borderRight: i < zones.length - 1 ? "1px solid rgba(255,255,255,0.3)" : undefined,
              backgroundColor: `color-mix(in oklab, var(--kill) ${Math.round(intensity * 55)}%, ${bg})`,
            }}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/70">
              Z{zone}
            </span>
            <span className="text-2xl font-black tabular-nums text-white">{c}</span>
            {isTop && c > 0 && (
              <span className="absolute bottom-1 rounded-full bg-foreground/90 px-1.5 text-[9px] font-black text-background">
                {pct}%
              </span>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Shot Chart</h3>
        <span className="text-[11px] font-semibold text-muted-foreground">{total} kills placed</span>
      </div>

      <div className="overflow-hidden rounded-xl border-2 border-white">
        {renderRow(BACK_ROW, "#3D8B85")}
        <div className="h-px bg-white/70" />
        {renderRow(FRONT_ROW, "#4BA09A")}
        <div className="relative h-[3px] bg-white">
          <div
            className="absolute -top-1.5 left-0 h-[12px] w-[3px] rounded-sm"
            style={{ backgroundColor: "#FF4D4D" }}
          />
          <div
            className="absolute -top-1.5 right-0 h-[12px] w-[3px] rounded-sm"
            style={{ backgroundColor: "#FF4D4D" }}
          />
        </div>
      </div>
      <p className="mt-2 text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        ▲ Net · Hitter's perspective
      </p>
    </div>
  );
}
