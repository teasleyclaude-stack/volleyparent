import { useEffect } from "react";
import { X, Star, ArrowUpRight, AlertOctagon, ArrowDownRight } from "lucide-react";
import { tapHaptic } from "@/utils/haptics";

export type SetOutcome = "assist" | "dump_kill" | "setting_error" | "dump_error";

interface Props {
  open: boolean;
  onSelect: (outcome: SetOutcome) => void;
  onCancel: () => void;
}

const OPTIONS: {
  key: SetOutcome;
  label: string;
  description: string;
  Icon: React.ComponentType<{ className?: string }>;
  bg: string;
  fg: string;
}[] = [
  {
    key: "assist",
    label: "Assist",
    description: "Set led directly to a kill",
    Icon: Star,
    bg: "rgba(139,92,246,0.15)",
    fg: "#A78BFA",
  },
  {
    key: "dump_kill",
    label: "Dump Kill",
    description: "Setter attacked over the net",
    Icon: ArrowUpRight,
    bg: "rgba(57,255,20,0.12)",
    fg: "#39FF14",
  },
  {
    key: "setting_error",
    label: "Setting Error",
    description: "Illegal set / net / out",
    Icon: AlertOctagon,
    bg: "rgba(255,77,77,0.12)",
    fg: "#FF4D4D",
  },
  {
    key: "dump_error",
    label: "Dump Error",
    description: "Dump attempt failed",
    Icon: ArrowDownRight,
    bg: "rgba(255,77,77,0.12)",
    fg: "#FF4D4D",
  },
];

export function SetActionModal({ open, onSelect, onCancel }: Props) {
  useEffect(() => {
    if (open) tapHaptic("medium");
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0A0E1A]">
      <div className="flex items-start justify-between border-b border-border px-4 pb-3 pt-5">
        <div>
          <div className="text-[12px] font-black uppercase tracking-widest text-muted-foreground">
            What happened on that set?
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

      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {OPTIONS.map((opt) => {
          const { Icon } = opt;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => {
                tapHaptic("medium");
                onSelect(opt.key);
              }}
              className="flex h-[72px] w-full items-center gap-4 rounded-xl border border-border px-4 active:scale-[0.99]"
              style={{ backgroundColor: opt.bg }}
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: "rgba(0,0,0,0.25)", color: opt.fg }}
              >
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1 text-left">
                <div className="text-[17px] font-black text-foreground">{opt.label}</div>
                <div className="text-[13px] font-medium text-muted-foreground">{opt.description}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
