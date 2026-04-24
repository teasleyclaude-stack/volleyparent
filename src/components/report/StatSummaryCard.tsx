import type { Player } from "@/types";
import { hittingPercentage } from "@/utils/stats";

interface StatSummaryCardProps {
  player: Player;
}

const StatCell = ({ label, value, accent }: { label: string; value: number | string; accent?: string }) => (
  <div className="rounded-xl bg-popover px-3 py-2.5">
    <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{label}</div>
    <div className={`text-2xl font-black tabular-nums ${accent ?? "text-foreground"}`}>{value}</div>
  </div>
);

export function StatSummaryCard({ player }: StatSummaryCardProps) {
  const initials = player.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const hp = hittingPercentage(player.stats);

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-xl font-black text-primary-foreground">
          {initials}
        </div>
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <h2 className="text-lg font-black text-foreground">{player.name}</h2>
            <span className="text-sm font-bold text-muted-foreground">#{player.number}</span>
          </div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            {player.position}
          </span>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Hit %</div>
          <div className="text-3xl font-black tabular-nums text-primary">{hp}</div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <StatCell label="Kills" value={player.stats.kills} accent="text-[var(--kill)]" />
        <StatCell label="Digs" value={player.stats.digs} accent="text-[var(--dig)]" />
        <StatCell label="Blocks" value={player.stats.blocks} accent="text-[var(--block)]" />
        <StatCell label="Aces" value={player.stats.aces} accent="text-[var(--ace)]" />
        <StatCell label="Errors" value={player.stats.errors} accent="text-[var(--error)]" />
        <StatCell label="Att" value={player.stats.totalAttempts} />
      </div>
    </div>
  );
}
