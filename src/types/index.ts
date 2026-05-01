export type Position = "S" | "MB" | "OH" | "RS" | "L" | "DS";
export type StatType = "kill" | "error" | "dig" | "block" | "ace" | "assist" | "dug";
export type KillZone = 1 | 2 | 3 | 4 | 5 | 6;
export type MatchFormat = "club" | "highschool";

export type ErrorType =
  | "hit_error"
  | "service_error"
  | "net_touch"
  | "blocked"
  | "lift_carry"
  | "foot_fault"
  | "double_contact"
  | "four_touches"
  | "back_row_violation"
  | "reach_over"
  | "rotation_error"
  | "other";

export type ErrorSource = "attempt" | "standalone";

export const ERROR_TYPE_LABELS: Record<ErrorType, string> = {
  hit_error: "Hit Error",
  service_error: "Service Error",
  net_touch: "Net Touch",
  blocked: "Blocked",
  lift_carry: "Lift / Carry",
  foot_fault: "Foot Fault",
  double_contact: "Double Contact",
  four_touches: "Four Touches",
  back_row_violation: "Back Row Violation",
  reach_over: "Reach Over",
  rotation_error: "Rotation Error",
  other: "Other",
};

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
  /** ID of the player this Libero last subbed for in the current set (null = none yet). */
  liberoPartnerId?: string | null;
  stats: PlayerStats;
}

/** Court rotation indices.
 *  0=P1 (back-right/server), 1=P2 (front-right), 2=P3 (front-center),
 *  3=P4 (front-left),       4=P5 (back-left),    5=P6 (back-center).
 */
export const FRONT_ROW_INDICES = [1, 2, 3] as const;
export const BACK_ROW_INDICES = [0, 4, 5] as const;
export function isLibero(p: { position: Position }): boolean {
  return p.position === "L";
}

export type RotationState = [string, string, string, string, string, string];

export type EventType =
  | "STAT"
  | "SCORE"
  | "ROTATION"
  | "SUB"
  | "TIMEOUT"
  | "SET_END"
  | "SCORE_CORRECTION"
  | "LIBERO_SUB";

export interface MatchEvent {
  id: string;
  type: EventType;
  playerId?: string;
  statType?: StatType;
  killZone?: KillZone | null;
  setNumber: number;
  homeScore: number;
  awayScore: number;
  homeRotationState: RotationState;
  awayRotationState: RotationState;
  isHomeServing: boolean;
  scoringTeam?: "home" | "away";
  timestamp: number;
  // for substitutions
  subInId?: string;
  subOutId?: string;
  subPosition?: number;
  // for timeout / score correction
  timeoutTeam?: "home" | "away";
  correctionTeam?: "home" | "away";
  delta?: number;
  rotationReversed?: boolean;
  servingFlipped?: boolean;
  // LIBERO_SUB
  liberoId?: string;
  liberoPartnerOutId?: string;
  liberoRotationIndex?: number;
  liberoDirection?: "out" | "in";
  liberoTeam?: "home" | "away";
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
  homeColor: string;
  awayColor: string;
  isHomeTeam: boolean;
  matchFormat: MatchFormat;
  currentSet: number;
  homeScore: number;
  awayScore: number;
  isHomeServing: boolean;
  homeRotationState: RotationState;
  awayRotationState: RotationState;
  roster: Player[];
  events: MatchEvent[];
  completedSets: SetSummary[];
  homeTimeoutsThisSet: number;
  awayTimeoutsThisSet: number;
  /** Libero subs are unlimited; tracked for stat display only, do not count against regular subs. */
  homeLiberoSubs?: number;
  awayLiberoSubs?: number;
  /** When non-null, the rotation has just been advanced and is awaiting the coach
   *  to choose which front-row player the Libero subs out for. The proposed
   *  rotation has already been committed (Libero sits in the violating front-row
   *  slot) — confirming the sub will swap that slot to the chosen partner. */
  pendingLiberoViolation?: {
    team: "home" | "away";
    liberoId: string;
    rotationIndex: number; // 1, 2, or 3
  } | null;
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
