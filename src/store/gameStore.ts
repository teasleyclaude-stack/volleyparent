import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  GameSession,
  KillZone,
  MatchEvent,
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
    isHomeTeam: boolean;
    roster: Player[];
    rotation: RotationState;
    isHomeServing: boolean;
  }) => void;

  addPoint: (team: "home" | "away") => void;
  recordStat: (playerId: string, stat: StatType, killZone?: KillZone | null) => void;
  recordTimeout: (team: "home" | "away") => void;
  makeSubstitution: (benchPlayerId: string, courtPositionIndex: number) => void;
  correctScore: (team: "home" | "away") => void;
  setRotation: (rotation: RotationState) => void;
  undoLastAction: () => void;
  endSet: () => void;
  endGame: () => void;
  clearSession: () => void;
}

const snapshot = (s: GameSession) => ({
  setNumber: s.currentSet,
  homeScore: s.homeScore,
  awayScore: s.awayScore,
  rotationState: [...s.rotationState] as RotationState,
  isHomeServing: s.isHomeServing,
});

const pushEvent = (s: GameSession, e: Omit<MatchEvent, "id" | "timestamp">) => {
  const ev: MatchEvent = { ...e, id: uid(), timestamp: Date.now() };
  s.events.push(ev);
};

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      session: null,

      startSession: ({ homeTeam, awayTeam, isHomeTeam, roster, rotation, isHomeServing }) => {
        const s: GameSession = {
          id: uid(),
          date: new Date().toISOString(),
          homeTeam,
          awayTeam,
          isHomeTeam,
          currentSet: 1,
          homeScore: 0,
          awayScore: 0,
          isHomeServing,
          rotationState: rotation,
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
        const wasServing = (team === "home") === s.isHomeServing;
        const beforeSnap = snapshot(s);

        if (team === "home") s.homeScore += 1;
        else s.awayScore += 1;

        if (!wasServing) {
          s.isHomeServing = team === "home";
          s.rotationState = applyRotation(s.rotationState);
        }

        pushEvent(s, {
          type: "SCORE",
          scoringTeam: team,
          setNumber: beforeSnap.setNumber,
          homeScore: s.homeScore,
          awayScore: s.awayScore,
          rotationState: s.rotationState,
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
          rotationState: s.rotationState,
          isHomeServing: s.isHomeServing,
        });

        set({ session: s });

        // Kill / Ace also score a point for our team. Error scores for opponent.
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
          rotationState: s.rotationState,
          isHomeServing: s.isHomeServing,
        });
        set({ session: s });
      },

      makeSubstitution: (benchPlayerId, courtPositionIndex) => {
        const cur = get().session;
        if (!cur) return;
        const s: GameSession = JSON.parse(JSON.stringify(cur));
        const outId = s.rotationState[courtPositionIndex];
        if (!outId || outId === benchPlayerId) return;
        const newRot = [...s.rotationState] as RotationState;
        newRot[courtPositionIndex] = benchPlayerId;
        s.rotationState = newRot;
        pushEvent(s, {
          type: "SUB",
          subInId: benchPlayerId,
          subOutId: outId,
          subPosition: courtPositionIndex,
          setNumber: s.currentSet,
          homeScore: s.homeScore,
          awayScore: s.awayScore,
          rotationState: s.rotationState,
          isHomeServing: s.isHomeServing,
        });
        set({ session: s });
      },

      undoLastAction: () => {
        const cur = get().session;
        if (!cur || cur.events.length === 0) return;
        const s: GameSession = JSON.parse(JSON.stringify(cur));
        const last = s.events.pop()!;

        // Reverse stat effect on player
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
          // If kill/ace/error, also undo the linked SCORE event that follows
          if (last.statType === "kill" || last.statType === "ace" || last.statType === "error") {
            // The score event was pushed AFTER the stat event; but we already popped the stat.
            // The score event is now the new last — pop again.
            // (Stat was added, then addPoint added a SCORE — so order in array is: stat, score.
            // We popped first; that removed the SCORE. Now we need to also reverse it.)
          }
        }

        // Reverse score
        if (last.type === "SCORE" && last.scoringTeam) {
          // Find prior snapshot to restore from earlier event (or initial zero)
          const prior = [...s.events].reverse().find(() => true);
          if (prior) {
            s.homeScore = prior.homeScore;
            s.awayScore = prior.awayScore;
            s.rotationState = [...prior.rotationState] as RotationState;
            s.isHomeServing = prior.isHomeServing;
            s.currentSet = prior.setNumber;
          } else {
            s.homeScore = 0;
            s.awayScore = 0;
          }
          // If the event before was a STAT linked to this score, also pop it
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
          const newRot = [...s.rotationState] as RotationState;
          newRot[last.subPosition] = last.subOutId;
          s.rotationState = newRot;
        }

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
          rotationState: s.rotationState,
          isHomeServing: s.isHomeServing,
        });
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
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? window.localStorage
          : ({ getItem: () => null, setItem: () => {}, removeItem: () => {} } as unknown as Storage),
      ),
    },
  ),
);
