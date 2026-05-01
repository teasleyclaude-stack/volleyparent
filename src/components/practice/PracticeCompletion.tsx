import { Trophy } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { usePracticeStore } from "@/store/practiceStore";
import { useGameStore } from "@/store/gameStore";

interface PracticeCompletionProps {
  onReturnToSettings?: () => void;
}

const ITEMS = [
  "Adding points and side outs",
  "Recording kills with the heat map",
  "Tracking digs, blocks, and aces",
  "Quick subs via long press",
  "Undoing mistakes",
];

export function PracticeCompletion({ onReturnToSettings }: PracticeCompletionProps) {
  const navigate = useNavigate();
  const exitPractice = usePracticeStore((s) => s.exit);
  const clearSession = useGameStore((s) => s.clearSession);

  const finish = () => {
    try {
      window.localStorage.setItem("courtsideview_practice_seen", "completed");
    } catch {
      /* noop */
    }
    exitPractice();
    clearSession();
  };

  const startReal = () => {
    finish();
    navigate({ to: "/game/setup" });
  };

  const back = () => {
    finish();
    if (onReturnToSettings) onReturnToSettings();
    else navigate({ to: "/settings" });
  };

  return (
    <div className="fixed inset-0 z-[120] flex flex-col items-center justify-center bg-background px-6 py-8">
      <Trophy className="h-10 w-10 text-[#39FF14]" strokeWidth={2.4} />
      <h1 className="mt-4 text-center text-[20px] font-black text-foreground">
        You're ready for game day!
      </h1>

      <div className="mt-6 w-full max-w-[420px] space-y-2">
        <div className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
          Here's what you learned:
        </div>
        <ul className="space-y-1.5">
          {ITEMS.map((it) => (
            <li
              key={it}
              className="flex items-start gap-2 text-[14px] text-foreground"
            >
              <span className="mt-0.5 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-[#39FF14] text-[10px] font-black text-[#0A0E1A]">
                ✓
              </span>
              <span>{it}</span>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        onClick={startReal}
        className="mt-8 h-14 w-full max-w-[420px] rounded-2xl text-base font-black uppercase tracking-widest active:scale-[0.98]"
        style={{ backgroundColor: "#39FF14", color: "#0A0E1A" }}
      >
        Start a Real Game
      </button>
      <button
        type="button"
        onClick={back}
        className="mt-3 text-[13px] font-semibold text-muted-foreground"
      >
        Back to Settings
      </button>
    </div>
  );
}
