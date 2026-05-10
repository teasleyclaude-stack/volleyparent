/**
 * Team perspective selectors — single source of truth for "us vs them".
 *
 * Storage keeps home/away (volleyball needs it for serve/court conventions).
 * UI and stats should route through these selectors so logic stays correct
 * regardless of which side the user picked.
 */
import type { GameSession, RotationState } from "@/types";

export type Side = "home" | "away";

export const ourSide = (s: { isHomeTeam: boolean }): Side => (s.isHomeTeam ? "home" : "away");
export const oppSide = (s: { isHomeTeam: boolean }): Side => (s.isHomeTeam ? "away" : "home");

export const ourScore = (s: GameSession): number => (s.isHomeTeam ? s.homeScore : s.awayScore);
export const oppScore = (s: GameSession): number => (s.isHomeTeam ? s.awayScore : s.homeScore);

export const ourRotation = (s: GameSession): RotationState =>
  s.isHomeTeam ? s.homeRotationState : s.awayRotationState;
export const oppRotation = (s: GameSession): RotationState =>
  s.isHomeTeam ? s.awayRotationState : s.homeRotationState;

export const weServe = (s: GameSession): boolean => s.isHomeServing === s.isHomeTeam;

export const ourTeamName = (s: GameSession): string => (s.isHomeTeam ? s.homeTeam : s.awayTeam);
export const oppTeamName = (s: GameSession): string => (s.isHomeTeam ? s.awayTeam : s.homeTeam);

export const ourColor = (s: GameSession): string => (s.isHomeTeam ? s.homeColor : s.awayColor);
export const oppColor = (s: GameSession): string => (s.isHomeTeam ? s.awayColor : s.homeColor);

export const ourSetsWon = (s: GameSession): number =>
  s.completedSets.filter((x) => (x.homeScore > x.awayScore) === s.isHomeTeam).length;
export const oppSetsWon = (s: GameSession): number =>
  s.completedSets.filter((x) => (x.awayScore > x.homeScore) === s.isHomeTeam).length;

export const ourTimeouts = (s: GameSession): number =>
  s.isHomeTeam ? s.homeTimeoutsThisSet : s.awayTimeoutsThisSet;

/** Maps a raw home/away side to "ours"/"opp" from the user's perspective. */
export const sideToOurs = (s: { isHomeTeam: boolean }, side: Side): "ours" | "opp" =>
  side === ourSide(s) ? "ours" : "opp";

/**
 * Display-friendly labels with fallbacks. When the team name is empty,
 * falls back to "My Team" / "Opponent" so the UI never shows "Home"/"Away"
 * (which is what users found confusing when they were the away team).
 */
export const ourTeamLabel = (s: GameSession): string => ourTeamName(s) || "My Team";
export const oppTeamLabel = (s: GameSession): string => oppTeamName(s) || "Opponent";

/** Same fallback logic but driven by raw home/away side. */
export const homeLabel = (
  s: Pick<GameSession, "isHomeTeam" | "homeTeam">,
): string => s.homeTeam || (s.isHomeTeam ? "My Team" : "Opponent");
export const awayLabel = (
  s: Pick<GameSession, "isHomeTeam" | "awayTeam">,
): string => s.awayTeam || (s.isHomeTeam ? "Opponent" : "My Team");
