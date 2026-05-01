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

  const winningTeam = winner === "home" ? homeTeam : awayTeam;
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
          {winningTeam || (winner === "home" ? "Home" : "Away")} wins Set {setNumber}
        </div>

        <div
          className="mt-4 text-[48px] font-black leading-none tabular-nums"
          style={{ color: winningText }}
        >
          {homeScore} – {awayScore}
        </div>

        <div className="mt-4 text-sm font-medium text-muted-foreground">
          {homeTeam || "Home"} sets: <span className="font-black text-foreground tabular-nums">{homeSetsWon}</span>
          <span className="mx-2 text-muted-foreground/50">·</span>
          {awayTeam || "Away"} sets: <span className="font-black text-foreground tabular-nums">{awaySetsWon}</span>
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
      </div>
    </div>
  );
}
