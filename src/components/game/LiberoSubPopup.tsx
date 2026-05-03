import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import type { Player, RotationState } from "@/types";
import { isLibero } from "@/types";
import { tapHaptic } from "@/utils/haptics";
import { cn } from "@/lib/utils";
import { Tip } from "@/components/common/Tip";
import { shouldShowTip, dismissTip } from "@/lib/tips";
import { usePracticeStore } from "@/store/practiceStore";

interface LiberoSubPopupProps {
  open: boolean;
  liberoId: string;
  rotationIndex: number;
  rotation: RotationState;
  roster: Player[];
  onConfirm: (subOutPlayerId: string) => void;
}

/**
 * Forced-sub popup that appears when a Libero rotates into a front-row slot.
 * The coach MUST pick a front-row teammate for the Libero to sub out for —
 * there is no cancel.
 */
export function LiberoSubPopup({
  open,
  liberoId,
  rotationIndex,
  rotation,
  roster,
  onConfirm,
}: LiberoSubPopupProps) {
  const isPractice = usePracticeStore((s) => s.isPractice);
  const [showTip, setShowTip] = useState(false);
  useEffect(() => {
    if (open) {
      tapHaptic("heavy");
      if (shouldShowTip("liberoSub", isPractice)) setShowTip(true);
    } else {
      setShowTip(false);
    }
  }, [open, isPractice]);

  if (!open) return null;
  const libero = roster.find((p) => p.id === liberoId);
  // Candidate sub-in players are bench players (not currently on court),
  // excluding other Liberos (a Libero cannot sub in for a Libero in the front row).
  const onCourt = new Set(rotation);
  const candidates = roster.filter(
    (p) => !onCourt.has(p.id) && !isLibero(p),
  );
  // Sort so the remembered partner shows first.
  const partnerId = libero?.liberoPartnerId ?? null;
  candidates.sort((a, b) => {
    if (a.id === partnerId) return -1;
    if (b.id === partnerId) return 1;
    return a.number - b.number;
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center">
      <div
        className="flex w-full max-w-[440px] flex-col rounded-t-3xl border border-border bg-popover p-5 sm:rounded-3xl"
        style={{ maxHeight: "85vh" }}
      >
        <div className="text-[10px] font-black uppercase tracking-widest text-[#00ACC1]">
          Libero Rotation
        </div>
        <h2 className="mt-1 text-lg font-black text-foreground">
          {libero?.name ?? "Libero"} is rotating to front row
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Who will they sub out for?
        </p>

        <div className="mt-4 flex-1 space-y-2 overflow-y-auto pr-1" style={{ minHeight: 0 }}>
          {candidates.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              No front-row players available.
            </div>
          ) : (
            candidates.map((p) => {
              const isPartner = p.id === partnerId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onConfirm(p.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all active:scale-[0.99]",
                    isPartner
                      ? "border-[#39FF14] bg-card shadow-[0_0_0_2px_rgba(57,255,20,0.15)]"
                      : "border-border bg-card",
                  )}
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-popover text-base font-black tabular-nums">
                    {p.number}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                      {isPartner && (
                        <Star className="h-3.5 w-3.5 fill-[#39FF14] text-[#39FF14]" strokeWidth={1.5} />
                      )}
                      <span className="truncate">{p.name}</span>
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      #{p.number} · {p.position}
                      {isPartner && <span className="ml-1.5 text-[#39FF14]">· partner</span>}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <p className="mt-4 text-center text-[10px] text-muted-foreground">
          A Libero cannot play in the front row.
        </p>

        {showTip && (
          <div className="mt-3 flex justify-center">
            <Tip
              show={showTip}
              message="Liberos can't play front row — pick who they swap with each rotation."
              arrow="none"
              autoDismissMs={null}
              showGotIt
              onDismiss={() => {
                dismissTip("liberoSub");
                setShowTip(false);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
