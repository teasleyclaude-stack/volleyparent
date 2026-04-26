import type { Player, RotationState } from "@/types";

export interface RotationIssue {
  /** Stable code for the issue (useful for tests / analytics). */
  code:
    | "WRONG_LENGTH"
    | "EMPTY_SLOT"
    | "DUPLICATE_PLAYER"
    | "UNKNOWN_PLAYER"
    | "SERVER_NOT_ON_COURT"
    | "SERVING_MISMATCH"
    | "NO_TRACKED_ON_COURT";
  /** Human-readable warning shown in the UI. */
  message: string;
  /** Optional rotation indices (0..5) the issue refers to. */
  slots?: number[];
  severity: "warning" | "error";
}

export interface RotationValidationResult {
  ok: boolean;
  issues: RotationIssue[];
}

/**
 * Validate a rotation tuple against the roster.
 *
 * Detects:
 *  - Wrong tuple shape (length != 6, empty/missing IDs)
 *  - Duplicate players occupying multiple positions
 *  - Player IDs that aren't on the roster
 *  - The server slot (P1 / index 0) being empty or unknown — i.e. wrong server
 *  - Mismatched lineup vs. who is on court (orphaned IDs)
 *  - Optional contextual checks: serving team flag vs. our-team flag (caller
 *    can pass `oursServing` if it's known)
 *
 * The function is intentionally pure so it can be reused by the live game
 * view, the lineup modal, and any future report screens.
 */
export function validateRotation(
  rotation: RotationState | string[] | undefined | null,
  roster: Player[],
  opts: {
    /** Whether our team is currently serving (P1 must be on court either way). */
    oursServing?: boolean;
    /** Require at least one tracked player on the court. */
    requireTracked?: boolean;
  } = {},
): RotationValidationResult {
  const issues: RotationIssue[] = [];

  if (!rotation || rotation.length !== 6) {
    issues.push({
      code: "WRONG_LENGTH",
      message: `Rotation must have exactly 6 positions (got ${rotation?.length ?? 0}).`,
      severity: "error",
    });
    return { ok: false, issues };
  }

  const rosterById = new Map(roster.map((p) => [p.id, p]));
  const seen = new Map<string, number[]>();
  const emptySlots: number[] = [];
  const unknownSlots: number[] = [];

  rotation.forEach((id, idx) => {
    if (!id) {
      emptySlots.push(idx);
      return;
    }
    if (!rosterById.has(id)) {
      unknownSlots.push(idx);
    }
    const arr = seen.get(id) ?? [];
    arr.push(idx);
    seen.set(id, arr);
  });

  if (emptySlots.length > 0) {
    issues.push({
      code: "EMPTY_SLOT",
      message: `Empty position${emptySlots.length > 1 ? "s" : ""} on court: ${emptySlots
        .map((i) => `P${i + 1}`)
        .join(", ")}.`,
      slots: emptySlots,
      severity: "error",
    });
  }

  if (unknownSlots.length > 0) {
    issues.push({
      code: "UNKNOWN_PLAYER",
      message: `Position${unknownSlots.length > 1 ? "s" : ""} ${unknownSlots
        .map((i) => `P${i + 1}`)
        .join(", ")} reference player(s) not in the roster.`,
      slots: unknownSlots,
      severity: "error",
    });
  }

  for (const [, slots] of seen) {
    if (slots.length > 1) {
      issues.push({
        code: "DUPLICATE_PLAYER",
        message: `Same player appears in multiple positions: ${slots
          .map((i) => `P${i + 1}`)
          .join(", ")}.`,
        slots,
        severity: "error",
      });
    }
  }

  // Server (P1 / index 0) must be a real, on-roster player.
  const serverId = rotation[0];
  if (!serverId || !rosterById.has(serverId)) {
    issues.push({
      code: "SERVER_NOT_ON_COURT",
      message: "Server position (P1) is empty or assigned to an unknown player.",
      slots: [0],
      severity: "error",
    });
  }

  // Contextual check — if the caller asserts our team is serving but P1 isn't
  // a recognizable on-roster player, flag it as a serving mismatch.
  if (opts.oursServing === true && (!serverId || !rosterById.has(serverId))) {
    issues.push({
      code: "SERVING_MISMATCH",
      message: "Our team is marked as serving but no valid server is in P1.",
      slots: [0],
      severity: "warning",
    });
  }

  if (opts.requireTracked) {
    const trackedOnCourt = rotation.some((id) => rosterById.get(id)?.isTracked);
    if (!trackedOnCourt) {
      issues.push({
        code: "NO_TRACKED_ON_COURT",
        message: "No tracked player is currently on the court.",
        severity: "warning",
      });
    }
  }

  return { ok: issues.length === 0, issues };
}
