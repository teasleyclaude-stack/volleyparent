// Contextual tips system — first-time tooltip hints for real games.
// Tips never fire during Practice Mode. Each fires once per device.

export const TIP_KEYS = {
  longPressSub: "tip_longpress_sub",
  doubleTapScore: "tip_double_tap_score",
  attemptFlow: "tip_attempt_flow",
  killZones: "tip_kill_zones",
  fanView: "tip_fanview",
  winByTwo: "tip_win_by_two",
  liberoSub: "tip_libero_sub",
  setComplete: "tip_set_complete",
  setterFlow: "tip_setter_flow",
  passingFlow: "tip_passing_flow",
  assistFlow: "tip_assist_flow",
  scoreboardFlip: "tip_scoreboard_flip",
  playerBenched: "tip_player_benched",
} as const;

export type TipKey = keyof typeof TIP_KEYS;

const ALL_KEYS = Object.values(TIP_KEYS);

function safeStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function shouldShowTip(key: TipKey, isPractice: boolean): boolean {
  if (isPractice) return false;
  const ls = safeStorage();
  if (!ls) return false;
  return ls.getItem(TIP_KEYS[key]) === null;
}

export function dismissTip(key: TipKey): void {
  const ls = safeStorage();
  if (!ls) return;
  try {
    ls.setItem(TIP_KEYS[key], "seen");
  } catch {
    /* noop */
  }
}

export function resetAllTips(): void {
  const ls = safeStorage();
  if (!ls) return;
  for (const k of ALL_KEYS) {
    try {
      ls.removeItem(k);
    } catch {
      /* noop */
    }
  }
  // Also reset the legacy long-press tip so it can re-show.
  try {
    ls.removeItem("courtsideview_longpress_tip_seen");
    ls.removeItem("vp_doubletap_hint_seen");
  } catch {
    /* noop */
  }
}
