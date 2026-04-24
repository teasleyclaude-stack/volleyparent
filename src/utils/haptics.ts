// Lightweight haptic helper for web (vibration API where supported).
export function tapHaptic(strength: "light" | "medium" | "heavy" = "medium") {
  if (typeof navigator === "undefined") return;
  const nav = navigator as Navigator & { vibrate?: (p: number | number[]) => boolean };
  if (!nav.vibrate) return;
  const pattern = strength === "light" ? 10 : strength === "heavy" ? 30 : 18;
  try {
    nav.vibrate(pattern);
  } catch {
    /* noop */
  }
}
