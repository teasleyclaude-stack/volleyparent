import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useScoreOnlyStore } from "@/store/scoreOnlyStore";
import type { ScoreOnlySession } from "@/utils/scoreOnly";
import type { MatchFormat } from "@/types";
import { setTarget, isDecidingSet } from "@/utils/setRules";

const ACTIVE_KEY = "courtsideview-fanview-score-active";

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

export interface ScoreOnlyFanviewState {
  isLive: boolean;
  matchFormat: MatchFormat;
  currentSet: number;
  myTeam: string;
  opponent: string;
  myTeamColor: string;
  opponentColor: string;
  myTeamScore: number;
  opponentScore: number;
  myTeamSetsWon: number;
  opponentSetsWon: number;
  myTeamServing: boolean;
  setTarget: number;
  isDeciding: boolean;
  completedSets: ScoreOnlySession["completedSets"];
  lastUpdated: number;
}

export interface ScoreOnlyFanviewMeta {
  mode: "scoreOnly";
  myTeam: string;
  opponent: string;
  myTeamColor: string;
  opponentColor: string;
  matchFormat: MatchFormat;
  createdAt: number;
}

export interface ScoreOnlyFanviewFeedItem {
  id: string;
  timestamp: number;
  type: "SCORE" | "SET_END" | "GAME_END" | "TIMEOUT" | "DECIDING_SERVE";
  message: string;
  team?: "myTeam" | "opponent";
}

function buildState(s: ScoreOnlySession): ScoreOnlyFanviewState {
  return {
    isLive: !s.isCompleted,
    matchFormat: s.matchFormat,
    currentSet: s.currentSet,
    myTeam: s.myTeam,
    opponent: s.opponent,
    myTeamColor: s.myTeamColor,
    opponentColor: s.opponentColor,
    myTeamScore: s.myTeamScore,
    opponentScore: s.opponentScore,
    myTeamSetsWon: s.myTeamSetsWon,
    opponentSetsWon: s.opponentSetsWon,
    myTeamServing: s.myTeamServing,
    setTarget: setTarget(s.currentSet, s.matchFormat),
    isDeciding: isDecidingSet(s.currentSet, s.matchFormat),
    completedSets: s.completedSets,
    lastUpdated: Date.now(),
  };
}

function buildMeta(s: ScoreOnlySession): ScoreOnlyFanviewMeta {
  return {
    mode: "scoreOnly",
    myTeam: s.myTeam,
    opponent: s.opponent,
    myTeamColor: s.myTeamColor,
    opponentColor: s.opponentColor,
    matchFormat: s.matchFormat,
    createdAt: Date.now(),
  };
}

function buildFeed(s: ScoreOnlySession): ScoreOnlyFanviewFeedItem[] {
  const items: ScoreOnlyFanviewFeedItem[] = [];
  let prevServing = true;
  for (const ev of s.events) {
    if (ev.type === "SCORE") {
      const teamName = ev.team === "myTeam" ? s.myTeam : s.opponent;
      const sideOut = prevServing !== ev.myTeamServing;
      items.push({
        id: ev.id,
        timestamp: ev.timestamp,
        type: "SCORE",
        team: ev.team,
        message: sideOut
          ? `Side out — ${teamName} scores → ${ev.myTeamScore}-${ev.opponentScore}`
          : `${teamName} scores → ${ev.myTeamScore}-${ev.opponentScore}`,
      });
      prevServing = ev.myTeamServing;
    } else if (ev.type === "SET_END") {
      const teamName = ev.team === "myTeam" ? s.myTeam : s.opponent;
      items.push({
        id: ev.id,
        timestamp: ev.timestamp,
        type: "SET_END",
        team: ev.team,
        message: `Set ${ev.setNumber} complete — ${teamName} wins ${ev.myTeamScore}-${ev.opponentScore}`,
      });
    } else if (ev.type === "GAME_END") {
      const teamName = ev.team === "myTeam" ? s.myTeam : s.opponent;
      items.push({
        id: ev.id,
        timestamp: ev.timestamp,
        type: "GAME_END",
        team: ev.team,
        message: `Match complete — ${teamName} wins!`,
      });
    } else if (ev.type === "TIMEOUT") {
      const teamName = ev.team === "myTeam" ? s.myTeam : s.opponent;
      items.push({
        id: ev.id,
        timestamp: ev.timestamp,
        type: "TIMEOUT",
        team: ev.team,
        message: `Timeout — ${teamName}`,
      });
    } else if (ev.type === "DECIDING_SERVE") {
      const teamName = ev.team === "myTeam" ? s.myTeam : s.opponent;
      items.push({
        id: ev.id,
        timestamp: ev.timestamp,
        type: "DECIDING_SERVE",
        team: ev.team,
        message: `Deciding set — ${teamName} serves first`,
      });
    }
  }
  return items;
}

export function useScoreOnlyFanview() {
  const session = useScoreOnlyStore((s) => s.session);
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!session) {
      setActive(false);
      return;
    }
    setActive(Boolean(readActive()[session.id]));
  }, [session?.id]);

  const persistActive = useCallback((id: string, value: boolean) => {
    const map = readActive();
    if (value) map[id] = true;
    else delete map[id];
    writeActive(map);
  }, []);

  const pushNow = useCallback(async () => {
    if (!session) return;
    if (!readActive()[session.id]) return;
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

  useEffect(() => {
    if (!session) return;
    if (!readActive()[session.id]) return;
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(() => {
      pushNow().catch((e) => console.error("scoreOnly fanview push failed", e));
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
        console.error("scoreOnly fanview start failed", error);
        setBusy(false);
        return null;
      }
      persistActive(session.id, true);
      setActive(true);
      setBusy(false);
      const url =
        typeof window !== "undefined"
          ? `${window.location.origin}/fanview-score/${session.id}`
          : `/fanview-score/${session.id}`;
      return url;
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
    if (!readActive()[session.id]) return;
    const state = buildState(session);
    state.isLive = false;
    const feed = buildFeed(session);
    await supabase
      .from("fanview_sessions")
      .update({
        state: state as never,
        feed: feed as never,
        is_live: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.id);
  }, [session]);

  const share = useCallback(
    async (url: string) => {
      if (!session) return;
      const text = `Follow ${session.myTeam} live! 🏐`;
      try {
        if (typeof navigator !== "undefined" && "share" in navigator) {
          await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share({
            title: "CourtsideView FanView",
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

  return { active, busy, start, stop, finalize, share, pushNow };
}
