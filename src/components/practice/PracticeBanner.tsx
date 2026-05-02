import { X } from "lucide-react";
import { usePracticeStore } from "@/store/practiceStore";
import { useGameStore } from "@/store/gameStore";
import { useNavigate } from "@tanstack/react-router";

/** Persistent banner shown across all of Practice Mode. */
export function PracticeBanner() {
  const isPractice = usePracticeStore((s) => s.isPractice);
  const exit = usePracticeStore((s) => s.exit);
  const clear = useGameStore((s) => s.clearSession);
  const navigate = useNavigate();

  if (!isPractice) return null;

  const handleExit = () => {
    exit();
    clear();
    navigate({ to: "/settings" });
  };

  return (
    <div
      className="flex items-center justify-between px-4 py-2 text-[13px] font-semibold text-white"
      style={{ backgroundColor: "#1A2744" }}
    >
      <span className="flex items-center gap-2">
        <span className="rounded-full bg-[#39FF14] px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-[#0A0E1A]">
          Guided Tour
        </span>
        <span className="text-white/80">No stats saved</span>
      </span>
      <button
        type="button"
        onClick={handleExit}
        className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-widest active:scale-95"
      >
        Exit <X className="h-3 w-3" />
      </button>
    </div>
  );
}
