import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import type { PracticeStep } from "@/store/practiceStore";

/**
 * Spotlight overlay for Practice Mode tutorial.
 *
 * Targets are identified via `data-tutorial="<key>"` on real DOM elements
 * inside the live dashboard. The overlay polls the bounding box every
 * animation frame so layout changes (modals opening, etc.) keep the cutout
 * aligned. Clicks outside the spotlight are blocked.
 */

export interface StepConfig {
  step: PracticeStep;
  index: number; // 1..8
  totalSteps: number;
  title: string;
  description: string;
  /** data-tutorial attribute value to spotlight. */
  target: string;
  /** Optional secondary target spotlighted at the same time. */
  target2?: string;
  /** Where to position the instruction card. Default: bottom. */
  cardPosition?: "bottom" | "top";
  /** If true, cell briefly pulses with a green ring (for long-press step). */
  pulseRing?: boolean;
}

interface TutorialOverlayProps {
  config: StepConfig;
  onSkip: () => void;
  /** Called when user swipes right or taps Back. Omit to hide back affordance. */
  onBack?: () => void;
}

function rectOf(target: string): DOMRect | null {
  if (typeof document === "undefined") return null;
  const el = document.querySelector(`[data-tutorial="${target}"]`);
  if (!el) return null;
  return el.getBoundingClientRect();
}

export function TutorialOverlay({ config, onSkip, onBack }: TutorialOverlayProps) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [rect2, setRect2] = useState<DOMRect | null>(null);
  const [showHint, setShowHint] = useState(false);
  const stepStartRef = useRef<number>(Date.now());

  // Reset hint timer on step change
  useEffect(() => {
    stepStartRef.current = Date.now();
    setShowHint(false);
    const t = window.setTimeout(() => setShowHint(true), 10_000);
    return () => window.clearTimeout(t);
  }, [config.step]);

  // Track target rect every animation frame
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setRect(rectOf(config.target));
      setRect2(config.target2 ? rectOf(config.target2) : null);
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [config.target, config.target2]);

  if (typeof document === "undefined") return null;

  const PADDING = 8;
  const cutouts: Array<{ rect: DOMRect | null; pulse?: boolean }> = [
    { rect, pulse: config.pulseRing || showHint },
    { rect: rect2 ?? null, pulse: config.pulseRing || showHint },
  ];

  // Build the dim layer using SVG so we can punch holes for the spotlight(s).
  const W = typeof window !== "undefined" ? window.innerWidth : 0;
  const H = typeof window !== "undefined" ? window.innerHeight : 0;

  // Compute the union bounding box of all spotlight rects, so the click-blocker
  // frames hug a single hole. SVG masks only affect *rendering* — they don't
  // pass pointer events through cutouts. So we use the SVG purely as a visual
  // dim layer (pointer-events: none) and place four absolutely-positioned
  // click-blockers around the hole instead.
  const validRects = cutouts.map((c) => c.rect).filter((r): r is DOMRect => !!r);
  let hole: { left: number; top: number; right: number; bottom: number } | null = null;
  if (validRects.length > 0) {
    const left = Math.min(...validRects.map((r) => r.left)) - PADDING;
    const top = Math.min(...validRects.map((r) => r.top)) - PADDING;
    const right = Math.max(...validRects.map((r) => r.right)) + PADDING;
    const bottom = Math.max(...validRects.map((r) => r.bottom)) + PADDING;
    hole = { left, top, right, bottom };
  }

  const blockerStyle: React.CSSProperties = {
    position: "absolute",
    background: "transparent",
  };

  const swallow = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };

  const node = (
    <div className="pointer-events-none fixed inset-0 z-[80]">
      {/* Visual dim layer — pointer-events disabled so the highlighted target
          stays clickable. Click-blocking is handled by the frame divs below. */}
      <svg width={W} height={H} className="pointer-events-none">
        <defs>
          <mask id="tutorial-mask">
            <rect width={W} height={H} fill="white" />
            {cutouts.map((c, i) =>
              c.rect ? (
                <rect
                  key={i}
                  x={c.rect.left - PADDING}
                  y={c.rect.top - PADDING}
                  width={c.rect.width + PADDING * 2}
                  height={c.rect.height + PADDING * 2}
                  rx={14}
                  ry={14}
                  fill="black"
                />
              ) : null,
            )}
          </mask>
        </defs>
        <rect width={W} height={H} fill="rgba(0,0,0,0.65)" mask="url(#tutorial-mask)" />
      </svg>

      {/* Click-blocker frames — block taps everywhere EXCEPT the spotlight hole.
          When no target is mounted yet, fall back to a single full-screen blocker. */}
      {hole ? (
        <>
          <div
            className="pointer-events-auto"
            style={{ ...blockerStyle, left: 0, top: 0, width: W, height: hole.top }}
            onPointerDown={swallow}
            onClick={swallow}
          />
          <div
            className="pointer-events-auto"
            style={{ ...blockerStyle, left: 0, top: hole.bottom, width: W, height: Math.max(0, H - hole.bottom) }}
            onPointerDown={swallow}
            onClick={swallow}
          />
          <div
            className="pointer-events-auto"
            style={{ ...blockerStyle, left: 0, top: hole.top, width: hole.left, height: hole.bottom - hole.top }}
            onPointerDown={swallow}
            onClick={swallow}
          />
          <div
            className="pointer-events-auto"
            style={{ ...blockerStyle, left: hole.right, top: hole.top, width: Math.max(0, W - hole.right), height: hole.bottom - hole.top }}
            onPointerDown={swallow}
            onClick={swallow}
          />
        </>
      ) : (
        <div
          className="pointer-events-auto absolute inset-0"
          onPointerDown={swallow}
          onClick={swallow}
        />
      )}

      {/* Pulsing ring on the spotlight when hint is shown / pulseRing is on */}
      {cutouts.map(
        (c, i) =>
          c.rect && c.pulse ? (
            <div
              key={`ring-${i}`}
              className="pointer-events-none absolute animate-pulse rounded-2xl"
              style={{
                left: c.rect.left - PADDING,
                top: c.rect.top - PADDING,
                width: c.rect.width + PADDING * 2,
                height: c.rect.height + PADDING * 2,
                boxShadow: "0 0 0 3px #39FF14, 0 0 24px 4px rgba(57,255,20,0.55)",
                borderRadius: 14,
              }}
            />
          ) : null,
      )}

      {/* Instruction card */}
      <div
        className={cn(
          "pointer-events-auto absolute inset-x-0 z-[81] px-3",
          config.cardPosition === "top" ? "top-3" : "bottom-3",
        )}
      >
        <div className="mx-auto max-w-[440px] rounded-2xl border border-border bg-card p-4 shadow-2xl">
          {/* Progress dots + step counter */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {Array.from({ length: config.totalSteps }).map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    i < config.index
                      ? "bg-[#39FF14]"
                      : "bg-muted-foreground/30",
                  )}
                />
              ))}
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Step {config.index} of {config.totalSteps}
            </span>
          </div>

          <h3 className="mt-3 text-[17px] font-black text-foreground">{config.title}</h3>
          <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
            {config.description}
          </p>

          <div className="mt-3 flex items-center justify-between">
            {showHint ? (
              <span className="text-[11px] font-black uppercase tracking-widest text-[#39FF14]">
                ↗ Show me
              </span>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={onSkip}
              className="text-[12px] font-bold text-muted-foreground active:text-foreground"
            >
              Skip tutorial
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}

/**
 * Brief auto-dismiss overlay shown between steps for context.
 */
export function StepFlashOverlay({
  message,
  show,
  ms = 1500,
  onDone,
}: {
  message: string;
  show: boolean;
  ms?: number;
  onDone: () => void;
}) {
  useEffect(() => {
    if (!show) return;
    const t = window.setTimeout(onDone, ms);
    return () => window.clearTimeout(t);
  }, [show, ms, onDone]);
  if (!show || typeof document === "undefined") return null;
  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[90] flex items-center justify-center px-6">
      <div
        className="rounded-2xl border border-[#39FF14]/40 bg-card px-5 py-3 text-center text-sm font-black uppercase tracking-widest text-foreground shadow-2xl"
        style={{ animation: "fade-in 200ms ease-out" }}
      >
        {message}
      </div>
    </div>,
    document.body,
  );
}
