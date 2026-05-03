import { Star, Check, X } from "lucide-react";
import type { Player } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  roster: Player[];
  currentTrackedId: string | undefined;
  onSelect: (playerId: string) => void;
  onCancel: () => void;
}

export function TrackedPlayerPicker({
  open,
  roster,
  currentTrackedId,
  onSelect,
  onCancel,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-stretch justify-center bg-black/80 backdrop-blur-sm sm:items-center"
      onClick={onCancel}
    >
      <div
        className="flex w-full max-w-[440px] flex-col bg-background sm:max-h-[90vh] sm:rounded-3xl sm:border sm:border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-primary">
              Tracking
            </div>
            <h2 className="text-lg font-black text-foreground">
              Who are you tracking?
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="flex h-9 items-center gap-1 rounded-full bg-card px-3 text-[11px] font-black uppercase tracking-widest text-muted-foreground"
          >
            Cancel <X className="h-3.5 w-3.5" />
          </button>
        </header>

        <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
          {roster.map((p) => {
            const isCurrent = p.id === currentTrackedId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelect(p.id)}
                className={cn(
                  "flex h-16 w-full items-center gap-3 rounded-2xl border bg-card px-3 text-left transition-all active:scale-[0.99]",
                  isCurrent
                    ? "border-[#39FF14] ring-2 ring-[#39FF14]/40"
                    : "border-border",
                )}
              >
                <div className="flex h-6 w-6 items-center justify-center">
                  {isCurrent ? (
                    <Star className="h-5 w-5 fill-[#39FF14] text-[#39FF14]" />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-border" />
                  )}
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-popover text-sm font-black tabular-nums">
                  {p.number}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-black text-foreground">
                    {p.name}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    #{p.number} · {p.position}
                  </div>
                </div>
                {isCurrent && (
                  <Check className="h-5 w-5 shrink-0 text-[#39FF14]" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
