import { useEffect } from "react";
import { Trophy } from "lucide-react";
import { tapHaptic } from "@/utils/haptics";
import { readableTextColor } from "@/lib/colorContrast";
import { formatLabel } from "@/utils/setRules";
import type { MatchFormat, SetSummary } from "@/types";

interface MatchOverPopupProps {
  open: boolean;
  winner: "home" | "away";
  homeTeam: string;
  awayTeam: string;
  homeColor: string;
  awayColor: string;
  homeSetsWon: number;
  awaySetsWon: number;
  completedSets: SetSummary[];
  matchFormat: MatchFormat;
  isHomeOurs: boolean;
  onEndGame: () => void;
}

export function MatchOverPopup({
  open,
  winner,
  homeTeam,
  awayTeam,
  homeColor,
  awayColor,
  homeSetsWon,
  awaySetsWon,
  completedSets,
  matchFormat,
  isHomeOurs,
  onEndGame,
}: MatchOverPopupProps) {
  useEffect(() => {
    if (open) tapHaptic("heavy");
  }, [open]);

  if (!open) return null;

  const homeLabel = homeTeam || (isHomeOurs ? "My Team" : "Opponent");
  const awayLabel = awayTeam || (isHomeOurs ? "Opponent" : "My Team");
  const winningTeam = winner === "home" ? homeLabel : awayLabel;
  const winningColor = winner === "home" ? homeColor : awayColor;
  const winningText = readableTextColor(winningColor);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
      <div
        className="w-full max-w-[420px] rounded-2xl border border-border bg-card p-6 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-center gap-2 text-[13px] font-black uppercase tracking-[0.2em] text-muted-foreground">
          <Trophy className="h-4 w-4" style={{ color: winningText }} />
          {formatLabel(matchFormat).toUpperCase()} Match Complete
        </div>

        <div
          className="mt-4 text-2xl font-black leading-tight"
          style={{ color: winningText }}
        >
          {winningTeam} wins the match!
        </div>

        <div className="mt-4 text-[48px] font-black leading-none tabular-nums">
          <span style={{ color: winner === "home" ? winningText : "var(--muted-foreground)" }}>
            {homeSetsWon}
          </span>
          <span className="mx-3 text-muted-foreground/50">–</span>
          <span style={{ color: winner === "away" ? winningText : "var(--muted-foreground)" }}>
            {awaySetsWon}
          </span>
        </div>

        {completedSets.length > 0 && (
          <div className="mt-4 rounded-xl border border-border bg-popover p-3 text-left">
            <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Set Results
            </div>
            <div className="flex flex-wrap gap-2">
              {completedSets.map((s) => (
                <span
                  key={s.setNumber}
                  className="rounded-md bg-card px-2 py-1 text-xs font-bold tabular-nums text-foreground"
                >
                  S{s.setNumber}: {s.homeScore}–{s.awayScore}
                </span>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onEndGame}
          className="mt-6 h-14 w-full rounded-2xl bg-primary text-base font-black uppercase tracking-widest text-primary-foreground shadow-lg active:scale-[0.98]"
        >
          End Game
        </button>
      </div>
    </div>
  );
}
