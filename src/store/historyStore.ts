import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { GameSession, Player, RotationState } from "@/types";
import { defaultStats } from "@/types";

interface HistoryStore {
  sessions: GameSession[];
  lastRoster: Player[] | null;
  saveSession: (s: GameSession) => void;
  removeSession: (id: string) => void;
  getSession: (id: string) => GameSession | undefined;
}

export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set, get) => ({
      sessions: [],
      lastRoster: null,
      saveSession: (s) => {
        const others = get().sessions.filter((x) => x.id !== s.id);
        const cleanRoster: Player[] = s.roster.map((p) => ({
          ...p,
          stats: defaultStats(),
        }));
        set({
          sessions: [s, ...others].slice(0, 50),
          lastRoster: cleanRoster,
        });
      },
      removeSession: (id) => set({ sessions: get().sessions.filter((s) => s.id !== id) }),
      getSession: (id) => get().sessions.find((s) => s.id === id),
    }),
    {
      name: "volleyparent-history",
      version: 3,
      migrate: (persistedState: unknown, version: number) => {
        if (!persistedState || typeof persistedState !== "object") return persistedState;
        const state = persistedState as { sessions?: Array<Record<string, unknown>> };
        if (version < 2 && Array.isArray(state.sessions)) {
          const placeholder: RotationState = ["opp-1", "opp-2", "opp-3", "opp-4", "opp-5", "opp-6"];
          for (const sess of state.sessions) {
            const oldRot = sess.rotationState as RotationState | undefined;
            if (oldRot && !sess.homeRotationState) {
              const isHome = Boolean(sess.isHomeTeam);
              sess.homeRotationState = isHome ? oldRot : placeholder;
              sess.awayRotationState = isHome ? placeholder : oldRot;
              delete sess.rotationState;
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
        }
        // v3 — backfill matchFormat on saved historical sessions.
        if (version < 3 && Array.isArray(state.sessions)) {
          for (const sess of state.sessions) {
            if (!sess.matchFormat) sess.matchFormat = "highschool";
          }
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
