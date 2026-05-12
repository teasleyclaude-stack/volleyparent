import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Player, RotationState } from "@/types";
import { RotationCourt } from "@/components/game/RotationCourt";
import { applyRotation, reverseRotation } from "@/utils/stats";
import { tapHaptic } from "@/utils/haptics";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  initialRotation: RotationState;
  roster: Player[];
  isHomeServing: boolean;
  isHomeOurs: boolean;
  ourColor: string;
  onConfirm: (netSteps: number) => void;
  onCancel: () => void;
}

export function CorrectRotationSheet({
  open,
  initialRotation,
  roster,
  isHomeServing,
  isHomeOurs,
  ourColor,
  onConfirm,
  onCancel,
}: Props) {
  const [tempRotation, setTempRotation] = useState<RotationState>(initialRotation);
  const [netSteps, setNetSteps] = useState(0);

  useEffect(() => {
    if (open) {
      setTempRotation([...initialRotation] as RotationState);
      setNetSteps(0);
    }
  }, [open, initialRotation]);

  const counterText = useMemo(() => {
    if (netSteps === 0) return "Corrections made: 0";
    if (netSteps > 0) return `Corrections made: ${netSteps} forward`;
    return `Corrections made: ${-netSteps} back`;
  }, [netSteps]);

  if (!open) return null;

  const goBack = () => {
    tapHaptic("light");
    setTempRotation((prev) => reverseRotation(prev));
    setNetSteps((n) => n - 1);
  };

  const goForward = () => {
    tapHaptic("light");
    setTempRotation((prev) => applyRotation(prev));
    setNetSteps((n) => n + 1);
  };

  const confirm = () => {
    if (netSteps === 0) {
      onCancel();
      return;
    }
    tapHaptic("medium");
    onConfirm(netSteps);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-[440px] rounded-t-3xl border-t border-border bg-background pb-6 pt-2 animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-muted" />
        <div className="px-5">
          <h2 className="text-[12px] font-black uppercase tracking-widest text-foreground">
            Correct Rotation
          </h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Score and stats are not affected
          </p>
        </div>

        <div className="mt-3 flex items-center gap-3 px-3">
          <button
            type="button"
            data-tutorial="correct-rot-back"
            onClick={() => {
              goBack();
              if (typeof window !== "undefined") {
                window.dispatchEvent(new Event("practice:correct-rotation-changed"));
              }
            }}
            className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl border border-border bg-card text-foreground active:scale-95"
            aria-label="Rotate back one"
          >
            <ChevronLeft className="h-6 w-6" />
            <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
              Back one
            </span>
          </button>
          <div className="min-w-0 flex-1">
            <RotationCourt
              rotation={tempRotation}
              roster={roster}
              isHomeServing={isHomeServing}
              isHomeOurs={isHomeOurs}
              ourColor={ourColor}
            />
          </div>
          <button
            type="button"
            data-tutorial="correct-rot-fwd"
            onClick={() => {
              goForward();
              if (typeof window !== "undefined") {
                window.dispatchEvent(new Event("practice:correct-rotation-changed"));
              }
            }}
            className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl border border-border bg-card text-foreground active:scale-95"
            aria-label="Rotate forward one"
          >
            <ChevronRight className="h-6 w-6" />
            <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
              Forward one
            </span>
          </button>
        </div>

        <div className="mt-1 px-5 text-center text-[12px] font-medium text-muted-foreground">
          {counterText}
        </div>

        <div className="mt-4 px-5">
          <button
            type="button"
            onClick={confirm}
            className={cn(
              "h-14 w-full rounded-2xl text-sm font-black uppercase tracking-widest active:scale-[0.98]",
              netSteps === 0
                ? "bg-card text-muted-foreground"
                : "text-background",
            )}
            style={netSteps === 0 ? undefined : { backgroundColor: "#39FF14" }}
          >
            Confirm
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="mt-2 h-9 w-full text-[12px] font-medium text-muted-foreground hover:text-foreground"
          >
            Cancel — no changes
          </button>
        </div>
      </div>
    </div>
  );
}
