import { useEffect, useState } from "react";
import { X, ChevronRight, ChevronDown } from "lucide-react";
import type { ErrorType } from "@/types";
import { tapHaptic } from "@/utils/haptics";
import { cn } from "@/lib/utils";

interface ErrorOption {
  type: ErrorType;
  label: string;
  description: string;
  emoji: string;
}

const TIER1: ErrorOption[] = [
  { type: "hit_error", label: "Hit Error", description: "Attack out of bounds or into the net", emoji: "🏐" },
  { type: "service_error", label: "Service Error", description: "Serve into the net or out of bounds", emoji: "📡" },
  { type: "net_touch", label: "Net Touch", description: "Player contacts the net", emoji: "🕸️" },
  { type: "blocked", label: "Blocked", description: "Attack stuffed back into your court", emoji: "✋" },
  { type: "lift_carry", label: "Lift / Carry", description: "Ball caught, lifted, or carried", emoji: "🤲" },
  { type: "foot_fault", label: "Foot Fault", description: "Server steps on or over the end line", emoji: "👣" },
];

const TIER2: ErrorOption[] = [
  { type: "double_contact", label: "Double Contact", description: "Player hits the ball twice in a row", emoji: "✌️" },
  { type: "four_touches", label: "Four Touches", description: "Team contacted ball more than 3 times", emoji: "4️⃣" },
  { type: "back_row_violation", label: "Back Row Violation", description: "Back row player attacks above net", emoji: "⛔" },
  { type: "reach_over", label: "Reach Over", description: "Player contacts ball on opponent side", emoji: "↗️" },
  { type: "rotation_error", label: "Rotation Error", description: "Player out of position at serve", emoji: "🔄" },
];

interface Props {
  open: boolean;
  onSelect: (type: ErrorType) => void;
  onCancel: () => void;
  /** When false, Foot Fault is shown with a soft visual cue (dim + caption). */
  isServing?: boolean;
}

export function ErrorTypeModal({ open, onSelect, onCancel, isServing = true }: Props) {
  const [otherOpen, setOtherOpen] = useState(false);
  const [flashing, setFlashing] = useState<ErrorType | null>(null);

  useEffect(() => {
    if (open) {
      tapHaptic("medium");
      setOtherOpen(false);
    }
  }, [open]);

  if (!open) return null;

  const handleSelect = (type: ErrorType) => {
    tapHaptic("medium");
    setFlashing(type);
    setTimeout(() => {
      setFlashing(null);
      onSelect(type);
    }, 150);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0A0E1A]">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-border px-4 pb-3 pt-5">
        <div>
          <div className="text-[12px] font-black uppercase tracking-widest text-muted-foreground">
            What type of error?
          </div>
          <div className="mt-0.5 text-[13px] font-bold text-[#FF4D4D]">
            Point awarded to opponent
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            tapHaptic("light");
            onCancel();
          }}
          className="flex items-center gap-1 rounded-full bg-card px-3 py-1.5 text-[12px] font-black uppercase tracking-widest text-muted-foreground active:scale-95"
        >
          <X className="h-3.5 w-3.5" /> Cancel
        </button>
      </div>

      {/* List */}
      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {TIER1.map((opt) => (
          <ErrorButton
            key={opt.type}
            opt={opt}
            flashing={flashing === opt.type}
            onClick={() => handleSelect(opt.type)}
            dimmed={opt.type === "foot_fault" && !isServing}
            note={opt.type === "foot_fault" && !isServing ? "Tracked player isn't serving" : undefined}
          />
        ))}

        {/* OTHER accordion */}
        <button
          type="button"
          onClick={() => {
            tapHaptic("light");
            setOtherOpen((v) => !v);
          }}
          className="flex h-[56px] w-full items-center justify-between rounded-xl border border-border bg-card px-4 active:scale-[0.99]"
        >
          <span className="text-[14px] font-black uppercase tracking-widest text-foreground">
            {otherOpen ? "Other ▴" : "Other ▾"}
          </span>
          <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", otherOpen && "rotate-90")} />
        </button>

        {otherOpen && (
          <div className="space-y-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            {TIER2.map((opt) => (
              <ErrorButton key={opt.type} opt={opt} flashing={flashing === opt.type} onClick={() => handleSelect(opt.type)} compact />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ErrorButton({
  opt,
  onClick,
  flashing,
  compact = false,
}: {
  opt: ErrorOption;
  onClick: () => void;
  flashing: boolean;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-4 rounded-xl border border-border px-4 active:scale-[0.99] transition-colors",
        compact ? "h-[60px] bg-popover" : "h-[72px] bg-card",
        flashing && "bg-[rgba(255,77,77,0.2)]",
      )}
    >
      <span className="text-2xl leading-none">{opt.emoji}</span>
      <div className="min-w-0 flex-1 text-left">
        <div className={cn("font-black text-foreground", compact ? "text-[15px]" : "text-[17px]")}>
          {opt.label}
        </div>
        <div className={cn("font-medium text-muted-foreground", compact ? "text-[12px]" : "text-[13px]")}>
          {opt.description}
        </div>
      </div>
      <ChevronRight className="h-5 w-5 text-[#FF4D4D]" />
    </button>
  );
}
