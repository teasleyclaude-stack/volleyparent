import { useMemo } from "react";
import { ChevronRight } from "lucide-react";
import type { Player, RotationState } from "@/types";
import { isLibero, FRONT_ROW_INDICES } from "@/types";
import { cn } from "@/lib/utils";
import { tapHaptic } from "@/utils/haptics";

interface QuickSubSheetProps {
  open: boolean;
  rotationIndex: number; // 0..5
  rotation: RotationState;
  roster: Player[];
  onConfirm: (benchPlayerId: string) => void;
  onClose: () => void;
}

const POSITION_LABELS: Record<number, string> = {
  0: "Back Right — Serving",
  1: "Front Right",
  2: "Front Center",
  3: "Front Left",
  4: "Back Left",
  5: "Back Center",
};

export function QuickSubSheet({
  open,
  rotationIndex,
  rotation,
  roster,
  onConfirm,
  onClose,
}: QuickSubSheetProps) {
  const subOutPlayer = useMemo(
    () => roster.find((p) => p.id === rotation[rotationIndex]) ?? null,
    [roster, rotation, rotationIndex],
  );

  const onCourt = useMemo(() => new Set(rotation), [rotation]);

  const { eligible, blockedLibero } = useMemo(() => {
    const bench = roster.filter((p) => !onCourt.has(p.id));
    const subOutIsLibero = subOutPlayer ? isLibero(subOutPlayer) : false;
    const isFrontRow = (FRONT_ROW_INDICES as readonly number[]).includes(rotationIndex);

    let blocked: Player | null = null;
    let list = bench;

    if (subOutIsLibero) {
      // Rule 1: Libero slot — only show non-Liberos.
      list = bench.filter((p) => !isLibero(p));
    } else if (isFrontRow) {
      // Rule 2: Front row — exclude Liberos.
      const lib = bench.find((p) => isLibero(p));
      if (lib) blocked = lib;
      list = bench.filter((p) => !isLibero(p));
    }

    // Rule 3: Sort same-position-type first.
    if (subOutPlayer) {
      const samePos = list.filter((p) => p.position === subOutPlayer.position);
      const others = list.filter((p) => p.position !== subOutPlayer.position);
      list = [...samePos, ...others];
    }

    return { eligible: list, blockedLibero: blocked };
  }, [roster, onCourt, subOutPlayer, rotationIndex]);

  if (!open || !subOutPlayer) return null;

  const handlePick = (id: string) => {
    tapHaptic("medium");
    onConfirm(id);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[440px] rounded-t-3xl border border-border bg-popover p-5 sm:rounded-3xl"
        style={{ maxHeight: "75vh", display: "flex", flexDirection: "column" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted-foreground/40" />

        {/* SUB OUT */}
        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Sub Out
          </div>
          <div
            className={cn(
              "mt-1.5 rounded-[10px] border bg-card p-3",
              isLibero(subOutPlayer) ? "border-[#00ACC1]" : "border-border",
            )}
          >
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-foreground">{subOutPlayer.name}</span>
              <span className="text-sm font-bold text-muted-foreground">
                #{subOutPlayer.number}
              </span>
              <span className="text-xs font-bold uppercase text-muted-foreground">
                · {subOutPlayer.position}
              </span>
            </div>
            <div className="mt-0.5 text-[11px] font-medium text-muted-foreground">
              Position {rotationIndex + 1} — {POSITION_LABELS[rotationIndex]}
            </div>
          </div>
        </div>

        {/* SUB IN */}
        <div className="mt-4 min-h-0 flex-1 overflow-hidden">
          <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Sub In — Select Player
          </div>
          <div className="mt-2 max-h-[40vh] space-y-1.5 overflow-y-auto pr-1">
            {eligible.length === 0 && (
              <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                No eligible bench players.
              </div>
            )}
            {eligible.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePick(p.id)}
                className={cn(
                  "flex h-16 w-full items-center gap-3 rounded-xl border bg-card px-3 text-left active:scale-[0.98]",
                  isLibero(p) ? "border-[#00ACC1]" : "border-border",
                )}
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-popover text-sm font-black tabular-nums">
                  {p.number}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-base font-bold text-foreground">{p.name}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    #{p.number} · {p.position}
                    {isLibero(p) && (
                      <span className="ml-1 text-[#00ACC1]">LIB</span>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            ))}
            {blockedLibero && (
              <div className="mt-2 rounded-lg border border-dashed border-[#00ACC1]/40 bg-[#00ACC1]/10 px-3 py-2 text-[11px] text-[#00ACC1]">
                {blockedLibero.name.split(" ")[0]} is a Libero and cannot play front row.
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 h-12 w-full rounded-2xl border border-border bg-card text-sm font-black uppercase tracking-widest text-muted-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
