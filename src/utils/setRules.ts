/**
 * Volleyball set + match rules.
 * - Format-aware: 'club' (best of 3) or 'highschool' (best of 5).
 * - Non-deciding sets play to 25; the deciding set plays to 15.
 * - Must win by 2 — no score cap. 25-24, 26-25, 27-26… all keep playing.
 */

import type { MatchFormat } from "@/types";

export function maxSets(matchFormat: MatchFormat): number {
  return matchFormat === "club" ? 3 : 5;
}

export function setsToWin(matchFormat: MatchFormat): number {
  return matchFormat === "club" ? 2 : 3;
}

export function decidingSet(matchFormat: MatchFormat): number {
  return matchFormat === "club" ? 3 : 5;
}

export function setTarget(setNumber: number, matchFormat: MatchFormat): number {
  return setNumber === decidingSet(matchFormat) ? 15 : 25;
}

export function checkSetWon(
  homeScore: number,
  awayScore: number,
  setNumber: number,
  matchFormat: MatchFormat,
): "home" | "away" | null {
  const target = setTarget(setNumber, matchFormat);
  const higher = Math.max(homeScore, awayScore);
  const lead = Math.abs(homeScore - awayScore);
  if (higher < target) return null;
  if (lead < 2) return null;
  return homeScore > awayScore ? "home" : "away";
}

export function checkMatchWon(
  homeSetsWon: number,
  awaySetsWon: number,
  matchFormat: MatchFormat,
): "home" | "away" | null {
  const need = setsToWin(matchFormat);
  if (homeSetsWon >= need) return "home";
  if (awaySetsWon >= need) return "away";
  return null;
}

export interface SetLabel {
  text: string;
  /** CSS color string. Use `null` to fall back to the default muted token. */
  color: string | null;
}

export function getSetLabel(
  homeScore: number,
  awayScore: number,
  setNumber: number,
  matchFormat: MatchFormat,
): SetLabel {
  const target = setTarget(setNumber, matchFormat);
  const higher = Math.max(homeScore, awayScore);
  const lead = Math.abs(homeScore - awayScore);
  if (higher >= target && lead < 2) {
    return { text: "WIN BY 2", color: "#FF4D4D" };
  }
  if (setNumber === decidingSet(matchFormat)) {
    return { text: "TO 15", color: "#F59E0B" };
  }
  return { text: `TO ${target}`, color: null };
}

export const formatLabel = (matchFormat: MatchFormat): string =>
  matchFormat === "club" ? "Club" : "High School";

export const formatLabelShort = (matchFormat: MatchFormat): string =>
  matchFormat === "club" ? "CLUB" : "HS";
