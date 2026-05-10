import { useState } from "react";
import { Zap, Shield, Hand, Crosshair, AlertTriangle } from "lucide-react";
import type { StatType } from "@/types";
import { tapHaptic } from "@/utils/haptics";
import { cn } from "@/lib/utils";

interface StatButtonProps {
  stat: StatType;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

const STYLES: Record<
  string,
  { bg: string; fg: string; ring: string; Icon: React.ComponentType<{ className?: string; strokeWidth?: number }> }
> = {
  kill: { bg: "bg-[var(--kill)]", fg: "text-[var(--kill-foreground)]", ring: "ring-[var(--kill)]", Icon: Zap },
  dig: { bg: "bg-[var(--dig)]", fg: "text-[var(--dig-foreground)]", ring: "ring-[var(--dig)]", Icon: Shield },
  block: { bg: "bg-[var(--block)]", fg: "text-[var(--block-foreground)]", ring: "ring-[var(--block)]", Icon: Hand },
  ace: { bg: "bg-[var(--ace)]", fg: "text-[var(--ace-foreground)]", ring: "ring-[var(--ace)]", Icon: Crosshair },
  error: { bg: "bg-[var(--error)]", fg: "text-[var(--error-foreground)]", ring: "ring-[var(--error)]", Icon: AlertTriangle },
};

export function StatButton({ stat, label, onPress }: StatButtonProps) {
  const [animKey, setAnimKey] = useState(0);
  const s = STYLES[stat] ?? STYLES.kill;
  const { Icon } = s;

  return (
    <button
      key={animKey}
      type="button"
      onClick={() => {
        tapHaptic("medium");
        setAnimKey((k) => k + 1);
        onPress();
      }}
      className={cn(
        "vp-press-anim flex h-[88px] w-full flex-col items-center justify-center gap-1 rounded-2xl shadow-lg shadow-black/30",
        s.bg,
        s.fg,
      )}
    >
      <Icon className="h-7 w-7" strokeWidth={2.4} />
      <span className="text-[12px] font-black uppercase tracking-widest">{label}</span>
    </button>
  );
}
