import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { GameSession, Player } from "@/types";
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
        // Persist a stat-stripped copy of the roster as the "last roster" for next game setup.
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
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? window.localStorage
          : ({ getItem: () => null, setItem: () => {}, removeItem: () => {} } as unknown as Storage),
      ),
    },
  ),
);
