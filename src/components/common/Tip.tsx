import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface TipProps {
  show: boolean;
  message: string;
  /** Direction the arrow points (toward the target). Default: down. */
  arrow?: "up" | "down" | "none";
  /** auto-dismiss after ms. Pass 0 or null to require manual dismiss. */
  autoDismissMs?: number | null;
  onDismiss: () => void;
  /** Show a "Got it" button (used when no auto-dismiss). */
  showGotIt?: boolean;
  className?: string;
}

/** Small dark-navy tooltip bubble, fades in, optional arrow + auto-dismiss. */
export function Tip({
  show,
  message,
  arrow = "down",
  autoDismissMs = 4000,
  onDismiss,
  showGotIt = false,
  className,
}: TipProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!show) return;
    setMounted(true);
    if (autoDismissMs && autoDismissMs > 0) {
      const t = window.setTimeout(() => onDismiss(), autoDismissMs);
      return () => window.clearTimeout(t);
    }
  }, [show, autoDismissMs, onDismiss]);

  if (!show || !mounted) return null;

  return (
    <div
      role="status"
      className={cn(
        "pointer-events-auto relative z-[60] max-w-[280px] rounded-xl px-3 py-2 text-[13px] font-medium text-white shadow-xl",
        "animate-in fade-in zoom-in-95 duration-200",
        className,
      )}
      style={{ backgroundColor: "#1A2744" }}
    >
      <div>{message}</div>
      {showGotIt && (
        <button
          type="button"
          onClick={onDismiss}
          className="mt-2 w-full rounded-md bg-white/10 px-2 py-1 text-[11px] font-black uppercase tracking-widest text-white active:scale-95"
        >
          Got it
        </button>
      )}
      {arrow === "up" && (
        <div
          className="absolute -top-2 left-1/2 h-0 w-0 -translate-x-1/2"
          style={{
            borderLeft: "8px solid transparent",
            borderRight: "8px solid transparent",
            borderBottom: "8px solid #1A2744",
          }}
        />
      )}
      {arrow === "down" && (
        <div
          className="absolute -bottom-2 left-1/2 h-0 w-0 -translate-x-1/2"
          style={{
            borderLeft: "8px solid transparent",
            borderRight: "8px solid transparent",
            borderTop: "8px solid #1A2744",
          }}
        />
      )}
    </div>
  );
}
