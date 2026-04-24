import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ScoreboardProps {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  setNumber: number;
  isHomeServing: boolean;
  isHomeOurs: boolean;
  onScoreHome: () => void;
  onScoreAway: () => void;
}

function useBounce(value: number) {
  const [key, setKey] = useState(0);
  useEffect(() => {
    setKey((k) => k + 1);
  }, [value]);
  return key;
}

export function Scoreboard(props: ScoreboardProps) {
  const {
    homeTeam,
    awayTeam,
    homeScore,
    awayScore,
    setNumber,
    isHomeServing,
    isHomeOurs,
    onScoreHome,
    onScoreAway,
  } = props;

  const homeKey = useBounce(homeScore);
  const awayKey = useBounce(awayScore);

  return (
    <div className="border-b border-border bg-popover px-4 pt-4 pb-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          Set {setNumber}
        </span>
        <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">
          ● Live
        </span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        {/* Home */}
        <div className="flex flex-col items-start">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "max-w-[110px] truncate text-[13px] font-semibold",
                isHomeOurs ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {homeTeam || "Home"}
            </span>
            {isHomeServing && (
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--gold)]" aria-label="serving" />
            )}
          </div>
          <span
            key={homeKey}
            className="vp-bounce font-display text-[64px] font-black leading-none tracking-tight text-foreground tabular-nums"
          >
            {homeScore}
          </span>
        </div>

        <span className="self-center text-3xl font-black text-muted-foreground/40">:</span>

        {/* Away */}
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-1.5">
            {!isHomeServing && (
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--gold)]" aria-label="serving" />
            )}
            <span
              className={cn(
                "max-w-[110px] truncate text-[13px] font-semibold",
                !isHomeOurs ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {awayTeam || "Away"}
            </span>
          </div>
          <span
            key={awayKey}
            className="vp-bounce font-display text-[64px] font-black leading-none tracking-tight text-foreground tabular-nums"
          >
            {awayScore}
          </span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onScoreHome}
          className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-card text-foreground active:scale-95 transition-transform border border-border"
        >
          <Plus className="h-5 w-5" /> <span className="text-sm font-bold">Home</span>
        </button>
        <button
          type="button"
          onClick={onScoreAway}
          className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-card text-foreground active:scale-95 transition-transform border border-border"
        >
          <Plus className="h-5 w-5" /> <span className="text-sm font-bold">Away</span>
        </button>
      </div>
    </div>
  );
}
