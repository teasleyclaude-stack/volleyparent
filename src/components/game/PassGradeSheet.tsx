import { useEffect } from "react";
import type { PassGrade } from "@/types";
import { tapHaptic } from "@/utils/haptics";

interface Props {
  open: boolean;
  onSelect: (grade: PassGrade) => void;
  onCancel: () => void;
}

const GRADES: { grade: PassGrade; label: string; desc: string; color: string; fg: string }[] = [
  { grade: 3, label: "3", desc: "Setter has all options", color: "#39FF14", fg: "#0A2200" },
  { grade: 2, label: "2", desc: "Setter has most options", color: "#00B4FF", fg: "#06283D" },
  { grade: 1, label: "1", desc: "Setter is limited", color: "#F59E0B", fg: "#3A2200" },
  { grade: 0, label: "0", desc: "Ace against / passing error", color: "#FF4D4D", fg: "#3A0000" },
];

export function PassGradeSheet({ open, onSelect, onCancel }: Props) {
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
    <div className="mt-2 rounded-2xl border border-border bg-popover p-3">
      <div className="mb-2 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        Passing Grade
      </div>
      <div className="grid grid-cols-3 gap-2">
        {GRADES.slice(0, 3).map((g) => (
          <GradeBtn key={g.grade} {...g} onPress={() => { tapHaptic("medium"); onSelect(g.grade); }} />
        ))}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <div />
        <GradeBtn {...GRADES[3]} onPress={() => { tapHaptic("heavy"); onSelect(0); }} />
        <div />
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="mt-3 h-10 w-full rounded-2xl border border-border bg-card text-xs font-black uppercase tracking-widest text-muted-foreground"
      >
        Cancel
      </button>
    </div>
  );
}

function GradeBtn({
  label,
  desc,
  color,
  fg,
  onPress,
}: {
  label: string;
  desc: string;
  color: string;
  fg: string;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className="vp-press-anim flex h-[78px] flex-col items-center justify-center gap-0.5 rounded-xl shadow-lg shadow-black/30"
      style={{ backgroundColor: color, color: fg }}
    >
      <span className="text-2xl font-black leading-none">{label}</span>
      <span className="px-1 text-center text-[9px] font-bold uppercase leading-tight" style={{ letterSpacing: "0.5px" }}>
        {desc}
      </span>
    </button>
  );
}
