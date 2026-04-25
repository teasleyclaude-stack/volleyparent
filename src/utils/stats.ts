import type { PlayerStats, RotationState } from "@/types";

export function hittingPercentage(stats: PlayerStats): string {
  if (stats.totalAttempts === 0) return ".000";
  const pct = (stats.kills - stats.errors) / stats.totalAttempts;
  const sign = pct < 0 ? "-" : "";
  const abs = Math.abs(pct).toFixed(3);
  // .412 style (drop leading 0)
  return sign + (abs.startsWith("0") ? abs.slice(1) : abs);
}

export function applyRotation(state: RotationState): RotationState {
  // Clockwise rotation on side out:
  // P2 → P1 (new server), P3 → P2, P4 → P3, P5 → P4, P6 → P5, P1 → P6
  const [P1, P2, P3, P4, P5, P6] = state;
  return [P2, P3, P4, P5, P6, P1];
}

export function reverseRotation(state: RotationState): RotationState {
  // Inverse of applyRotation: returns the previous rotation state.
  // applyRotation: [P1,P2,P3,P4,P5,P6] -> [P2,P3,P4,P5,P6,P1]
  // reverseRotation: [P1,P2,P3,P4,P5,P6] -> [P6,P1,P2,P3,P4,P5]
  const [P1, P2, P3, P4, P5, P6] = state;
  return [P6, P1, P2, P3, P4, P5];
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
