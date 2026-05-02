import { useRef, useState } from "react";
import { Star } from "lucide-react";
import type { Player, RotationState } from "@/types";
import { isLibero } from "@/types";
import { cn } from "@/lib/utils";
import { tapHaptic } from "@/utils/haptics";

interface RotationCourtProps {
  rotation: RotationState;
  roster: Player[];
  isHomeServing: boolean;
  isHomeOurs: boolean;
  ourColor: string;
  /** Fired after a 500ms hold on a cell. Receives the rotation index (0..5). */
  onLongPressCell?: (rotationIndex: number) => void;
  /** Rotation index to briefly green-flash (e.g. just after a sub). */
  flashIndex?: number | null;
}

/**
 * Volleyball rotation:
 *   Position layout (court view from our side):
 *     [P4 OH] [P3 MB] [P2 RS]   <- front row (at net)
 *     [P5 OH] [P6 MB] [P1 S ]   <- back row (P1 = server)
 */
export function RotationCourt({
  rotation,
  roster,
  isHomeServing,
  isHomeOurs,
  ourColor,
  onLongPressCell,
  flashIndex,
}: RotationCourtProps) {
  const find = (id: string) => roster.find((p) => p.id === id);
  const cellOrder: number[] = [3, 2, 1, 4, 5, 0];
  const oursServing = isHomeServing === isHomeOurs;

  const timerRef = useRef<number | null>(null);
  const longPressedRef = useRef(false);
  const [pulseIdx, setPulseIdx] = useState<number | null>(null);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const startPress = (rotIdx: number) => {
    if (!onLongPressCell) return;
    longPressedRef.current = false;
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      longPressedRef.current = true;
      tapHaptic("heavy");
      setPulseIdx(rotIdx);
      window.setTimeout(() => setPulseIdx(null), 220);
      onLongPressCell(rotIdx);
    }, 500);
  };

  const cancelPress = () => {
    clearTimer();
  };

  return (
    <div className="border-b border-border bg-background px-4 py-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          On Court
        </span>
        <span className="text-[10px] font-medium text-muted-foreground">
          ★ tracked · <span style={{ color: ourColor }}>●</span> serving
        </span>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-border bg-[var(--popover)] p-3">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(to bottom, transparent 49%, var(--foreground) 49%, var(--foreground) 51%, transparent 51%)",
          }}
        />
        {/* NET bar — top of the court (opponents are on the other side) */}
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
        <div className="relative grid grid-cols-3 gap-2">
          {cellOrder.map((rotIdx, gridIdx) => {
            const player = find(rotation[rotIdx] ?? "");
            const isServer = rotIdx === 0;
            const isFrontRow = gridIdx < 3;
            const liberoCell = player ? isLibero(player) : false;
            const isFlashing = flashIndex === rotIdx;
            const isPulsing = pulseIdx === rotIdx;
            return (
              <div
                key={gridIdx}
                onPointerDown={() => startPress(rotIdx)}
                onPointerUp={cancelPress}
                onPointerLeave={cancelPress}
                onPointerCancel={cancelPress}
                onContextMenu={(e) => e.preventDefault()}
                className={cn(
                  "relative flex aspect-square select-none flex-col items-center justify-center rounded-xl border bg-card px-1 py-2 text-center transition-all duration-200",
                  "border-border",
                  isServer && oursServing && "vp-serving",
                )}
                style={{
                  ...(liberoCell
                    ? {
                        backgroundColor: "rgba(0, 172, 193, 0.15)",
                        borderColor: "#00ACC1",
                      }
                    : isServer && oursServing
                      ? { borderColor: ourColor }
                      : {}),
                  ...(isFlashing
                    ? {
                        backgroundColor: "rgba(57, 255, 20, 0.35)",
                        borderColor: "#39FF14",
                      }
                    : {}),
                  transform: isPulsing ? "scale(1.08)" : "scale(1)",
                  WebkitUserSelect: "none",
                  WebkitTouchCallout: "none",
                }}
              >
                {player?.isTracked && (
                  <Star
                    className="absolute right-1.5 top-1.5 h-3.5 w-3.5 fill-primary text-primary"
                    strokeWidth={1.5}
                  />
                )}
                {isServer && (
                  <span
                    className="absolute left-1.5 top-1.5 h-2 w-2 rounded-full"
                    style={{ backgroundColor: oursServing ? ourColor : "var(--muted-foreground)" }}
                  />
                )}
                <span className="text-[20px] font-black leading-none tabular-nums text-foreground">
                  {player?.number ?? "—"}
                </span>
                <span className="mt-0.5 max-w-full truncate text-[10px] font-medium text-muted-foreground">
                  {player ? `${player.name.split(" ")[0]} · ${player.position}` : "Empty"}
                </span>
                {liberoCell ? (
                  <span className="mt-0.5 text-[9px] font-black uppercase tracking-wider text-[#00ACC1]">
                    LIB · P{rotIdx + 1}
                  </span>
                ) : (
                  <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/70">
                    P{rotIdx + 1} · {isFrontRow ? "Front" : "Back"}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
