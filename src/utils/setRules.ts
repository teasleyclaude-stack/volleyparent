/**
 * Volleyball set + match rules.
 * - Sets 1–4 play to 25; set 5 plays to 15.
 * - Must win by 2 — no score cap. 25-24, 26-25, 27-26… all keep playing.
 * - Match is best of 5: first team to 3 sets wins.
 */

export function setTarget(setNumber: number): number {
  return setNumber === 5 ? 15 : 25;
}

export function checkSetWon(
  homeScore: number,
  awayScore: number,
  setNumber: number,
): "home" | "away" | null {
  const target = setTarget(setNumber);
  const higher = Math.max(homeScore, awayScore);
  const lead = Math.abs(homeScore - awayScore);
  if (higher < target) return null;
  if (lead < 2) return null;
  return homeScore > awayScore ? "home" : "away";
}

export function checkMatchWon(
  homeSetsWon: number,
  awaySetsWon: number,
): "home" | "away" | null {
  if (homeSetsWon >= 3) return "home";
  if (awaySetsWon >= 3) return "away";
  return null;
}

export interface SetLabel {
  text: string;
  /** CSS color string. Use `null` to fall back to the default muted token. */
  color: string | null;
}

export function getSetLabel(
  homeScore: number,
  awayScore: number,
  setNumber: number,
): SetLabel {
  const target = setTarget(setNumber);
  const higher = Math.max(homeScore, awayScore);
  const lead = Math.abs(homeScore - awayScore);
  if (higher >= target && lead < 2) {
    return { text: "WIN BY 2", color: "#FF4D4D" };
  }
  if (setNumber === 5) {
    return { text: "TO 15", color: "#F59E0B" };
  }
  return { text: `TO ${target}`, color: null };
}
