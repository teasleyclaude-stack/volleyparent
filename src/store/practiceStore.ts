import { create } from "zustand";

export type PracticeStep =
  | "point"
  | "attempt"
  | "kill"
  | "killZone"
  | "defense"
  | "longPressSub"
  | "undo"
  | "complete";

export const PRACTICE_STEPS: PracticeStep[] = [
  "point",
  "attempt",
  "kill",
  "killZone",
  "defense",
  "longPressSub",
  "undo",
];

interface PracticeStore {
  isPractice: boolean;
  step: PracticeStep;
  startedAt: number;
  start: () => void;
  setStep: (s: PracticeStep) => void;
  advance: () => void;
  exit: () => void;
}

export const usePracticeStore = create<PracticeStore>((set, get) => ({
  isPractice: false,
  step: "point",
  startedAt: 0,
  start: () => set({ isPractice: true, step: "point", startedAt: Date.now() }),
  setStep: (s) => set({ step: s }),
  advance: () => {
    const cur = get().step;
    const idx = PRACTICE_STEPS.indexOf(cur);
    if (idx === -1) return;
    const next = idx + 1 >= PRACTICE_STEPS.length ? "complete" : PRACTICE_STEPS[idx + 1];
    set({ step: next });
  },
  exit: () => set({ isPractice: false, step: "point" }),
}));

// Singleton getter usable from non-React modules (e.g. tip utility)
export function isPracticeActive(): boolean {
  return usePracticeStore.getState().isPractice;
}
