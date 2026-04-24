import type { Player } from "@/types";
import { defaultStats } from "@/types";

export const SAMPLE_ROSTER: Player[] = [
  { id: "p1", name: "Emma R.", number: 12, position: "OH", isTracked: true, stats: defaultStats() },
  { id: "p2", name: "Sofia K.", number: 7, position: "S", isTracked: false, stats: defaultStats() },
  { id: "p3", name: "Ava M.", number: 3, position: "MB", isTracked: false, stats: defaultStats() },
  { id: "p4", name: "Lily P.", number: 18, position: "RS", isTracked: false, stats: defaultStats() },
  { id: "p5", name: "Chloe T.", number: 5, position: "L", isTracked: false, stats: defaultStats() },
  { id: "p6", name: "Maya W.", number: 21, position: "MB", isTracked: false, stats: defaultStats() },
  { id: "p7", name: "Zoe B.", number: 9, position: "OH", isTracked: false, stats: defaultStats() },
  { id: "p8", name: "Riley S.", number: 14, position: "DS", isTracked: false, stats: defaultStats() },
];
