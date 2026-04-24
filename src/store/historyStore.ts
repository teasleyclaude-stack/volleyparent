import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { GameSession } from "@/types";

interface HistoryStore {
  sessions: GameSession[];
  saveSession: (s: GameSession) => void;
  removeSession: (id: string) => void;
  getSession: (id: string) => GameSession | undefined;
}

export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set, get) => ({
      sessions: [],
      saveSession: (s) => {
        const others = get().sessions.filter((x) => x.id !== s.id);
        set({ sessions: [s, ...others].slice(0, 50) });
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
