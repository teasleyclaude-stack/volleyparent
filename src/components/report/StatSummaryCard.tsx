import type { Player } from "@/types";
import { getPositionGroup, passAverage, dumpHittingPct } from "@/types";
import { hittingPercentage } from "@/utils/stats";

interface StatSummaryCardProps {
  player: Player;
}

const StatCell = ({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: string;
}) => (
  <div className="rounded-xl bg-popover px-3 py-2.5">
    <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
      {label}
    </div>
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

  const group = getPositionGroup(player.position);
  const s = player.stats;

  const headline =
    group === "setter"
      ? { label: "Assists", value: String(s.assists) }
      : group === "defensive"
        ? { label: "Pass Avg", value: passAverage(s) }
        : { label: "Hit %", value: hittingPercentage(s) };

  const badge =
    group === "setter"
      ? { label: "★ Setter", bg: "rgba(57,255,20,0.18)", fg: "#39FF14" }
      : group === "defensive"
        ? {
            label: player.position === "L" ? "🛡 Libero" : "🛡 DS",
            bg: "rgba(0,172,193,0.18)",
            fg: "#22D3EE",
          }
        : { label: "⚡ Attacker", bg: "rgba(57,255,20,0.18)", fg: "#39FF14" };

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
          <div className="mt-0.5 flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              {player.position}
            </span>
            <span
              className="rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase"
              style={{ backgroundColor: badge.bg, color: badge.fg, letterSpacing: "1px" }}
            >
              {badge.label}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            {headline.label}
          </div>
          <div className="text-3xl font-black tabular-nums text-primary">{headline.value}</div>
        </div>
      </div>

      {group === "attacker" && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          <StatCell label="Kills" value={s.kills} accent="text-[var(--kill)]" />
          <StatCell label="Digs" value={s.digs} accent="text-[var(--dig)]" />
          <StatCell label="Blocks" value={s.blocks} accent="text-[var(--block)]" />
          <StatCell label="Aces" value={s.aces} accent="text-[var(--ace)]" />
          <StatCell label="Errors" value={s.errors} accent="text-[var(--error)]" />
          <StatCell label="Att" value={s.totalAttempts} />
          <StatCell label="Assists" value={s.assists} accent="text-[#A78BFA]" />
          <StatCell
            label="Opp. Digs"
            value={s.dugAttempts ?? 0}
            accent="text-[var(--timeout)]"
          />
        </div>
      )}

      {group === "setter" && (
        <>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <StatCell label="Assists" value={s.assists} accent="text-[#A78BFA]" />
            <StatCell label="Dump K" value={s.dumpKills ?? 0} accent="text-[var(--kill)]" />
            <StatCell
              label="Set Err"
              value={s.settingErrors ?? 0}
              accent="text-[var(--error)]"
            />
            <StatCell label="Dump Err" value={s.dumpErrors ?? 0} accent="text-[var(--error)]" />
            <StatCell label="Dump Att" value={s.dumpAttempts ?? 0} />
            <StatCell label="Dump %" value={dumpHittingPct(s)} accent="text-primary" />
            <StatCell label="Digs" value={s.digs} accent="text-[var(--dig)]" />
            <StatCell label="Aces" value={s.aces} accent="text-[var(--ace)]" />
            <StatCell label="Blocks" value={s.blocks} accent="text-[var(--block)]" />
          </div>
        </>
      )}

      {group === "defensive" && (
        <>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <StatCell label="Pass Avg" value={passAverage(s)} accent="text-[#22D3EE]" />
            <StatCell label="Passes" value={s.passAttempts ?? 0} accent="text-[#22D3EE]" />
            <StatCell label="Digs" value={s.digs} accent="text-[var(--dig)]" />
            <StatCell label="Aces" value={s.aces} accent="text-[var(--ace)]" />
            <StatCell label="Assists" value={s.assists} accent="text-[#A78BFA]" />
            <StatCell
              label="Opp. Digs"
              value={s.dugAttempts ?? 0}
              accent="text-[var(--timeout)]"
            />
          </div>

          {/* Pass grade breakdown */}
          <div className="mt-3 rounded-xl bg-popover p-3">
            <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Pass Grade Breakdown
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <GradeCell label="3 Perfect" value={s.passGrade3 ?? 0} color="#39FF14" />
              <GradeCell label="2 Good" value={s.passGrade2 ?? 0} color="#22D3EE" />
              <GradeCell label="1 Poor" value={s.passGrade1 ?? 0} color="#F4B400" />
              <GradeCell label="0 Error" value={s.passGrade0 ?? 0} color="#FF4D4D" />
            </div>
            <PassGradeBar stats={s} />
          </div>
        </>
      )}
    </div>
  );
}

function GradeCell({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg bg-card py-2">
      <div className="text-lg font-black tabular-nums" style={{ color }}>
        {value}
      </div>
      <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function PassGradeBar({ stats }: { stats: Player["stats"] }) {
  const g3 = stats.passGrade3 ?? 0;
  const g2 = stats.passGrade2 ?? 0;
  const g1 = stats.passGrade1 ?? 0;
  const g0 = stats.passGrade0 ?? 0;
  const total = g3 + g2 + g1 + g0;
  if (total === 0) return null;
  const pct = (n: number) => (n / total) * 100;
  return (
    <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-card">
      <span style={{ width: `${pct(g3)}%`, backgroundColor: "#39FF14" }} />
      <span style={{ width: `${pct(g2)}%`, backgroundColor: "#22D3EE" }} />
      <span style={{ width: `${pct(g1)}%`, backgroundColor: "#F4B400" }} />
      <span style={{ width: `${pct(g0)}%`, backgroundColor: "#FF4D4D" }} />
    </div>
  );
}
