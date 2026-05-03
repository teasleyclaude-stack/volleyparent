import { useEffect, useRef, useState } from "react";
import type { GameSession, MatchEvent, Player } from "@/types";
import { ERROR_TYPE_LABELS } from "@/types";

interface Props {
  session: GameSession;
}

interface Summary {
  text: string;
  accent: string;
}

const MUTED = "hsl(var(--border))";

function shortName(p: Player | undefined): string {
  if (!p) return "Player";
  const parts = p.name.trim().split(/\s+/);
  const first = parts[0] ?? "";
  const lastInit = parts[1] ? ` ${parts[1][0]}.` : "";
  return `${first}${lastInit}`;
}

function teamName(session: GameSession, team: "home" | "away"): string {
  return team === "home" ? session.homeTeam : session.awayTeam;
}

function summarize(ev: MatchEvent, prev: MatchEvent | undefined, session: GameSession): Summary {
  const player = ev.playerId ? session.roster.find((p) => p.id === ev.playerId) : undefined;
  const name = shortName(player);

  switch (ev.type) {
    case "SCORE": {
      const team = ev.scoringTeam ?? "home";
      const tName = teamName(session, team);
      const prevServingHome = prev?.isHomeServing ?? ev.isHomeServing;
      const sideOut = prevServingHome !== ev.isHomeServing;
      if (sideOut) {
        return { text: `Side out — ${tName} scored, rotation fired`, accent: "#00B4FF" };
      }
      // Serve point
      const serverId = ev.isHomeServing
        ? ev.homeRotationState[0]
        : ev.awayRotationState[0];
      const server = session.roster.find((p) => p.id === serverId);
      const serverLabel = server ? shortName(server) : tName;
      return { text: `${tName} scored — ${serverLabel} still serving`, accent: "#FBBF24" };
    }

    case "STAT": {
      const stat = ev.statType;
      switch (stat) {
        case "kill":
          return {
            text: ev.killZone ? `${name} kill — Zone ${ev.killZone}` : `${name} kill recorded`,
            accent: "#39FF14",
          };
        case "dug":
          return { text: `${name} attack dug by opponent`, accent: "#FB923C" };
        case "error": {
          const label = ev.errorType ? ERROR_TYPE_LABELS[ev.errorType].toLowerCase() : "error";
          return { text: `${name} ${label}`, accent: "#FF4D4D" };
        }
        case "dig":
          return { text: `${name} dig`, accent: "#00B4FF" };
        case "block":
          return { text: `${name} block`, accent: "#F59E0B" };
        case "ace":
          return { text: `${name} ace!`, accent: "#39FF14" };
        case "assist": {
          const killer = ev.killerId
            ? session.roster.find((p) => p.id === ev.killerId)
            : undefined;
          if (killer) {
            return {
              text: `${name} assist → ${shortName(killer)} kill`,
              accent: "#8B5CF6",
            };
          }
          return { text: `${name} assist`, accent: "#8B5CF6" };
        }
        case "dump_kill":
          return {
            text: ev.killZone
              ? `${name} dump kill — Zone ${ev.killZone}`
              : `${name} dump kill`,
            accent: "#39FF14",
          };
        case "dump_error":
          return { text: `${name} dump error`, accent: "#FF4D4D" };
        case "setting_error":
          return { text: `${name} setting error`, accent: "#FF4D4D" };
        case "pass": {
          const g = ev.passGrade ?? 0;
          if (g === 3) return { text: `${name} perfect pass (3)`, accent: "#39FF14" };
          if (g === 2) return { text: `${name} good pass (2)`, accent: "#00B4FF" };
          if (g === 1) return { text: `${name} poor pass (1)`, accent: "#F59E0B" };
          return { text: `${name} passing error (0)`, accent: "#FF4D4D" };
        }
        default:
          return { text: `${name} ${stat ?? "stat"}`, accent: MUTED };
      }
    }

    case "SUB": {
      const inP = session.roster.find((p) => p.id === ev.subInId);
      const outP = session.roster.find((p) => p.id === ev.subOutId);
      return {
        text: `Sub — ${shortName(inP)} in for ${shortName(outP)}`,
        accent: MUTED,
      };
    }

    case "LIBERO_SUB": {
      const lib = session.roster.find((p) => p.id === ev.liberoId);
      const partner = session.roster.find((p) => p.id === ev.liberoPartnerOutId);
      if (ev.liberoDirection === "in") {
        return {
          text: `${shortName(lib)} back in for ${shortName(partner)} (Libero)`,
          accent: "#00ACC1",
        };
      }
      return {
        text: `Libero sub — ${shortName(partner)} out for ${shortName(lib)}`,
        accent: "#00ACC1",
      };
    }

    case "TIMEOUT": {
      const team = ev.timeoutTeam ?? "home";
      const used =
        team === "home" ? session.homeTimeoutsThisSet : session.awayTimeoutsThisSet;
      const remaining = Math.max(0, 2 - used);
      return {
        text: `Timeout — ${teamName(session, team)} (${remaining} remaining)`,
        accent: MUTED,
      };
    }

    case "SCORE_CORRECTION": {
      const team = ev.correctionTeam ?? "home";
      const score = team === "home" ? ev.homeScore : ev.awayScore;
      const was = score - (ev.delta ?? 0);
      return {
        text: `Score corrected — ${teamName(session, team)} ${score} (was ${was})`,
        accent: "#FF4D4D",
      };
    }

    case "SET_END":
      return {
        text: `Set ${ev.setNumber} complete — ${session.homeTeam} ${ev.homeScore}, ${session.awayTeam} ${ev.awayScore}`,
        accent: "#8B5CF6",
      };

    case "TRACKING_CHANGE": {
      const newP = session.roster.find((p) => p.id === ev.newTrackedId);
      return {
        text: `Now tracking ${shortName(newP)} — ${prev?.type === "SET_END" ? `Set ${ev.setNumber} begins` : "mid-set change"}`,
        accent: "#8B5CF6",
      };
    }

    default:
      return { text: "Action recorded", accent: MUTED };
  }
}

export function LastActionLine({ session }: Props) {
  const events = session.events;
  const last = events[events.length - 1];
  const prev = events[events.length - 2];

  const prevCountRef = useRef(events.length);
  const [undoFlash, setUndoFlash] = useState<Summary | null>(null);
  const lastSeenSummaryRef = useRef<Summary | null>(null);

  // Detect undo: event count decreased.
  useEffect(() => {
    const prevCount = prevCountRef.current;
    if (events.length < prevCount && lastSeenSummaryRef.current) {
      setUndoFlash({
        text: `↩ Undone — ${lastSeenSummaryRef.current.text.replace(/^↩\s*Undone\s*—\s*/, "")}`,
        accent: "#FF4D4D",
      });
      const t = window.setTimeout(() => setUndoFlash(null), 600);
      prevCountRef.current = events.length;
      return () => window.clearTimeout(t);
    }
    prevCountRef.current = events.length;
  }, [events.length]);

  const summary: Summary = last
    ? summarize(last, prev, session)
    : { text: "No actions recorded yet", accent: MUTED };

  // Track the most recently displayed (non-undo) summary so we can show what was undone.
  useEffect(() => {
    if (last) lastSeenSummaryRef.current = summary;
  }, [last?.id, summary.text]);

  const display = undoFlash ?? summary;
  const isEmpty = !last && !undoFlash;

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
