import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ScoreOnlySession } from "@/utils/scoreOnly";

interface ScoreOnlyHistoryStore {
  sessions: ScoreOnlySession[];
  saveSession: (s: ScoreOnlySession) => void;
  removeSession: (id: string) => void;
  getSession: (id: string) => ScoreOnlySession | undefined;
}

export const useScoreOnlyHistoryStore = create<ScoreOnlyHistoryStore>()(
  persist(
    (set, get) => ({
      sessions: [],
      saveSession: (s) => {
        const others = get().sessions.filter((x) => x.id !== s.id);
        set({ sessions: [s, ...others].slice(0, 50) });
      },
      removeSession: (id) =>
        set({ sessions: get().sessions.filter((s) => s.id !== id) }),
      getSession: (id) => get().sessions.find((s) => s.id === id),
    }),
    {
      name: "courtsideview-scoreonly-history",
      version: 1,
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? window.localStorage
          : ({ getItem: () => null, setItem: () => {}, removeItem: () => {} } as unknown as Storage),
      ),
    },
  ),
);
