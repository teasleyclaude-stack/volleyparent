import { useEffect, useState } from "react";
import type { Player, RotationState } from "@/types";
import { tapHaptic } from "@/utils/haptics";

interface Props {
  open: boolean;
  rotation: RotationState;
  roster: Player[];
  setterId: string;
  /** killerId === null means "skipped" */
  onResolve: (killerId: string | null) => void;
  autoDismissMs?: number;
}

/** Bottom-sheet prompt: tap an on-court teammate who got the kill, or skip. */
export function AssistKillerPrompt({
  open,
  rotation,
  roster,
  setterId,
  onResolve,
  autoDismissMs = 10000,
}: Props) {
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    if (!open) {
      setResolved(false);
      return;
    }
    const t = window.setTimeout(() => {
      if (!resolved) onResolve(null);
    }, autoDismissMs);
    return () => window.clearTimeout(t);
  }, [open, resolved, onResolve, autoDismissMs]);

  if (!open) return null;

  const candidates = rotation
    .map((id) => roster.find((p) => p.id === id))
    .filter((p): p is Player => Boolean(p) && p!.id !== setterId);

  const handlePick = (id: string | null) => {
    setResolved(true);
    tapHaptic("light");
    onResolve(id);
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[440px] px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="rounded-2xl border border-border bg-popover p-3 shadow-2xl">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Who got the kill?
          </span>
          <button
            type="button"
            onClick={() => handlePick(null)}
            className="text-[11px] font-black uppercase tracking-widest text-muted-foreground"
          >
            Skip
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {candidates.length === 0 && (
            <div className="col-span-3 rounded-xl border border-dashed border-border p-2 text-center text-[11px] text-muted-foreground">
              No teammates on court
            </div>
          )}
          {candidates.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handlePick(p.id)}
              className="flex flex-col items-center justify-center rounded-xl border border-border bg-card px-2 py-2 active:scale-95"
            >
              <span className="text-base font-black tabular-nums text-foreground">#{p.number}</span>
              <span className="max-w-full truncate text-[11px] font-bold text-muted-foreground">
                {p.name.split(" ")[0]}
              </span>
              <span className="text-[9px] uppercase text-muted-foreground">{p.position}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
