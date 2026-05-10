import { useEffect, useState } from "react";
import { tapHaptic } from "@/utils/haptics";
import { readableTextColor } from "@/lib/colorContrast";
import { maxSets } from "@/utils/setRules";
import type { MatchFormat } from "@/types";
import { Tip } from "@/components/common/Tip";
import { shouldShowTip, dismissTip } from "@/lib/tips";
import { usePracticeStore } from "@/store/practiceStore";

interface SetOverPopupProps {
  open: boolean;
  setNumber: number;
  winner: "home" | "away";
  homeTeam: string;
  awayTeam: string;
  homeColor: string;
  awayColor: string;
  homeScore: number;
  awayScore: number;
  homeSetsWon: number;
  awaySetsWon: number;
  matchFormat: MatchFormat;
  isHomeOurs: boolean;
  onConfirm: () => void;
  onKeepPlaying: () => void;
}

export function SetOverPopup({
  open,
  setNumber,
  winner,
  homeTeam,
  awayTeam,
  homeColor,
  awayColor,
  homeScore,
  awayScore,
  homeSetsWon,
  awaySetsWon,
  matchFormat,
  isHomeOurs,
  onConfirm,
  onKeepPlaying,
}: SetOverPopupProps) {
  const isPractice = usePracticeStore((s) => s.isPractice);
  const [showTip, setShowTip] = useState(false);
  useEffect(() => {
    if (open) {
      tapHaptic("heavy");
      if (shouldShowTip("setComplete", isPractice)) setShowTip(true);
    } else {
      setShowTip(false);
    }
  }, [open, isPractice]);

  if (!open) return null;

  const homeLabel = homeTeam || (isHomeOurs ? "My Team" : "Opponent");
  const awayLabel = awayTeam || (isHomeOurs ? "Opponent" : "My Team");
  const winningTeam = winner === "home" ? homeLabel : awayLabel;
  const winningColor = winner === "home" ? homeColor : awayColor;
  const winningText = readableTextColor(winningColor);
  const total = maxSets(matchFormat);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div
        className="w-full max-w-[420px] rounded-2xl border border-border bg-card p-6 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-[13px] font-black uppercase tracking-[0.2em] text-muted-foreground">
          Set {setNumber} of {total} Complete
        </div>

        <div
          className="mt-4 text-2xl font-black leading-tight"
          style={{ color: winningText }}
        >
          {winningTeam} wins Set {setNumber}
        </div>

        <div
          className="mt-4 text-[48px] font-black leading-none tabular-nums"
          style={{ color: winningText }}
        >
          {homeScore} – {awayScore}
        </div>

        <div className="mt-4 text-sm font-medium text-muted-foreground">
          {homeLabel} sets: <span className="font-black text-foreground tabular-nums">{homeSetsWon}</span>
          <span className="mx-2 text-muted-foreground/50">·</span>
          {awayLabel} sets: <span className="font-black text-foreground tabular-nums">{awaySetsWon}</span>
        </div>

        <button
          type="button"
          onClick={onConfirm}
          className="mt-6 h-14 w-full rounded-2xl text-base font-black uppercase tracking-widest text-black shadow-lg active:scale-[0.98]"
          style={{ backgroundColor: "#39FF14" }}
        >
          Confirm End Set
        </button>

        <button
          type="button"
          onClick={onKeepPlaying}
          className="mt-3 h-10 w-full text-sm font-semibold text-muted-foreground"
        >
          Keep playing this set
        </button>

        {showTip && (
          <div className="mt-3 flex justify-center">
            <Tip
              show={showTip}
              message="Set complete! Confirm to lock it in, or keep playing if it was a mistake."
              arrow="none"
              autoDismissMs={null}
              showGotIt
              onDismiss={() => {
                dismissTip("setComplete");
                setShowTip(false);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
