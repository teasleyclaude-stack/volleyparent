import { Star } from "lucide-react";
import type { Player, RotationState } from "@/types";
import { cn } from "@/lib/utils";

interface RotationCourtProps {
  rotation: RotationState;
  roster: Player[];
  isHomeServing: boolean;
  isHomeOurs: boolean;
  ourColor: string;
}

/**
 * Volleyball rotation:
 *   Position layout (court view from our side):
 *     [P4 OH] [P3 MB] [P2 RS]   <- front row (at net)
 *     [P5 OH] [P6 MB] [P1 S ]   <- back row (P1 = server)
 */
export function RotationCourt({ rotation, roster, isHomeServing, isHomeOurs, ourColor }: RotationCourtProps) {
  const find = (id: string) => roster.find((p) => p.id === id);
  const cellOrder: number[] = [3, 2, 1, 4, 5, 0]; // indices into rotation for the 6 grid cells (front L→R, back L→R)
  const oursServing = isHomeServing === isHomeOurs;

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
        {/* Court lines decoration */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(to bottom, transparent 49%, var(--foreground) 49%, var(--foreground) 51%, transparent 51%)",
          }}
        />
        <div className="relative grid grid-cols-3 gap-2">
          {cellOrder.map((rotIdx, gridIdx) => {
            const player = find(rotation[rotIdx] ?? "");
            const isServer = rotIdx === 0;
            const isFrontRow = gridIdx < 3;
            return (
              <div
                key={gridIdx}
                className={cn(
                  "relative flex aspect-square flex-col items-center justify-center rounded-xl border bg-card px-1 py-2 text-center transition-all",
                  "border-border",
                  isServer && oursServing && "vp-serving",
                )}
                style={isServer && oursServing ? { borderColor: ourColor } : undefined}
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
                  {player?.name?.split(" ")[0] ?? "Empty"}
                </span>
                <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/70">
                  P{rotIdx + 1} · {isFrontRow ? "Front" : "Back"}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-2 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          NET
          <span className="h-px flex-1 bg-border" />
        </div>
      </div>
    </div>
  );
}
