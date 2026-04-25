import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGameStore } from "@/store/gameStore";
import {
  buildFeed,
  buildMeta,
  buildState,
  buildSummary,
  fanviewUrl,
  gameEndFeedItem,
} from "@/lib/fanview";

const ACTIVE_KEY = "volleyparent-fanview-active";

interface ActiveMap {
  [sessionId: string]: boolean;
}

function readActive(): ActiveMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(ACTIVE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeActive(map: ActiveMap) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACTIVE_KEY, JSON.stringify(map));
}

export function useFanview() {
  const session = useGameStore((s) => s.session);
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const lastEventCountRef = useRef(0);
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-hydrate active flag for current session
  useEffect(() => {
    if (!session) {
      setActive(false);
      return;
    }
    const map = readActive();
    setActive(Boolean(map[session.id]));
    lastEventCountRef.current = session.events.length;
  }, [session?.id]);

  const persistActive = useCallback((sessionId: string, value: boolean) => {
    const map = readActive();
    if (value) map[sessionId] = true;
    else delete map[sessionId];
    writeActive(map);
  }, []);

  const pushNow = useCallback(async () => {
    if (!session) return;
    const map = readActive();
    if (!map[session.id]) return;
    const state = buildState(session);
    const feed = buildFeed(session);
    await supabase
      .from("fanview_sessions")
      .update({
        state: state as never,
        feed: feed as never,
        is_live: state.isLive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.id);
  }, [session]);

  // Debounced live sync on every session change
  useEffect(() => {
    if (!session) return;
    const map = readActive();
    if (!map[session.id]) return;
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(() => {
      pushNow().catch((e) => console.error("fanview push failed", e));
    }, 350);
    return () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    };
  }, [session, pushNow]);

  const start = useCallback(async () => {
    if (!session) return null;
    setBusy(true);
    try {
      const meta = buildMeta(session);
      const state = buildState(session);
      const feed = buildFeed(session);
      const { error } = await supabase.from("fanview_sessions").upsert({
        id: session.id,
        meta: meta as never,
        state: state as never,
        feed: feed as never,
        is_live: true,
        summary: null,
        updated_at: new Date().toISOString(),
      });
      if (error) {
        console.error("fanview start failed", error);
        setBusy(false);
        return null;
      }
      persistActive(session.id, true);
      setActive(true);
      setBusy(false);
      return fanviewUrl(session.id);
    } catch (e) {
      console.error(e);
      setBusy(false);
      return null;
    }
  }, [session, persistActive]);

  const stop = useCallback(async () => {
    if (!session) return;
    setBusy(true);
    try {
      await supabase
        .from("fanview_sessions")
        .update({ is_live: false, updated_at: new Date().toISOString() })
        .eq("id", session.id);
    } finally {
      persistActive(session.id, false);
      setActive(false);
      setBusy(false);
    }
  }, [session, persistActive]);

  const finalize = useCallback(async () => {
    if (!session) return;
    const map = readActive();
    if (!map[session.id]) return;
    const finalState = buildState(session);
    finalState.isLive = false;
    const feed = buildFeed(session);
    feed.push(gameEndFeedItem(session));
    const summary = buildSummary(session);
    await supabase
      .from("fanview_sessions")
      .update({
        state: finalState as never,
        feed: feed as never,
        summary: summary as never,
        is_live: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.id);
  }, [session]);

  const share = useCallback(
    async (url: string) => {
      if (!session) return;
      const text = `Follow ${session.homeTeam} live! 🏐`;
      try {
        if (typeof navigator !== "undefined" && "share" in navigator) {
          await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share({
            title: "VolleyParent FanView",
            text,
            url,
          });
          return;
        }
      } catch {
        /* user dismissed */
      }
      try {
        if (typeof navigator !== "undefined" && navigator.clipboard) {
          await navigator.clipboard.writeText(url);
        }
      } catch {
        /* noop */
      }
    },
    [session],
  );

  return { active, busy, start, stop, share, finalize, pushNow };
}
