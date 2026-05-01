import { useEffect, useState } from "react";
import type { KillZone } from "@/types";
import { tapHaptic } from "@/utils/haptics";
import { Tip } from "@/components/common/Tip";
import { shouldShowTip, dismissTip } from "@/lib/tips";
import { usePracticeStore } from "@/store/practiceStore";

interface KillHeatMapProps {
  open: boolean;
  onSelect: (zone: KillZone | null) => void;
  onCancel: () => void;
  /** Counts of previous kills per zone (1-6) for this session. */
  previousByZone?: Record<number, number>;
}

// Court layout from hitter's perspective (looking over net at opponent court).
// Top row (back, deep): 1 · 6 · 5    Bottom row (front, at net): 2 · 3 · 4
const BACK_ROW: KillZone[] = [1, 6, 5];
const FRONT_ROW: KillZone[] = [2, 3, 4];

export function KillHeatMap({ open, onSelect, onCancel, previousByZone = {} }: KillHeatMapProps) {
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const isPractice = usePracticeStore((s) => s.isPractice);
  const [showZoneTip, setShowZoneTip] = useState(false);

  useEffect(() => {
    if (!open) {
      setConfirmation(null);
      setShowZoneTip(false);
      return;
    }
    if (shouldShowTip("killZones", isPractice)) {
      setShowZoneTip(true);
      const t = window.setTimeout(() => {
        setShowZoneTip(false);
        dismissTip("killZones");
      }, 4000);
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") onCancel();
      };
      window.addEventListener("keydown", onKey);
      return () => {
        window.clearTimeout(t);
        window.removeEventListener("keydown", onKey);
      };
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel, isPractice]);

  if (!open) return null;

  const totalKills = Object.values(previousByZone).reduce((a, b) => a + b, 0);
  const hotZone = (Object.entries(previousByZone) as [string, number][])
    .filter(([, c]) => c > 0)
    .sort((a, b) => b[1] - a[1])[0]?.[0];

  const handleZone = (zone: KillZone) => {
    if (confirmation) return;
    tapHaptic("medium");
    setConfirmation(`Kill logged · Zone ${zone}`);
    window.setTimeout(() => onSelect(zone), 300);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center"
      onClick={onCancel}
      role="dialog"
      aria-modal
      aria-label="Where did the ball land?"
    >
      <div
        className="w-full max-w-[440px] rounded-t-3xl border border-border bg-[#0A0E1A] p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "vp-press 250ms ease-out reverse" }}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2
            className="text-[11px] font-black uppercase text-muted-foreground"
            style={{ letterSpacing: "2px" }}
          >
            Where did it land?
          </h2>
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="text-[11px] font-semibold text-muted-foreground underline-offset-2 hover:underline"
          >
            Skip
          </button>
        </div>

        {/* Court diagram */}
        <div
          className="overflow-hidden rounded-2xl border-2 border-white"
          style={{ backgroundColor: "#0A0E1A" }}
        >
          {/* Back row (deep — top of diagram) */}
          <CourtRow
            zones={BACK_ROW}
            bg="#3D8B85"
            previousByZone={previousByZone}
            onZone={handleZone}
          />
          {/* Center line */}
          <div className="h-px bg-white/70" />
          {/* Front row (close to net — bottom) */}
          <CourtRow
            zones={FRONT_ROW}
            bg="#4BA09A"
            previousByZone={previousByZone}
            onZone={handleZone}
          />
          {/* Net bar with antennas */}
          <div className="relative h-[3px] bg-white">
            <div
              className="absolute -top-2 left-0 h-[14px] w-[4px] rounded-sm"
              style={{ backgroundColor: "#FF4D4D" }}
            />
            <div
              className="absolute -top-2 right-0 h-[14px] w-[4px] rounded-sm"
              style={{ backgroundColor: "#FF4D4D" }}
            />
          </div>
        </div>
        <p
          className="mt-1.5 text-center text-[10px] font-black uppercase text-muted-foreground"
          style={{ letterSpacing: "3px" }}
        >
          ▲ Net
        </p>

        {/* Confirmation */}
        {confirmation && (
          <div
            className="mt-3 rounded-xl border border-[#39FF14]/40 bg-[#39FF14]/10 py-2 text-center text-sm font-black uppercase tracking-widest"
            style={{ color: "#39FF14", letterSpacing: "2px" }}
          >
            {confirmation}
          </div>
        )}

        {/* Session kill counter strip */}
        <div className="mt-3 flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2">
          <div>
            <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
              Session Kills
            </div>
            <div className="text-xl font-black tabular-nums text-foreground">{totalKills}</div>
          </div>
          <div className="text-right">
            <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
              Hot Zone
            </div>
            <div className="text-xl font-black tabular-nums" style={{ color: "#39FF14" }}>
              {hotZone ? `Z${hotZone}` : "—"}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="mt-3 h-12 w-full rounded-2xl border border-border bg-card text-sm font-black uppercase tracking-widest text-muted-foreground active:scale-95"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function CourtRow({
  zones,
  bg,
  previousByZone,
  onZone,
}: {
  zones: KillZone[];
  bg: string;
  previousByZone: Record<number, number>;
  onZone: (z: KillZone) => void;
}) {
  return (
    <div className="grid grid-cols-3" style={{ backgroundColor: bg }}>
      {zones.map((zone, i) => {
        const count = previousByZone[zone] ?? 0;
        const tapped = count > 0;
        return (
          <button
            key={zone}
            type="button"
            onClick={() => onZone(zone)}
            className="relative flex h-[110px] flex-col items-center justify-center transition-all active:scale-95"
            style={{
              borderRight: i < zones.length - 1 ? "1px solid rgba(255,255,255,0.35)" : undefined,
            }}
            aria-label={`Zone ${zone}`}
          >
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-black shadow-lg shadow-black/40 transition-colors"
              style={{
                backgroundColor: tapped ? "#39FF14" : "#FB923C",
                color: tapped ? "#0A2200" : "#FFFFFF",
              }}
            >
              {zone}
            </div>
            {/* Kill count dots */}
            <div className="mt-1.5 flex h-2 items-center gap-1">
              {count > 0 && count <= 5 &&
                Array.from({ length: count }).map((_, idx) => (
                  <span
                    key={idx}
                    className="block h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: "#39FF14" }}
                  />
                ))}
              {count > 5 && (
                <span
                  className="text-[10px] font-black"
                  style={{ color: "#39FF14", letterSpacing: "1px" }}
                >
                  +{count}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
