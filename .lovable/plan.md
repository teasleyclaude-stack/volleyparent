## Three additions

### 1. Double-tap score correction

**`src/types/index.ts`** — extend `EventType` with `"SCORE_CORRECTION"` and add `delta?: number` to `MatchEvent`.

**`src/store/gameStore.ts`** — add `correctScore(team: "home" | "away")`:
- If score is 0, no-op.
- Look at the last event. If it's a `SCORE` for that team:
  - If the SCORE caused a side-out (rotation changed vs previous snapshot), reverse the rotation with `reverseRotation([P1..P6]) → [P6,P1,P2,P3,P4,P5]` and flip `isHomeServing` back.
  - Decrement the team's score by 1.
- Push a `SCORE_CORRECTION` event with `team` and `delta: -1` so it shows up in the event log.
- Also extend `undoLastAction` to handle reversing a `SCORE_CORRECTION` (re-add the point and re-apply rotation if applicable).

**`src/components/game/Scoreboard.tsx`** — add `onCorrectHome`/`onCorrectAway` props. Wrap each score number in a button with an `onDoubleClick` handler (also handle a manual two-tap detector for touch — track last tap timestamp, <300ms = double). On trigger:
- Call the corresponding correction callback.
- Briefly toggle a `flashKey` that adds a `text-[#FF4D4D]` class for 200ms.
- Fire `tapHaptic("heavy")` (closest web equivalent to Warning notification).
- Add a tiny `2×` hint icon below each score (subtle, muted, 9px text). On first-ever use, show a one-time tooltip "Double-tap score to correct" stored in localStorage key `vp_doubletap_hint_seen`.

**`src/routes/game.live.tsx`** — wire `onCorrectHome={() => correctScore("home")}` / `onCorrectAway={() => correctScore("away")}`.

### 2. Roster initialization rules

**`src/store/historyStore.ts`** — add a `lastRoster: Player[] | null` field that persists with the store. Set it inside `saveSession` (strip stats to zero before storing). Add a `getLastRoster()` selector.

**`src/routes/game.setup.tsx`**:
- Replace initial `useState<Player[]>(SAMPLE_ROSTER)` with a lazy initializer that:
  - Reads `useHistoryStore.getState().lastRoster` (or first session's roster as fallback).
  - If found, returns players with stats zeroed via `defaultStats()`.
  - Otherwise returns `[]` (blank).
- Initial rotation derives from this roster's first 6 (or all-null when blank).
- Replace the existing empty-state copy with a clear CTA card: "Add your first player to get started" + a prominent "Add Player" button that opens the existing `AddPlayerModal`.
- Keep Start Game disabled until roster has ≥6 and rotation is full (already enforced via `rotationFull` check; add roster length guard).
- Remove the `SAMPLE_ROSTER` import (and delete `src/data/sampleRoster.ts` usage references).

### 3. Set Lineup screen between sets

New component **`src/components/game/SetLineupModal.tsx`** — full-screen modal:
- Header: "SET N LINEUP" + "Adjust your starting players for Set N+1".
- ON COURT: 3×2 grid (same `[3,2,1,4,5,0]` ordering as `RotationCourt`) showing currently-assigned player per slot. Tap to select.
- BENCH: scrollable list of players not in current rotation.
- Tap-to-swap interaction (Option A): tap a court slot → it highlights → tap a bench player → swap. Tapping another court slot swaps positions on court.
- Buttons: "Keep Same Lineup" (closes, no changes) and "Confirm Lineup" (commits new rotation to store).

**`src/store/gameStore.ts`** — add `setRotation(newRotation: RotationState)` that overwrites `rotationState`. Modify `endSet`:
- Determine which team won the just-ended set.
- Set `isHomeServing` so the **losing** team serves first next set.
- (Stats stay; timeouts already reset.)

**`src/routes/game.live.tsx`**:
- Track `lineupModalSet` state. After `endSet()` runs (and only if new `currentSet ≤ 5` and no match winner), open the modal.
- Modal callbacks: "Keep Same" just closes; "Confirm" calls `setRotation(newRot)` then closes.
- Suppress modal when ending the match (`isFinalSet` / matchWinner reached).

### Notes

- "Reverse rotation" only applies to the most recent SCORE event being corrected; older corrections fall back to plain decrement (kept simple).
- Player stats persist across sets (already true — no change needed).
- The double-tap detector uses a ref-based timestamp diff to work reliably on iOS Safari, not just `onDoubleClick`.
