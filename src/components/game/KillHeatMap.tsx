import { useEffect } from "react";
import type { KillZone } from "@/types";
import { tapHaptic } from "@/utils/haptics";

interface KillHeatMapProps {
  open: boolean;
  onSelect: (zone: KillZone | null) => void;
  onCancel: () => void;
  /** Counts of previous kills per zone (1-9) for subtle dot density. */
  previousByZone?: Record<number, number>;
}

export function KillHeatMap({ open, onSelect, onCancel, previousByZone = {} }: KillHeatMapProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
      onClick={onCancel}
      role="dialog"
      aria-modal
      aria-label="Where did the ball land?"
    >
      <div
        className="w-full max-w-[440px] rounded-t-3xl border border-border bg-popover p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "vp-press 250ms ease-out reverse" }}
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
            Opponent's court
          </h2>
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="text-[11px] font-semibold text-muted-foreground underline-offset-2 hover:underline"
          >
            Skip
          </button>
        </div>
        <p className="mb-3 text-lg font-bold text-foreground">Where did the ball land?</p>

        <div className="grid grid-cols-3 gap-2">
          {([1, 2, 3, 4, 5, 6, 7, 8, 9] as KillZone[]).map((zone) => {
            const count = previousByZone[zone] ?? 0;
            return (
              <button
                key={zone}
                type="button"
                onClick={() => {
                  tapHaptic("heavy");
                  onSelect(zone);
                }}
                className="relative flex aspect-square items-center justify-center rounded-2xl border border-border bg-card text-foreground transition-all active:scale-95 hover:border-primary"
              >
                <span className="text-2xl font-black text-muted-foreground">{zone}</span>
                {count > 0 && (
                  <span className="absolute right-2 top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-black text-primary-foreground">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="mt-4 h-12 w-full rounded-2xl border border-border bg-card text-sm font-bold uppercase tracking-widest text-muted-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
