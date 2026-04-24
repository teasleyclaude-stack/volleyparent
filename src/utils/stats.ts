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
  const [P1, P2, P3, P4, P5, P6] = state;
  return [P6, P1, P2, P3, P4, P5];
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
