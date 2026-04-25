import { useState } from "react";
import { Radio, Copy, Share2, X } from "lucide-react";
import { useFanview } from "@/hooks/useFanview";
import { fanviewUrl } from "@/lib/fanview";
import { useGameStore } from "@/store/gameStore";
import { cn } from "@/lib/utils";
import { tapHaptic } from "@/utils/haptics";

export function FanviewButton() {
  const session = useGameStore((s) => s.session);
  const { active, busy, start, stop, share } = useFanview();
  const [shareOpen, setShareOpen] = useState(false);
  const [stopOpen, setStopOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!session) return null;
  const url = fanviewUrl(session.id);

  const handleTap = async () => {
    tapHaptic("light");
    if (!active) {
      const u = await start();
      if (u) {
        setShareOpen(true);
        // Try to immediately invoke share sheet
        await share(u);
      }
      return;
    }
    setShareOpen(true);
  };

  const handleLongPress = (e: React.PointerEvent) => {
    if (!active) return;
    e.preventDefault();
    setStopOpen(true);
  };

  // Long-press detection
  let pressTimer: ReturnType<typeof setTimeout> | null = null;
  const onPointerDown = (e: React.PointerEvent) => {
    if (!active) return;
    pressTimer = setTimeout(() => handleLongPress(e), 600);
  };
  const onPointerUp = () => {
    if (pressTimer) clearTimeout(pressTimer);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleTap}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        disabled={busy}
        className={cn(
          "flex h-9 items-center gap-1.5 rounded-full px-3 text-[11px] font-black uppercase tracking-widest transition-colors",
          active
            ? "bg-[var(--kill)]/15 text-[var(--kill)]"
            : "bg-card text-foreground",
          busy && "opacity-60",
        )}
        aria-label={active ? "FanView is live. Tap to share, long-press to stop." : "Start FanView broadcast"}
      >
        <span className="relative flex h-2 w-2">
          {active && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--kill)] opacity-75" />
          )}
          <span
            className={cn(
              "relative inline-flex h-2 w-2 rounded-full",
              active ? "bg-[var(--kill)]" : "bg-muted-foreground",
            )}
          />
        </span>
        <Radio className="h-3.5 w-3.5" />
        FanView
      </button>

      {shareOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
          onClick={() => setShareOpen(false)}
        >
          <div
            className="w-full max-w-[440px] rounded-t-3xl border border-border bg-popover p-5 sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black uppercase tracking-widest text-foreground">
                FanView Live 📡
              </h3>
              <button
                type="button"
                onClick={() => setShareOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-card text-muted-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Anyone with this link can follow {session.homeTeam} vs {session.awayTeam} live in their browser. No
              app or login required.
            </p>
            <div className="mt-3 break-all rounded-xl border border-border bg-card p-3 text-xs text-foreground">
              {url}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={copy}
                className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-card text-sm font-black uppercase tracking-widest text-foreground active:scale-95"
              >
                <Copy className="h-4 w-4" />
                {copied ? "Copied!" : "Copy"}
              </button>
              <button
                type="button"
                onClick={() => share(url)}
                className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-black uppercase tracking-widest text-primary-foreground active:scale-95"
              >
                <Share2 className="h-4 w-4" /> Share
              </button>
            </div>
            {active && (
              <p className="mt-3 text-center text-[11px] text-muted-foreground">
                Long-press the FanView button to stop broadcasting.
              </p>
            )}
          </div>
        </div>
      )}

      {stopOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
          onClick={() => setStopOpen(false)}
        >
          <div
            className="w-full max-w-[440px] rounded-t-3xl border border-border bg-popover p-5 sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-black text-foreground">Stop FanView?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Watchers will see the broadcast end. You can start a new one later.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStopOpen(false)}
                className="h-12 rounded-2xl border border-border bg-card text-sm font-black uppercase tracking-widest text-muted-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await stop();
                  setStopOpen(false);
                }}
                className="h-12 rounded-2xl bg-destructive text-sm font-black uppercase tracking-widest text-destructive-foreground"
              >
                Stop
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
