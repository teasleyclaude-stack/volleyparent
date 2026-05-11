import type { MatchFormat } from "@/types";
import { checkSetWon, checkMatchWon, isDecidingSet, setTarget } from "@/utils/setRules";

export type ScoreTeam = "myTeam" | "opponent";

export interface ScoreOnlyCompletedSet {
  setNumber: number;
  myTeamScore: number;
  opponentScore: number;
  winner: ScoreTeam;
}

export type ScoreOnlyEventType =
  | "SCORE"
  | "TIMEOUT"
  | "SET_END"
  | "GAME_END"
  | "DECIDING_SERVE";

export interface ScoreOnlyEvent {
  id: string;
  type: ScoreOnlyEventType;
  team: ScoreTeam;
  myTeamScore: number;
  opponentScore: number;
  myTeamServing: boolean;
  myTeamSetsWon: number;
  opponentSetsWon: number;
  setNumber: number;
  timestamp: number;
  /** Snapshot of timeouts USED prior to this event firing. */
  myTeamTimeoutsUsed: number;
  opponentTimeoutsUsed: number;
}

export interface ScoreOnlySession {
  id: string;
  date: string;
  myTeam: string;
  opponent: string;
  myTeamColor: string;
  opponentColor: string;
  matchFormat: MatchFormat;
  currentSet: number;
  myTeamScore: number;
  opponentScore: number;
  myTeamSetsWon: number;
  opponentSetsWon: number;
  myTeamServing: boolean;
  /** Number USED so far this set (0-2). */
  myTeamTimeouts: number;
  opponentTimeouts: number;
  completedSets: ScoreOnlyCompletedSet[];
  events: ScoreOnlyEvent[];
  isCompleted: boolean;
  pendingDecidingServePrompt?: boolean;
}

export interface ScoreOnlySetup {
  myTeam: string;
  opponent: string;
  myTeamColor: string;
  opponentColor: string;
  matchFormat: MatchFormat;
}

export const DEFAULT_SETUP: ScoreOnlySetup = {
  myTeam: "My Team",
  opponent: "Opponent",
  myTeamColor: "#3B82F6",
  opponentColor: "#EF4444",
  matchFormat: "club",
};

export const SCORE_ONLY_SWATCHES = [
  "#3B82F6", "#EF4444", "#F4B400", "#10B981", "#8B5CF6",
  "#EC4899", "#F97316", "#06B6D4", "#84CC16", "#FFFFFF",
];

export function checkScoreOnlySetWon(s: ScoreOnlySession): ScoreTeam | null {
  const w = checkSetWon(s.myTeamScore, s.opponentScore, s.currentSet, s.matchFormat);
  if (w === "home") return "myTeam";
  if (w === "away") return "opponent";
  return null;
}

export function checkScoreOnlyMatchWon(
  myTeamSetsWon: number,
  opponentSetsWon: number,
  fmt: MatchFormat,
): ScoreTeam | null {
  const w = checkMatchWon(myTeamSetsWon, opponentSetsWon, fmt);
  if (w === "home") return "myTeam";
  if (w === "away") return "opponent";
  return null;
}

export { isDecidingSet, setTarget };
