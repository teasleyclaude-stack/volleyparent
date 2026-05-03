import { useEffect, useRef, useState } from "react";
import type { GameSession } from "@/types";
import { eventToFeedItem, type FanviewFeedItem } from "@/lib/fanview";

interface Props {
  session: GameSession;
}

interface Summary {
  text: string;
  accent: string;
}

const MUTED = "hsl(var(--border))";

const TONE_ACCENT: Record<FanviewFeedItem["tone"], string> = {
  kill: "#39FF14",
  error: "#FF4D4D",
  score: "#00B4FF",
  rotation: "#00B4FF",
  set: "#8B5CF6",
  libero: "#00ACC1",
  neutral: MUTED,
};

export function LastActionLine({ session }: Props) {
  const events = session.events;

  // Find the most recent event that produces a fan-facing message.
  // Prefer descriptive STAT/LIBERO_SUB/SUB/TIMEOUT events over the bare SCORE
  // bookkeeping event that the store appends after a point. If the most recent
  // event is a SCORE, look back through events at the same score to find a
  // richer description (kill, dump kill, block, ace, error, setting error,
  // dump error, dug, etc.) and surface that instead.
  let lastSummary: Summary | null = null;
  for (let i = events.length - 1; i >= 0; i--) {
    const ev = events[i];
    const item = eventToFeedItem(session, ev);
    if (!item) continue;

    if (ev.type === "SCORE") {
      // Look backward for a richer event tied to this same point.
      for (let j = i - 1; j >= 0; j--) {
        const prev = events[j];
        // Stop searching once we cross into an earlier point.
        if (prev.type === "SCORE" || prev.type === "SET_END") break;
        if (
          prev.homeScore !== ev.homeScore ||
          prev.awayScore !== ev.awayScore
        ) {
          // Different score snapshot — these belong to the prior rally.
          break;
        }
        const richer = eventToFeedItem(session, prev);
        if (
          richer &&
          (prev.type === "STAT" ||
            prev.type === "LIBERO_SUB" ||
            prev.type === "SUB" ||
            prev.type === "TIMEOUT")
        ) {
          lastSummary = {
            text: richer.message,
            accent: TONE_ACCENT[richer.tone] ?? MUTED,
          };
          break;
        }
      }
    }

    if (!lastSummary) {
      lastSummary = { text: item.message, accent: TONE_ACCENT[item.tone] ?? MUTED };
    }
    break;
  }

  const prevCountRef = useRef(events.length);
  const [undoFlash, setUndoFlash] = useState<Summary | null>(null);
  const lastSeenSummaryRef = useRef<Summary | null>(null);

  useEffect(() => {
    const prevCount = prevCountRef.current;
    if (events.length < prevCount && lastSeenSummaryRef.current) {
      setUndoFlash({
        text: `↩ Undone — ${lastSeenSummaryRef.current.text}`,
        accent: "#FF4D4D",
      });
      const t = window.setTimeout(() => setUndoFlash(null), 600);
      prevCountRef.current = events.length;
      return () => window.clearTimeout(t);
    }
    prevCountRef.current = events.length;
  }, [events.length]);

  const summary: Summary = lastSummary ?? {
    text: "No actions recorded yet",
    accent: MUTED,
  };

  useEffect(() => {
    if (lastSummary) lastSeenSummaryRef.current = lastSummary;
  }, [lastSummary?.text]);

  const display = undoFlash ?? summary;
  const isEmpty = !lastSummary && !undoFlash;

  return (
    <div
      key={display.text}
      className="mx-4 mt-3 flex h-9 items-center gap-2.5 rounded-xl border border-border bg-card px-3 animate-in fade-in duration-200"
    >
      <span
        aria-hidden
        className="h-5 w-[3px] shrink-0 rounded-full"
        style={{ backgroundColor: display.accent }}
      />
      <span
        className={`truncate text-[13px] text-muted-foreground ${isEmpty ? "italic" : ""}`}
      >
        {display.text}
      </span>
    </div>
  );
}
