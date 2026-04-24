import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Tooltip } from "recharts";
import type { MatchEvent } from "@/types";

interface MomentumGraphProps {
  events: MatchEvent[];
  homeTeam: string;
  awayTeam: string;
  isHomeOurs: boolean;
}

export function MomentumGraph({ events, homeTeam, awayTeam, isHomeOurs }: MomentumGraphProps) {
  // Build series of differential per scored point
  const scoreEvents = events.filter((e) => e.type === "SCORE");
  const data = scoreEvents.map((e, i) => ({
    point: i + 1,
    diff: (isHomeOurs ? e.homeScore - e.awayScore : e.awayScore - e.homeScore),
    set: e.setNumber,
  }));

  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        No points played yet.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Momentum</h3>
        <span className="text-[11px] font-semibold text-muted-foreground">
          + {isHomeOurs ? homeTeam : awayTeam} leads
        </span>
      </div>
      <div className="h-44 w-full">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <XAxis dataKey="point" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} stroke="var(--border)" />
            <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} stroke="var(--border)" width={28} />
            <ReferenceLine y={0} stroke="var(--border)" />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                color: "var(--foreground)",
                fontSize: 12,
              }}
              labelFormatter={(p) => `Point ${p}`}
              formatter={(v: number) => [v > 0 ? `+${v}` : v, "Differential"]}
            />
            <Line
              type="monotone"
              dataKey="diff"
              stroke="var(--kill)"
              strokeWidth={3}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        Score differential vs {isHomeOurs ? awayTeam : homeTeam}
      </p>
    </div>
  );
}
