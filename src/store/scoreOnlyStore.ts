import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  DEFAULT_SETUP,
  type ScoreOnlySession,
  type ScoreOnlySetup,
  type ScoreOnlyEvent,
  type ScoreTeam,
  checkScoreOnlySetWon,
  checkScoreOnlyMatchWon,
} from "@/utils/scoreOnly";

const SESSION_KEY = "courtsideview_scoreonly_session";
const SETUP_KEY = "courtsideview_scoreonly_setup";

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function newSessionFromSetup(setup: ScoreOnlySetup): ScoreOnlySession {
  return {
    id: uid(),
    date: new Date().toISOString(),
    myTeam: setup.myTeam.trim() || "My Team",
    opponent: setup.opponent.trim() || "Opponent",
    myTeamColor: setup.myTeamColor,
    opponentColor: setup.opponentColor,
    matchFormat: setup.matchFormat,
    currentSet: 1,
    myTeamScore: 0,
    opponentScore: 0,
    myTeamSetsWon: 0,
    opponentSetsWon: 0,
    myTeamServing: true,
    myTeamTimeouts: 0,
    opponentTimeouts: 0,
    completedSets: [],
    events: [],
    isCompleted: false,
  };
}

interface ScoreOnlyStore {
  session: ScoreOnlySession | null;
  setup: ScoreOnlySetup;
  setSetup: (next: Partial<ScoreOnlySetup>) => void;
  start: (setup: ScoreOnlySetup) => ScoreOnlySession;
  resume: () => ScoreOnlySession | null;
  addPoint: (team: ScoreTeam) => void;
  removePoint: (team: ScoreTeam) => void;
  takeTimeout: (team: ScoreTeam) => void;
  endSetNow: () => ScoreTeam | null;
  setDecidingFirstServer: (team: ScoreTeam) => void;
  undo: () => void;
  endGame: () => void;
  clear: () => void;
}

function recordEvent(s: ScoreOnlySession, partial: Omit<ScoreOnlyEvent, "id" | "timestamp" | "myTeamScore" | "opponentScore" | "myTeamServing" | "myTeamSetsWon" | "opponentSetsWon" | "setNumber" | "myTeamTimeoutsUsed" | "opponentTimeoutsUsed">): ScoreOnlyEvent {
  return {
    id: uid(),
    timestamp: Date.now(),
    setNumber: s.currentSet,
    myTeamScore: s.myTeamScore,
    opponentScore: s.opponentScore,
    myTeamServing: s.myTeamServing,
    myTeamSetsWon: s.myTeamSetsWon,
    opponentSetsWon: s.opponentSetsWon,
    myTeamTimeoutsUsed: s.myTeamTimeouts,
    opponentTimeoutsUsed: s.opponentTimeouts,
    ...partial,
  };
}

export const useScoreOnlyStore = create<ScoreOnlyStore>()(
  persist(
    (set, get) => ({
      session: null,
      setup: DEFAULT_SETUP,
      setSetup: (next) => set({ setup: { ...get().setup, ...next } }),

      start: (setup) => {
        const s = newSessionFromSetup(setup);
        set({ session: s, setup });
        return s;
      },
      resume: () => get().session,

      addPoint: (team) => {
        const s = get().session;
        if (!s || s.isCompleted) return;
        const wasServing = team === "myTeam" ? s.myTeamServing : !s.myTeamServing;
        const myTeamServing = team === "myTeam";
        const myTeamScore = team === "myTeam" ? s.myTeamScore + 1 : s.myTeamScore;
        const opponentScore = team === "opponent" ? s.opponentScore + 1 : s.opponentScore;
        const next: ScoreOnlySession = {
          ...s,
          myTeamScore,
          opponentScore,
          myTeamServing: wasServing ? s.myTeamServing : myTeamServing,
        };
        const ev = recordEvent(next, { type: "SCORE", team });
        next.events = [...s.events, ev];
        set({ session: next });
      },

      removePoint: (team) => {
        const s = get().session;
        if (!s || s.isCompleted) return;
        if (team === "myTeam" && s.myTeamScore <= 0) return;
        if (team === "opponent" && s.opponentScore <= 0) return;
        const next: ScoreOnlySession = {
          ...s,
          myTeamScore: team === "myTeam" ? s.myTeamScore - 1 : s.myTeamScore,
          opponentScore: team === "opponent" ? s.opponentScore - 1 : s.opponentScore,
        };
        const trimmed = [...s.events];
        for (let i = trimmed.length - 1; i >= 0; i--) {
          const e = trimmed[i];
          if (e.type === "SCORE" && e.team === team && e.setNumber === s.currentSet) {
            trimmed.splice(i, 1);
            break;
          }
        }
        next.events = trimmed;
        set({ session: next });
      },

      takeTimeout: (team) => {
        const s = get().session;
        if (!s || s.isCompleted) return;
        const used = team === "myTeam" ? s.myTeamTimeouts : s.opponentTimeouts;
        if (used >= 2) return;
        const next: ScoreOnlySession = {
          ...s,
          myTeamTimeouts: team === "myTeam" ? s.myTeamTimeouts + 1 : s.myTeamTimeouts,
          opponentTimeouts: team === "opponent" ? s.opponentTimeouts + 1 : s.opponentTimeouts,
        };
        const ev = recordEvent(next, { type: "TIMEOUT", team });
        next.events = [...s.events, ev];
        set({ session: next });
      },

      endSetNow: () => {
        const s = get().session;
        if (!s || s.isCompleted) return null;
        const ruleWinner = checkScoreOnlySetWon(s);
        const winner: ScoreTeam =
          ruleWinner ??
          (s.myTeamScore === s.opponentScore
            ? "myTeam"
            : s.myTeamScore > s.opponentScore
              ? "myTeam"
              : "opponent");
        const setSummary = {
          setNumber: s.currentSet,
          myTeamScore: s.myTeamScore,
          opponentScore: s.opponentScore,
          winner,
        };
        const myTeamSetsWon = s.myTeamSetsWon + (winner === "myTeam" ? 1 : 0);
        const opponentSetsWon = s.opponentSetsWon + (winner === "opponent" ? 1 : 0);
        const matchWinner = checkScoreOnlyMatchWon(myTeamSetsWon, opponentSetsWon, s.matchFormat);
        const nextSetNumber = s.currentSet + 1;
        const isDeciding =
          (s.matchFormat === "club" ? 3 : 5) === nextSetNumber && !matchWinner;
        const next: ScoreOnlySession = {
          ...s,
          completedSets: [...s.completedSets, setSummary],
          myTeamSetsWon,
          opponentSetsWon,
          currentSet: matchWinner ? s.currentSet : nextSetNumber,
          myTeamScore: matchWinner ? s.myTeamScore : 0,
          opponentScore: matchWinner ? s.opponentScore : 0,
          myTeamTimeouts: 0,
          opponentTimeouts: 0,
          myTeamServing: matchWinner ? s.myTeamServing : winner === "myTeam",
          isCompleted: !!matchWinner,
          pendingDecidingServePrompt: isDeciding,
        };
        const setEv = recordEvent(next, { type: "SET_END", team: winner });
        const events = [...s.events, setEv];
        if (matchWinner) {
          const gameEv = recordEvent(next, { type: "GAME_END", team: matchWinner });
          events.push(gameEv);
        }
        next.events = events;
        set({ session: next });
        return winner;
      },

      setDecidingFirstServer: (team) => {
        const s = get().session;
        if (!s) return;
        const next: ScoreOnlySession = {
          ...s,
          myTeamServing: team === "myTeam",
          pendingDecidingServePrompt: false,
        };
        const ev = recordEvent(next, { type: "DECIDING_SERVE", team });
        next.events = [...s.events, ev];
        set({ session: next });
      },

      undo: () => {
        const s = get().session;
        if (!s) return;
        const events = [...s.events];
        let idx = -1;
        for (let i = events.length - 1; i >= 0; i--) {
          if (events[i].type !== "TIMEOUT") {
            idx = i;
            break;
          }
        }
        if (idx === -1) return;
        const last = events[idx];
        const trimmed = events.slice(0, idx);
        const base = trimmed[trimmed.length - 1];
        let restored: ScoreOnlySession;
        if (last.type === "SCORE") {
          restored = {
            ...s,
            myTeamScore: base?.myTeamScore ?? 0,
            opponentScore: base?.opponentScore ?? 0,
            myTeamServing: base?.myTeamServing ?? true,
            ...(base && base.setNumber === s.currentSet
              ? {}
              : { myTeamScore: 0, opponentScore: 0 }),
            events: trimmed,
          };
          if (!base || base.setNumber !== s.currentSet) {
            restored.myTeamScore = 0;
            restored.opponentScore = 0;
          }
        } else if (last.type === "SET_END" || last.type === "GAME_END") {
          const lastSet = s.completedSets[s.completedSets.length - 1];
          if (!lastSet) return;
          restored = {
            ...s,
            completedSets: s.completedSets.slice(0, -1),
            currentSet: lastSet.setNumber,
            myTeamScore: lastSet.myTeamScore,
            opponentScore: lastSet.opponentScore,
            myTeamSetsWon: s.myTeamSetsWon - (lastSet.winner === "myTeam" ? 1 : 0),
            opponentSetsWon: s.opponentSetsWon - (lastSet.winner === "opponent" ? 1 : 0),
            myTeamTimeouts: 0,
            opponentTimeouts: 0,
            isCompleted: false,
            pendingDecidingServePrompt: false,
            events: trimmed,
          };
          if (last.type === "GAME_END") {
            const pre = trimmed[trimmed.length - 1];
            if (pre && pre.type === "SET_END") {
              restored.events = trimmed.slice(0, -1);
            }
          }
        } else if (last.type === "DECIDING_SERVE") {
          restored = {
            ...s,
            pendingDecidingServePrompt: true,
            events: trimmed,
          };
        } else {
          return;
        }
        set({ session: restored });
      },

      endGame: () => {
        const s = get().session;
        if (!s) return;
        set({ session: { ...s, isCompleted: true } });
      },

      clear: () => set({ session: null }),
    }),
    {
      name: SESSION_KEY,
      version: 1,
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? window.localStorage
          : ({ getItem: () => null, setItem: () => {}, removeItem: () => {} } as unknown as Storage),
      ),
      partialize: (state) => ({ session: state.session, setup: state.setup }),
    },
  ),
);

export function readSavedScoreOnlySetup() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SETUP_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ScoreOnlySetup;
  } catch {
    return null;
  }
}

export function writeSavedScoreOnlySetup(setup: ScoreOnlySetup) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SETUP_KEY, JSON.stringify(setup));
  } catch {
  }
}
