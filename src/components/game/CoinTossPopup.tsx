import { useEffect } from "react";
import { tapHaptic } from "@/utils/haptics";
import { readableTextColor } from "@/lib/colorContrast";

interface CoinTossPopupProps {
  open: boolean;
  setNumber: number;
  homeTeam: string;
  awayTeam: string;
  homeColor: string;
  awayColor: string;
  isHomeOurs: boolean;
  onSelect: (team: "home" | "away") => void;
}

export function CoinTossPopup({
  open,
  setNumber,
  homeTeam,
  awayTeam,
  homeColor,
  awayColor,
  isHomeOurs,
  onSelect,
}: CoinTossPopupProps) {
  useEffect(() => {
    if (open) tapHaptic("heavy");
  }, [open]);

  if (!open) return null;

  const homeLabel = homeTeam || (isHomeOurs ? "My Team" : "Opponent");
  const awayLabel = awayTeam || (isHomeOurs ? "Opponent" : "My Team");

  const handle = (team: "home" | "away") => {
    tapHaptic("medium");
    onSelect(team);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="w-full max-w-[420px] rounded-2xl border border-border bg-card p-6 text-center shadow-2xl">
        <div className="text-[28px] leading-none">🪙</div>
        <div className="mt-2 text-[12px] font-black uppercase tracking-[0.2em] text-muted-foreground">
          Coin Toss
        </div>
        <div
          className="mt-2 text-[16px] font-black"
          style={{ color: "#F59E0B" }}
        >
          Set {setNumber} — Deciding Set
        </div>
        <p className="mt-3 text-[14px] text-muted-foreground">
          Who won the coin toss and will serve first?
        </p>

        <button
          type="button"
          onClick={() => handle("home")}
          className="mt-5 flex h-16 w-full items-center justify-center rounded-2xl border-2 text-[18px] font-black shadow-md active:scale-[0.98]"
          style={{
            backgroundColor: homeColor,
            borderColor: homeColor,
            color: readableTextColor(homeColor),
          }}
        >
          {homeLabel}
        </button>

        <button
          type="button"
          onClick={() => handle("away")}
          className="mt-3 flex h-16 w-full items-center justify-center rounded-2xl border-2 text-[18px] font-black shadow-md active:scale-[0.98]"
          style={{
            backgroundColor: awayColor,
            borderColor: awayColor,
            color: readableTextColor(awayColor),
          }}
        >
          {awayLabel}
        </button>
      </div>
    </div>
  );
}
