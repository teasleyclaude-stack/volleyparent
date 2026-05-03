import { useState } from "react";
import { Star, ChevronRight } from "lucide-react";
import type { Player, RotationState } from "@/types";
import { cn } from "@/lib/utils";
import { TrackedPlayerPicker } from "./TrackedPlayerPicker";

interface SetLineupModalProps {
  open: boolean;
  setNumber: number; // the upcoming set number (e.g. 2 after set 1 ends)
  rotation: RotationState;
  roster: Player[];
  onKeep: () => void;
  onConfirm: (newRotation: RotationState) => void;
  onChangeTracked?: (newPlayerId: string) => void;
}

export function SetLineupModal({
  open,
  setNumber,
  rotation,
  roster,
  onKeep,
  onConfirm,
  onChangeTracked,
}: SetLineupModalProps) {
  const [draft, setDraft] = useState<RotationState>(rotation);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!open) return null;

  const find = (id: string) => roster.find((p) => p.id === id);
  const onCourtSet = new Set(draft);
  const bench = roster.filter((p) => !onCourtSet.has(p.id));

  const cellOrder: number[] = [3, 2, 1, 4, 5, 0]; // grid layout (front L→R, back L→R)

  const handleSlotTap = (rotIdx: number) => {
    if (selectedSlot === null) {
      setSelectedSlot(rotIdx);
      return;
    }
    if (selectedSlot === rotIdx) {
      setSelectedSlot(null);
      return;
    }
    // Swap two court positions.
    const next = [...draft] as RotationState;
    const a = next[selectedSlot];
    next[selectedSlot] = next[rotIdx];
    next[rotIdx] = a;
    setDraft(next);
    setSelectedSlot(null);
  };

  const handleBenchTap = (playerId: string) => {
    if (selectedSlot === null) return;
    const next = [...draft] as RotationState;
    next[selectedSlot] = playerId;
    setDraft(next);
    setSelectedSlot(null);
  };

  const reset = () => {
    setDraft(rotation);
    setSelectedSlot(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/80 backdrop-blur-sm sm:items-center">
      <div className="flex w-full max-w-[440px] flex-col bg-background sm:max-h-[90vh] sm:rounded-3xl sm:border sm:border-border">
        <header className="border-b border-border px-4 py-3">
          <div className="text-[10px] font-black uppercase tracking-widest text-primary">
            Between sets
          </div>
          <h2 className="text-lg font-black text-foreground">Set {setNumber} Lineup</h2>
          <p className="text-xs text-muted-foreground">
            Adjust your starting players for Set {setNumber}.
          </p>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {onChangeTracked && (() => {
            const tracked = roster.find((p) => p.isTracked) ?? roster[0];
            if (!tracked) return null;
            return (
              <section className="mb-4">
                <div className="mb-2 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                  Tracking
                </div>
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-3 py-3 text-left active:scale-[0.99]"
                >
                  <Star className="h-5 w-5 shrink-0 fill-[#39FF14] text-[#39FF14]" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-black text-foreground">
                      {tracked.name}{" "}
                      <span className="font-bold text-muted-foreground">
                        #{tracked.number} · {tracked.position}
                      </span>
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Tap to change tracked player
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              </section>
            );
          })()}

          {/* On Court */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                On Court
              </span>
              <span className="text-[10px] text-muted-foreground">
                {selectedSlot !== null ? "Pick a bench player or another slot" : "Tap a slot to swap"}
              </span>
            </div>
            <div className="rounded-2xl border border-border bg-popover p-3">
              {/* NET bar — top of court */}
              <div
                className="relative mb-2 flex h-[14px] items-center justify-center"
                style={{
                  backgroundColor: "#1A5C58",
                  borderTop: "2px solid #FFFFFF",
                  borderBottom: "2px solid #FFFFFF",
                }}
              >
                <span aria-hidden className="absolute left-0 top-1/2 h-3 w-1 -translate-y-1/2" style={{ backgroundColor: "#FF4D4D" }} />
                <span aria-hidden className="absolute right-0 top-1/2 h-3 w-1 -translate-y-1/2" style={{ backgroundColor: "#FF4D4D" }} />
                <span className="text-[9px] font-bold uppercase" style={{ letterSpacing: "2px", color: "rgba(255,255,255,0.5)" }}>
                  NET
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {cellOrder.map((rotIdx, gridIdx) => {
                  const player = find(draft[rotIdx] ?? "");
                  const isFrontRow = gridIdx < 3;
                  const isSelected = selectedSlot === rotIdx;
                  return (
                    <button
                      key={rotIdx}
                      type="button"
                      onClick={() => handleSlotTap(rotIdx)}
                      className={cn(
                        "relative flex aspect-square flex-col items-center justify-center rounded-xl border bg-card px-1 py-2 text-center transition-all",
                        isSelected
                          ? "border-primary ring-2 ring-primary/40"
                          : "border-border",
                      )}
                    >
                      <span className="absolute left-1.5 top-1.5 text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                        P{rotIdx + 1}
                      </span>
                      <span className="text-[20px] font-black leading-none tabular-nums text-foreground">
                        {player?.number ?? "—"}
                      </span>
                      <span className="mt-0.5 max-w-full truncate text-[10px] font-medium text-muted-foreground">
                        {player?.name?.split(" ")[0] ?? "Empty"}
                      </span>
                      <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/70">
                        {isFrontRow ? "Front" : "Back"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Bench */}
          <section className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                Bench · {bench.length}
              </span>
              {selectedSlot !== null && (
                <button
                  type="button"
                  onClick={() => setSelectedSlot(null)}
                  className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
                >
                  Cancel selection
                </button>
              )}
            </div>
            {bench.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                No bench players.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {bench.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleBenchTap(p.id)}
                    disabled={selectedSlot === null}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border p-2.5 text-left transition-all",
                      selectedSlot !== null
                        ? "border-border bg-card active:scale-[0.98]"
                        : "border-border bg-card opacity-60",
                    )}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-popover text-sm font-black tabular-nums">
                      {p.number}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-xs font-bold">{p.name}</div>
                      <div className="text-[9px] uppercase text-muted-foreground">{p.position}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          {JSON.stringify(draft) !== JSON.stringify(rotation) && (
            <button
              type="button"
              onClick={reset}
              className="mt-3 w-full rounded-xl border border-border bg-card px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
            >
              Reset changes
            </button>
          )}
        </div>

        <footer className="border-t border-border bg-popover p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onKeep}
              className="h-12 rounded-2xl border border-border bg-card text-xs font-black uppercase tracking-widest text-muted-foreground active:scale-[0.98]"
            >
              Keep Same
            </button>
            <button
              type="button"
              onClick={() => onConfirm(draft)}
              className="h-12 rounded-2xl bg-primary text-xs font-black uppercase tracking-widest text-primary-foreground active:scale-[0.98]"
            >
              Confirm Lineup
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
