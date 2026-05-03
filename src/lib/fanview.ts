import type { GameSession, MatchEvent, MatchFormat, Player, RotationState } from "@/types";
import { ERROR_TYPE_LABELS, getPositionGroup, passAverage, dumpHittingPct } from "@/types";
import { hittingPercentage } from "@/utils/stats";

export interface FanviewMeta {
  homeTeam: string;
  awayTeam: string;
  homeColor: string;
  awayColor: string;
  isHomeTeam: boolean;
  matchFormat: MatchFormat;
  trackedPlayer: { name: string; number: number; position: string } | null;
  createdAt: number;
}

export interface FanviewPlayerInfo {
  name: string;
  number: number;
  position: string;
  isTracked: boolean;
}

export interface FanviewTrackedStats {
  kills: number;
  errors: number;
  totalAttempts: number;
  digs: number;
  oppDigs: number;
  blocks: number;
  aces: number;
  hittingPct: string;
  assists: number;
  // Setter
  dumpKills: number;
  settingErrors: number;
  dumpAttempts: number;
  dumpHittingPct: string;
  // Defensive
  passAttempts: number;
  passAvg: string;
  positionGroup: "attacker" | "setter" | "defensive";
  /** True when the tracked player is currently in P1 and their team is serving. */
  isServingNow: boolean;
}

export interface FanviewState {
  isLive: boolean;
  currentSet: number;
  homeScore: number;
  awayScore: number;
  homeSetsWon: number;
  awaySetsWon: number;
  isHomeServing: boolean;
  rotationState: RotationState;
  players: Record<string, FanviewPlayerInfo>;
  trackedStats: FanviewTrackedStats;
  lastUpdated: number;
}

export interface FanviewFeedItem {
  id: string;
  timestamp: number;
  type: MatchEvent["type"] | "GAME_END";
  setNumber: number;
  homeScore: number;
  awayScore: number;
  message: string;
  tone: "kill" | "error" | "score" | "rotation" | "set" | "neutral" | "libero";
  team?: "home" | "away";
}

export interface FanviewSummary {
  winner: string;
  finalScore: {
    homeSetsWon: number;
    awaySetsWon: number;
    sets: { setNumber: number; homeScore: number; awayScore: number }[];
  };
  trackedPlayer: {
    name: string;
    number: number;
    position: string;
    stats: Player["stats"];
    hittingPct: string;
    killsByZone: Record<string, number>;
  } | null;
}

const firstName = (n: string) => n.split(" ")[0] ?? n;

export function buildMeta(session: GameSession): FanviewMeta {
  const tracked = session.roster.find((p) => p.isTracked);
  return {
    homeTeam: session.homeTeam,
    awayTeam: session.awayTeam,
    homeColor: session.homeColor ?? "#F4B400",
    awayColor: session.awayColor ?? "#3B82F6",
    isHomeTeam: session.isHomeTeam,
    matchFormat: session.matchFormat ?? "highschool",
    trackedPlayer: tracked
      ? { name: tracked.name, number: tracked.number, position: tracked.position }
      : null,
    createdAt: Date.now(),
  };
}

export function buildState(session: GameSession): FanviewState {
  const homeSetsWon = session.completedSets.filter((s) => s.homeScore > s.awayScore).length;
  const awaySetsWon = session.completedSets.filter((s) => s.awayScore > s.homeScore).length;
  const tracked = session.roster.find((p) => p.isTracked) ?? session.roster[0];
  const players: Record<string, FanviewPlayerInfo> = {};
  for (const p of session.roster) {
    players[p.id] = {
      name: p.name,
      number: p.number,
      position: p.position,
      isTracked: p.isTracked,
    };
  }
  const ourRotation = session.isHomeTeam ? session.homeRotationState : session.awayRotationState;
  return {
    isLive: !session.isCompleted,
    currentSet: session.currentSet,
    homeScore: session.homeScore,
    awayScore: session.awayScore,
    homeSetsWon,
    awaySetsWon,
    isHomeServing: session.isHomeServing,
    rotationState: ourRotation,
    players,
    trackedStats: {
      kills: tracked?.stats.kills ?? 0,
      errors: tracked?.stats.errors ?? 0,
      totalAttempts: tracked?.stats.totalAttempts ?? 0,
      digs: tracked?.stats.digs ?? 0,
      oppDigs: tracked?.stats.dugAttempts ?? 0,
      blocks: tracked?.stats.blocks ?? 0,
      aces: tracked?.stats.aces ?? 0,
      hittingPct: tracked ? hittingPercentage(tracked.stats) : ".000",
      assists: tracked?.stats.assists ?? 0,
      dumpKills: tracked?.stats.dumpKills ?? 0,
      settingErrors: tracked?.stats.settingErrors ?? 0,
      dumpAttempts: tracked?.stats.dumpAttempts ?? 0,
      dumpHittingPct: tracked ? dumpHittingPct(tracked.stats) : ".000",
      passAttempts: tracked?.stats.passAttempts ?? 0,
      passAvg: tracked ? passAverage(tracked.stats) : "0.00",
      positionGroup: tracked ? getPositionGroup(tracked.position) : "attacker",
      isServingNow:
        !!tracked && session.isHomeServing === session.isHomeTeam && ourRotation[0] === tracked.id,
    },
    lastUpdated: Date.now(),
  };
}

function findPlayer(session: GameSession, id?: string) {
  if (!id) return undefined;
  return session.roster.find((p) => p.id === id);
}

/** Convert a single MatchEvent into a feed item. Returns null to skip. */
export function eventToFeedItem(session: GameSession, ev: MatchEvent): FanviewFeedItem | null {
  const ourTeamName = session.isHomeTeam ? session.homeTeam : session.awayTeam;
  const oppTeamName = session.isHomeTeam ? session.awayTeam : session.homeTeam;
  const tracked = findPlayer(session, ev.playerId);
  const trackedFirst = tracked
    ? `${firstName(tracked.name)} ${tracked.name.split(" ")[1]?.[0] ? tracked.name.split(" ")[1][0] + "." : ""}`.trim()
    : "";
  const base = {
    id: ev.id,
    timestamp: ev.timestamp,
    setNumber: ev.setNumber,
    homeScore: ev.homeScore,
    awayScore: ev.awayScore,
  };

  if (ev.type === "SCORE" && ev.scoringTeam) {
    const teamName = ev.scoringTeam === "home" ? session.homeTeam : session.awayTeam;
    // Side-out: scoring team is not the team that was serving prior to this.
    // We can detect side-out by checking the previous SCORE event's isHomeServing.
    const idx = session.events.findIndex((e) => e.id === ev.id);
    let prevServing = session.isHomeServing;
    for (let i = idx - 1; i >= 0; i--) {
      const e = session.events[i];
      if (e.type === "SCORE" || e.type === "SET_END") {
        prevServing = e.isHomeServing;
        break;
      }
    }
    const wasSideOut = prevServing !== ev.isHomeServing;
    return {
      ...base,
      type: "SCORE",
      message: wasSideOut
        ? `Side out — ${teamName} scores → ${ev.homeScore}-${ev.awayScore}`
        : `${teamName} scores → ${ev.homeScore}-${ev.awayScore}`,
      tone: "score",
      team: ev.scoringTeam,
    };
  }

  if (ev.type === "STAT" && tracked) {
    const hitPct = hittingPercentage(tracked.stats);
    let message = "";
    let tone: FanviewFeedItem["tone"] = "neutral";
    switch (ev.statType) {
      case "kill":
        message = ev.killZone
          ? `⚡ ${trackedFirst} Kill → Zone ${ev.killZone} (Hit%: ${hitPct})`
          : `⚡ ${trackedFirst} Kill (Hit%: ${hitPct})`;
        tone = "kill";
        break;
      case "dig":
        message = `🛡 ${trackedFirst} Dig`;
        tone = "kill";
        break;
      case "block":
        message = `✊ ${trackedFirst} Block`;
        tone = "kill";
        break;
      case "ace":
        message = `🎯 ${trackedFirst} Ace`;
        tone = "kill";
        break;
      case "dug":
        message = `${trackedFirst} attack dug by opponent`;
        tone = "error";
        break;
      case "error": {
        const errLabel = ev.errorType ? ERROR_TYPE_LABELS[ev.errorType] : null;
        if (ev.errorSource === "standalone") {
          message = errLabel
            ? `Error — ${errLabel} (point to ${oppTeamName})`
            : `Error (point to ${oppTeamName})`;
        } else {
          message = errLabel
            ? `${trackedFirst} attack error — ${errLabel}`
            : `${trackedFirst} attack error`;
        }
        tone = "error";
        break;
      }
      case "assist":
        message = `🤝 ${trackedFirst} Assist`;
        tone = "neutral";
        break;
      case "dump_kill":
        message = ev.killZone
          ? `⚡ ${trackedFirst} Dump Kill → Zone ${ev.killZone}`
          : `⚡ ${trackedFirst} Dump Kill`;
        tone = "kill";
        break;
      case "dump_error":
        message = `${trackedFirst} Dump Error (point to ${oppTeamName})`;
        tone = "error";
        break;
      case "setting_error":
        message = `${trackedFirst} Setting Error (point to ${oppTeamName})`;
        tone = "error";
        break;
      case "pass": {
        const grade = ev.passGrade ?? 0;
        const labels: Record<number, string> = {
          3: "Perfect",
          2: "Good",
          1: "Poor",
          0: "Error",
        };
        message = `🎯 ${trackedFirst} Pass — ${grade} (${labels[grade]})`;
        tone = grade >= 2 ? "kill" : grade === 0 ? "error" : "neutral";
        break;
      }
      default:
        return null;
    }
    const ourTeam: "home" | "away" = session.isHomeTeam ? "home" : "away";
    return { ...base, type: "STAT", message, tone, team: ourTeam };
  }

  if (ev.type === "TIMEOUT" && ev.timeoutTeam) {
    const teamName = ev.timeoutTeam === "home" ? session.homeTeam : session.awayTeam;
    const used =
      ev.timeoutTeam === "home" ? session.homeTimeoutsThisSet : session.awayTimeoutsThisSet;
    const remaining = Math.max(0, 2 - used);
    return {
      ...base,
      type: "TIMEOUT",
      message: `Timeout — ${teamName} (${remaining} remaining)`,
      tone: "score",
      team: ev.timeoutTeam,
    };
  }

  if (ev.type === "SUB" && ev.subInId && ev.subOutId) {
    const inP = findPlayer(session, ev.subInId);
    const outP = findPlayer(session, ev.subOutId);
    return {
      ...base,
      type: "SUB",
      message: `Substitution — ${inP ? firstName(inP.name) : "?"} in for ${outP ? firstName(outP.name) : "?"}`,
      tone: "neutral",
    };
  }

  if (ev.type === "SET_END") {
    return {
      ...base,
      type: "SET_END",
      message: `Set ${ev.setNumber} Final: ${session.homeTeam} ${ev.homeScore} — ${session.awayTeam} ${ev.awayScore}`,
      tone: "set",
    };
  }

  if (ev.type === "LIBERO_SUB" && ev.liberoId && ev.liberoPartnerOutId) {
    const lib = findPlayer(session, ev.liberoId);
    const partner = findPlayer(session, ev.liberoPartnerOutId);
    const libName = lib ? firstName(lib.name) : "Libero";
    const partnerName = partner ? firstName(partner.name) : "partner";
    const message =
      ev.liberoDirection === "in"
        ? `${libName} back in for ${partnerName} (Libero)`
        : `${libName} subs out for ${partnerName} (Libero)`;
    return {
      ...base,
      type: "LIBERO_SUB",
      message,
      tone: "libero",
      team: ev.liberoTeam,
    };
  }

  if (ev.type === "TRACKING_CHANGE" && ev.newTrackedId) {
    const newP = findPlayer(session, ev.newTrackedId);
    if (!newP) return null;
    return {
      ...base,
      type: "LIBERO_SUB",
      message: `Now tracking ${firstName(newP.name)} #${newP.number} · ${newP.position}`,
      tone: "libero",
    };
  }

  // Skip score corrections from feed (silent fix)
  return null;
  // Suppress unused var lint
  void ourTeamName;
  void oppTeamName;
}

export function buildFeed(session: GameSession): FanviewFeedItem[] {
  const items: FanviewFeedItem[] = [];
  for (const ev of session.events) {
    const item = eventToFeedItem(session, ev);
    if (item) items.push(item);
  }
  return items;
}

const POINT_CAUSING_STATS = new Set([
  "kill",
  "ace",
  "error",
  "dump_kill",
  "dump_error",
  "setting_error",
  "assist",
]);

export function latestFeedItem(session: GameSession): FanviewFeedItem | null {
  const events = session.events;
  for (let i = events.length - 1; i >= 0; i--) {
    const ev = events[i];
    const item = eventToFeedItem(session, ev);
    if (!item) continue;

    if (ev.type === "SCORE") {
      for (let j = i - 1; j >= 0; j--) {
        const prev = events[j];
        if (prev.type === "SCORE" || prev.type === "SET_END" || prev.type === "SCORE_CORRECTION") {
          break;
        }
        if (prev.type === "STAT" && prev.statType && POINT_CAUSING_STATS.has(prev.statType)) {
          const pointCause = eventToFeedItem(session, prev);
          if (pointCause) return pointCause;
        }
      }
    }

    return item;
  }
  return null;
}

export function buildSummary(session: GameSession): FanviewSummary {
  const homeSetsWon = session.completedSets.filter((s) => s.homeScore > s.awayScore).length;
  const awaySetsWon = session.completedSets.filter((s) => s.awayScore > s.homeScore).length;
  const winner =
    homeSetsWon > awaySetsWon
      ? `${session.homeTeam} wins!`
      : awaySetsWon > homeSetsWon
        ? `${session.awayTeam} wins!`
        : "Match ended";
  const tracked = session.roster.find((p) => p.isTracked) ?? session.roster[0];
  const killsByZone: Record<string, number> = {};
  for (const ev of session.events) {
    if (
      ev.type === "STAT" &&
      ev.statType === "kill" &&
      ev.killZone &&
      ev.playerId === tracked?.id
    ) {
      const k = String(ev.killZone);
      killsByZone[k] = (killsByZone[k] ?? 0) + 1;
    }
  }
  return {
    winner,
    finalScore: {
      homeSetsWon,
      awaySetsWon,
      sets: session.completedSets.map((s) => ({
        setNumber: s.setNumber,
        homeScore: s.homeScore,
        awayScore: s.awayScore,
      })),
    },
    trackedPlayer: tracked
      ? {
          name: tracked.name,
          number: tracked.number,
          position: tracked.position,
          stats: tracked.stats,
          hittingPct: hittingPercentage(tracked.stats),
          killsByZone,
        }
      : null,
  };
}

export function gameEndFeedItem(session: GameSession): FanviewFeedItem {
  const homeSetsWon = session.completedSets.filter((s) => s.homeScore > s.awayScore).length;
  const awaySetsWon = session.completedSets.filter((s) => s.awayScore > s.homeScore).length;
  return {
    id: `gameend-${session.id}`,
    timestamp: Date.now(),
    type: "GAME_END",
    setNumber: session.currentSet,
    homeScore: session.homeScore,
    awayScore: session.awayScore,
    message: `Final: ${session.homeTeam} ${homeSetsWon} sets — ${session.awayTeam} ${awaySetsWon}`,
    tone: "set",
  };
}

export function fanviewUrl(sessionId: string): string {
  if (typeof window === "undefined") return `/fanview/${sessionId}`;
  return `${window.location.origin}/fanview/${sessionId}`;
}
