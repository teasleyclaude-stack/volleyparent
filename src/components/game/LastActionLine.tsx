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
  let lastSummary: Summary | null = null;
  for (let i = events.length - 1; i >= 0; i--) {
    const item = eventToFeedItem(session, events[i]);
    if (item) {
      lastSummary = { text: item.message, accent: TONE_ACCENT[item.tone] ?? MUTED };
      break;
    }
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
