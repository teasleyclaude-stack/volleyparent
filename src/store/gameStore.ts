import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { toast } from "sonner";
import {
  BACK_ROW_INDICES,
  FRONT_ROW_INDICES,
  isLibero,
} from "@/types";
import type {
  GameSession,
  KillZone,
  MatchEvent,
  MatchFormat,
  Player,
  RotationState,
  StatType,
} from "@/types";
import { applyRotation, reverseRotation, uid } from "@/utils/stats";

interface GameStore {
  session: GameSession | null;

  startSession: (args: {
    homeTeam: string;
    awayTeam: string;
    homeColor: string;
    awayColor: string;
    isHomeTeam: boolean;
    matchFormat: MatchFormat;
    roster: Player[];
    homeRotation: RotationState;
    awayRotation: RotationState;
    isHomeServing: boolean;
  }) => void;

  addPoint: (team: "home" | "away") => void;
  recordStat: (playerId: string, stat: StatType, killZone?: KillZone | null) => void;
  recordTimeout: (team: "home" | "away") => void;
  makeSubstitution: (benchPlayerId: string, courtPositionIndex: number) => void;
  correctScore: (team: "home" | "away") => void;
  /** Overwrite one team's rotation tuple (used by lineup modal & auto-repair). */
  setRotation: (team: "home" | "away", rotation: RotationState) => void;
  /** Resolve a pending Libero front-row violation by selecting which front-row player they replace. */
  confirmLiberoSub: (subOutPlayerId: string) => void;
  undoLastAction: () => void;
  endSet: () => void;
  endGame: () => void;
  clearSession: () => void;
}

const snapshot = (s: GameSession) => ({
  setNumber: s.currentSet,
  homeScore: s.homeScore,
  awayScore: s.awayScore,
  homeRotationState: [...s.homeRotationState] as RotationState,
  awayRotationState: [...s.awayRotationState] as RotationState,
  isHomeServing: s.isHomeServing,
});

const pushEvent = (s: GameSession, e: Omit<MatchEvent, "id" | "timestamp">) => {
  const ev: MatchEvent = { ...e, id: uid(), timestamp: Date.now() };
  s.events.push(ev);
};

/** If a Libero is in any front-row index of the rotation, return the (firstViolating)
 *  rotation index and the Libero's player id. */
function findLiberoFrontRowViolation(
  rotation: RotationState,
  roster: Player[],
): { rotationIndex: number; liberoId: string } | null {
  for (const idx of FRONT_ROW_INDICES) {
    const p = roster.find((r) => r.id === rotation[idx]);
    if (p && isLibero(p)) return { rotationIndex: idx, liberoId: p.id };
  }
  return null;
}

/** If any benched Libero's remembered partner is now in a back-row slot,
 *  swap the Libero back in. Returns updated rotation + sub info, or null. */
function maybeAutoLiberoReturn(
  rotation: RotationState,
  roster: Player[],
): { rotation: RotationState; liberoId: string; partnerOutId: string; rotationIndex: number } | null {
  const onCourt = new Set(rotation);
  const liberos = roster.filter(
    (p) => isLibero(p) && p.liberoPartnerId && !onCourt.has(p.id),
  );
  for (const lib of liberos) {
    const partnerId = lib.liberoPartnerId!;
    const partnerIdx = rotation.indexOf(partnerId);
    if (partnerIdx === -1) continue;
    if ((BACK_ROW_INDICES as readonly number[]).includes(partnerIdx)) {
      const next = [...rotation] as RotationState;
      next[partnerIdx] = lib.id;
      return { rotation: next, liberoId: lib.id, partnerOutId: partnerId, rotationIndex: partnerIdx };
    }
  }
  return null;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      session: null,

      startSession: ({
        homeTeam,
        awayTeam,
        homeColor,
        awayColor,
        isHomeTeam,
        matchFormat,
        roster,
        homeRotation,
        awayRotation,
        isHomeServing,
      }) => {
        const s: GameSession = {
          id: uid(),
          date: new Date().toISOString(),
          homeTeam,
          awayTeam,
          homeColor,
          awayColor,
          isHomeTeam,
          matchFormat,
          currentSet: 1,
          homeScore: 0,
          awayScore: 0,
          isHomeServing,
          homeRotationState: homeRotation,
          awayRotationState: awayRotation,
          roster: roster.map((p) => ({
            ...p,
            stats: { kills: 0, errors: 0, totalAttempts: 0, digs: 0, blocks: 0, aces: 0, assists: 0, dugAttempts: 0 },
          })),
          events: [],
          completedSets: [],
          homeTimeoutsThisSet: 0,
          awayTimeoutsThisSet: 0,
          isCompleted: false,
        };
        set({ session: s });
      },

      addPoint: (team) => {
        const cur = get().session;
        if (!cur) return;
        const s: GameSession = JSON.parse(JSON.stringify(cur));
        const winnerWasServing = (team === "home") === s.isHomeServing;

        if (team === "home") s.homeScore += 1;
        else s.awayScore += 1;

        if (!winnerWasServing) {
          // Side-out: the receiving team just earned the serve.
          // ONLY the winning team rotates THEIR OWN lineup. The other team is unchanged.
          if (team === "home") {
            s.homeRotationState = applyRotation(s.homeRotationState);
          } else {
            s.awayRotationState = applyRotation(s.awayRotationState);
          }
          s.isHomeServing = team === "home";
        }
        // Else: serve point — no rotation, no serve change, just the score update above.

        pushEvent(s, {
          type: "SCORE",
          scoringTeam: team,
          setNumber: s.currentSet,
          homeScore: s.homeScore,
          awayScore: s.awayScore,
          homeRotationState: s.homeRotationState,
          awayRotationState: s.awayRotationState,
          isHomeServing: s.isHomeServing,
        });
        set({ session: s });
      },

      recordStat: (playerId, stat, killZone = null) => {
        const cur = get().session;
        if (!cur) return;
        const s: GameSession = JSON.parse(JSON.stringify(cur));
        const player = s.roster.find((p) => p.id === playerId);
        if (!player) return;

        if (stat === "kill") {
          player.stats.kills += 1;
          player.stats.totalAttempts += 1;
        } else if (stat === "error") {
          player.stats.errors += 1;
          player.stats.totalAttempts += 1;
        } else if (stat === "dug") {
          player.stats.dugAttempts += 1;
          player.stats.totalAttempts += 1;
        } else if (stat === "dig") player.stats.digs += 1;
        else if (stat === "block") player.stats.blocks += 1;
        else if (stat === "ace") player.stats.aces += 1;
        else if (stat === "assist") player.stats.assists += 1;

        pushEvent(s, {
          type: "STAT",
          playerId,
          statType: stat,
          killZone: killZone ?? null,
          setNumber: s.currentSet,
          homeScore: s.homeScore,
          awayScore: s.awayScore,
          homeRotationState: s.homeRotationState,
          awayRotationState: s.awayRotationState,
          isHomeServing: s.isHomeServing,
        });

        set({ session: s });

        if (stat === "kill" || stat === "ace") {
          get().addPoint(s.isHomeTeam ? "home" : "away");
        } else if (stat === "error") {
          get().addPoint(s.isHomeTeam ? "away" : "home");
        }
      },

      recordTimeout: (team) => {
        const cur = get().session;
        if (!cur) return;
        const s: GameSession = JSON.parse(JSON.stringify(cur));
        if (team === "home") {
          if (s.homeTimeoutsThisSet >= 2) return;
          s.homeTimeoutsThisSet += 1;
        } else {
          if (s.awayTimeoutsThisSet >= 2) return;
          s.awayTimeoutsThisSet += 1;
        }
        pushEvent(s, {
          type: "TIMEOUT",
          timeoutTeam: team,
          setNumber: s.currentSet,
          homeScore: s.homeScore,
          awayScore: s.awayScore,
          homeRotationState: s.homeRotationState,
          awayRotationState: s.awayRotationState,
          isHomeServing: s.isHomeServing,
        });
        set({ session: s });
      },

      makeSubstitution: (benchPlayerId, courtPositionIndex) => {
        const cur = get().session;
        if (!cur) return;
        const s: GameSession = JSON.parse(JSON.stringify(cur));
        // Subs only apply to OUR team (the only roster we know).
        const ourKey = s.isHomeTeam ? "homeRotationState" : "awayRotationState";
        const ourRot = s[ourKey];
        const outId = ourRot[courtPositionIndex];
        if (!outId || outId === benchPlayerId) return;
        const newRot = [...ourRot] as RotationState;
        newRot[courtPositionIndex] = benchPlayerId;
        s[ourKey] = newRot;
        pushEvent(s, {
          type: "SUB",
          subInId: benchPlayerId,
          subOutId: outId,
          subPosition: courtPositionIndex,
          setNumber: s.currentSet,
          homeScore: s.homeScore,
          awayScore: s.awayScore,
          homeRotationState: s.homeRotationState,
          awayRotationState: s.awayRotationState,
          isHomeServing: s.isHomeServing,
        });
        set({ session: s });
      },

      correctScore: (team) => {
        const cur = get().session;
        if (!cur) return;
        const current = team === "home" ? cur.homeScore : cur.awayScore;
        if (current <= 0) return;
        const s: GameSession = JSON.parse(JSON.stringify(cur));

        // Detect whether the most recent SCORE for this team was a side-out
        // (i.e. the team that won had not been serving). If so, only that
        // team's rotation needs to be reversed.
        let rotationReversed = false;
        let servingFlipped = false;
        const lastEvent = s.events[s.events.length - 1];
        if (
          lastEvent &&
          lastEvent.type === "SCORE" &&
          lastEvent.scoringTeam === team
        ) {
          let prevIsHomeServing = s.isHomeServing;
          for (let i = s.events.length - 2; i >= 0; i--) {
            const ev = s.events[i];
            if (ev.type === "SCORE" || ev.type === "SET_END") {
              prevIsHomeServing = ev.isHomeServing;
              break;
            }
          }
          if (lastEvent.isHomeServing !== prevIsHomeServing) {
            // It was a side-out — reverse only the winner's rotation.
            if (team === "home") {
              s.homeRotationState = reverseRotation(s.homeRotationState);
            } else {
              s.awayRotationState = reverseRotation(s.awayRotationState);
            }
            s.isHomeServing = prevIsHomeServing;
            rotationReversed = true;
            servingFlipped = true;
          }
        }

        if (team === "home") s.homeScore = Math.max(0, s.homeScore - 1);
        else s.awayScore = Math.max(0, s.awayScore - 1);

        pushEvent(s, {
          type: "SCORE_CORRECTION",
          correctionTeam: team,
          delta: -1,
          rotationReversed,
          servingFlipped,
          setNumber: s.currentSet,
          homeScore: s.homeScore,
          awayScore: s.awayScore,
          homeRotationState: s.homeRotationState,
          awayRotationState: s.awayRotationState,
          isHomeServing: s.isHomeServing,
        });
        set({ session: s });
      },

      setRotation: (team, rotation) => {
        const cur = get().session;
        if (!cur) return;
        const s: GameSession = JSON.parse(JSON.stringify(cur));
        if (team === "home") s.homeRotationState = [...rotation] as RotationState;
        else s.awayRotationState = [...rotation] as RotationState;
        set({ session: s });
      },

      undoLastAction: () => {
        const cur = get().session;
        if (!cur || cur.events.length === 0) return;
        const s: GameSession = JSON.parse(JSON.stringify(cur));
        const last = s.events.pop()!;

        if (last.type === "STAT" && last.playerId && last.statType) {
          const p = s.roster.find((x) => x.id === last.playerId);
          if (p) {
            const st = last.statType;
            if (st === "kill") {
              p.stats.kills = Math.max(0, p.stats.kills - 1);
              p.stats.totalAttempts = Math.max(0, p.stats.totalAttempts - 1);
            } else if (st === "error") {
              p.stats.errors = Math.max(0, p.stats.errors - 1);
              p.stats.totalAttempts = Math.max(0, p.stats.totalAttempts - 1);
            } else if (st === "dug") {
              p.stats.dugAttempts = Math.max(0, p.stats.dugAttempts - 1);
              p.stats.totalAttempts = Math.max(0, p.stats.totalAttempts - 1);
            } else if (st === "dig") p.stats.digs = Math.max(0, p.stats.digs - 1);
            else if (st === "block") p.stats.blocks = Math.max(0, p.stats.blocks - 1);
            else if (st === "ace") p.stats.aces = Math.max(0, p.stats.aces - 1);
            else if (st === "assist") p.stats.assists = Math.max(0, p.stats.assists - 1);
          }
        }

        if (last.type === "SCORE" && last.scoringTeam) {
          const prior = [...s.events].reverse().find(() => true);
          if (prior) {
            s.homeScore = prior.homeScore;
            s.awayScore = prior.awayScore;
            s.homeRotationState = [...prior.homeRotationState] as RotationState;
            s.awayRotationState = [...prior.awayRotationState] as RotationState;
            s.isHomeServing = prior.isHomeServing;
            s.currentSet = prior.setNumber;
          } else {
            s.homeScore = 0;
            s.awayScore = 0;
          }
          const prevTop = s.events[s.events.length - 1];
          if (
            prevTop &&
            prevTop.type === "STAT" &&
            (prevTop.statType === "kill" || prevTop.statType === "ace" || prevTop.statType === "error")
          ) {
            const p = s.roster.find((x) => x.id === prevTop.playerId);
            if (p && prevTop.statType) {
              if (prevTop.statType === "kill") {
                p.stats.kills = Math.max(0, p.stats.kills - 1);
                p.stats.totalAttempts = Math.max(0, p.stats.totalAttempts - 1);
              } else if (prevTop.statType === "ace") {
                p.stats.aces = Math.max(0, p.stats.aces - 1);
              } else if (prevTop.statType === "error") {
                p.stats.errors = Math.max(0, p.stats.errors - 1);
                p.stats.totalAttempts = Math.max(0, p.stats.totalAttempts - 1);
              }
            }
            s.events.pop();
          }
        }

        if (last.type === "TIMEOUT" && last.timeoutTeam) {
          if (last.timeoutTeam === "home") s.homeTimeoutsThisSet = Math.max(0, s.homeTimeoutsThisSet - 1);
          else s.awayTimeoutsThisSet = Math.max(0, s.awayTimeoutsThisSet - 1);
        }

        if (last.type === "SUB" && last.subInId && last.subOutId && last.subPosition !== undefined) {
          const ourKey = s.isHomeTeam ? "homeRotationState" : "awayRotationState";
          const newRot = [...s[ourKey]] as RotationState;
          newRot[last.subPosition] = last.subOutId;
          s[ourKey] = newRot;
        }

        if (last.type === "SCORE_CORRECTION" && last.correctionTeam) {
          if (last.correctionTeam === "home") s.homeScore += 1;
          else s.awayScore += 1;
          if (last.rotationReversed) {
            // Reapply rotation to the team that originally won the side-out
            if (last.correctionTeam === "home") {
              s.homeRotationState = applyRotation(s.homeRotationState);
            } else {
              s.awayRotationState = applyRotation(s.awayRotationState);
            }
          }
          if (last.servingFlipped) {
            s.isHomeServing = !s.isHomeServing;
          }
        }

        // Suppress unused
        void snapshot;

        set({ session: s });
      },

      endSet: () => {
        const cur = get().session;
        if (!cur) return;
        const s: GameSession = JSON.parse(JSON.stringify(cur));
        s.completedSets.push({
          setNumber: s.currentSet,
          homeScore: s.homeScore,
          awayScore: s.awayScore,
        });
        pushEvent(s, {
          type: "SET_END",
          setNumber: s.currentSet,
          homeScore: s.homeScore,
          awayScore: s.awayScore,
          homeRotationState: s.homeRotationState,
          awayRotationState: s.awayRotationState,
          isHomeServing: s.isHomeServing,
        });
        const homeWonSet = s.homeScore > s.awayScore;
        const awayWonSet = s.awayScore > s.homeScore;
        if (homeWonSet) s.isHomeServing = false;
        else if (awayWonSet) s.isHomeServing = true;

        s.currentSet += 1;
        s.homeScore = 0;
        s.awayScore = 0;
        s.homeTimeoutsThisSet = 0;
        s.awayTimeoutsThisSet = 0;
        set({ session: s });
      },

      endGame: () => {
        const cur = get().session;
        if (!cur) return;
        const s: GameSession = JSON.parse(JSON.stringify(cur));
        if (s.homeScore > 0 || s.awayScore > 0) {
          s.completedSets.push({
            setNumber: s.currentSet,
            homeScore: s.homeScore,
            awayScore: s.awayScore,
          });
        }
        s.isCompleted = true;
        set({ session: s });
      },

      clearSession: () => set({ session: null }),
    }),
    {
      name: "volleyparent-active-session",
      version: 3,
      migrate: (persistedState: unknown, version: number) => {
        if (!persistedState || typeof persistedState !== "object") return persistedState;
        const state = persistedState as { session?: Record<string, unknown> | null };
        if (version < 2 && state.session) {
          const sess = state.session as Record<string, unknown>;
          const oldRot = sess.rotationState as RotationState | undefined;
          if (oldRot && !sess.homeRotationState) {
            const placeholder: RotationState = ["opp-1", "opp-2", "opp-3", "opp-4", "opp-5", "opp-6"];
            const isHome = Boolean(sess.isHomeTeam);
            sess.homeRotationState = isHome ? oldRot : placeholder;
            sess.awayRotationState = isHome ? placeholder : oldRot;
            delete sess.rotationState;
            // Rewrite event snapshots
            const events = sess.events as Array<Record<string, unknown>> | undefined;
            if (Array.isArray(events)) {
              for (const ev of events) {
                const r = ev.rotationState as RotationState | undefined;
                if (r && !ev.homeRotationState) {
                  ev.homeRotationState = isHome ? r : placeholder;
                  ev.awayRotationState = isHome ? placeholder : r;
                  delete ev.rotationState;
                }
              }
            }
          }
        }
        // v3 — backfill matchFormat on legacy sessions (default to high school for parity with old best-of-5 rules).
        if (version < 3 && state.session) {
          const sess = state.session as Record<string, unknown>;
          if (!sess.matchFormat) sess.matchFormat = "highschool";
        }
        return persistedState;
      },
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? window.localStorage
          : ({ getItem: () => null, setItem: () => {}, removeItem: () => {} } as unknown as Storage),
      ),
    },
  ),
);
