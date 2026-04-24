export type Position = "S" | "MB" | "OH" | "RS" | "L" | "DS";
export type StatType = "kill" | "error" | "dig" | "block" | "ace" | "assist" | "dug";
export type KillZone = 1 | 2 | 3 | 4 | 5 | 6;

export interface PlayerStats {
  kills: number;
  errors: number;
  totalAttempts: number;
  digs: number;
  blocks: number;
  aces: number;
  assists: number;
  dugAttempts: number;
}

export interface Player {
  id: string;
  name: string;
  number: number;
  position: Position;
  isTracked: boolean;
  stats: PlayerStats;
}

export type RotationState = [string, string, string, string, string, string];

export type EventType = "STAT" | "SCORE" | "ROTATION" | "SUB" | "TIMEOUT" | "SET_END";

export interface MatchEvent {
  id: string;
  type: EventType;
  playerId?: string;
  statType?: StatType;
  killZone?: KillZone | null;
  setNumber: number;
  homeScore: number;
  awayScore: number;
  rotationState: RotationState;
  isHomeServing: boolean;
  scoringTeam?: "home" | "away";
  timestamp: number;
  // for substitutions
  subInId?: string;
  subOutId?: string;
  subPosition?: number;
  // for timeout
  timeoutTeam?: "home" | "away";
}

export interface SetSummary {
  setNumber: number;
  homeScore: number;
  awayScore: number;
}

export interface GameSession {
  id: string;
  date: string;
  homeTeam: string;
  awayTeam: string;
  isHomeTeam: boolean;
  currentSet: number;
  homeScore: number;
  awayScore: number;
  isHomeServing: boolean;
  rotationState: RotationState;
  roster: Player[];
  events: MatchEvent[];
  completedSets: SetSummary[];
  homeTimeoutsThisSet: number;
  awayTimeoutsThisSet: number;
  isCompleted: boolean;
}

export const defaultStats = (): PlayerStats => ({
  kills: 0,
  errors: 0,
  totalAttempts: 0,
  digs: 0,
  blocks: 0,
  aces: 0,
  assists: 0,
  dugAttempts: 0,
});
