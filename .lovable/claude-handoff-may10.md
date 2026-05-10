# Claude Handoff — May 10 batch

Source-of-truth snapshot of every change shipped in the Lovable build on
May 10. Use this to bring a Claude-built copy of the app to parity. Each
section lists the files touched and the behavior to match — not a literal
diff, since file line numbers will drift.

Apply in order. Items 3 and 11 are prerequisites for several later items.

---

## 1. BLOCK button — front-row only

**Files:** `src/components/game/StatButton.tsx`, `src/routes/game.live.tsx`

- `StatButtonProps` gains `disabled?: boolean`. When `true`: add
  `pointer-events-none cursor-not-allowed opacity-40 grayscale`, skip
  haptic, and return early from `onPress`.
- In `game.live.tsx`, derive `isMyPlayerFrontRow` from
  `FRONT_ROW_INDICES = [1, 2, 3]` and `ourRotation.indexOf(tracked.id)`.
- Pass `disabled={!isMyPlayerFrontRow}` to every BLOCK `StatButton` in
  every position panel (Attacker, Setter, Defensive). Leave other stat
  buttons alone.

---

## 2. End Set confirmation popup

**File:** `src/routes/game.live.tsx`

- New state `endSetConfirmOpen` (alongside existing `endConfirmOpen`).
- Both the bottom-of-screen "End Set N" button and the overflow-menu
  "End Set Early" item now set `endSetConfirmOpen = true` instead of
  calling `endSet()` directly.
- New `handleEndSetConfirmed()` helper calls `endSet()`,
  `tapHaptic("heavy")`, and opens the lineup modal if the match isn't
  over.
- Confirm modal: "Keep Playing" (cancel) / "End Set" (confirm).
- The auto end-of-set `SetOverPopup` flow is unchanged.

---

## 3. Home/Away → My Team / Opponent perspective refactor

**Files:** new `src/lib/teamPerspective.ts`; updated `Scoreboard.tsx`,
`game.live.tsx`, `game.setup.tsx`, `fanview.ts`, `report` files.

Add selectors that take a `GameSession` and return the user-perspective
view, regardless of whether the user is home or away:

```ts
export const ourSide = (s: GameSession): "home" | "away" =>
  s.isHomeTeam ? "home" : "away";
export const ourRotation = (s: GameSession): RotationState =>
  s.isHomeTeam ? s.homeRotationState : s.awayRotationState;
export const weServe = (s: GameSession): boolean =>
  s.isHomeServing === s.isHomeTeam;
export const ourTimeouts = (s: GameSession): number =>
  s.isHomeTeam ? s.homeTimeoutsThisSet : s.awayTimeoutsThisSet;
```

Replace ad-hoc ternaries (`isHomeTeam ? home... : away...`) throughout
the live dashboard, scoreboard, and reporting code with these selectors.
Data layer (`isHomeTeam`, `homeScore`, `awayScore`, `homeRotationState`,
`awayRotationState`) is unchanged — only display/derivation code moves.

---

## 4. Setup screen — team naming

**File:** `src/routes/game.setup.tsx`

- Labels now read "My Team" and "Opponent" everywhere on setup.
- The user's team is hardcoded to the home slot (`isHomeTeam = true`)
  for storage; perspective selectors from #3 handle the rest.

---

## 5. "Save & Add Another" on Add Player modal

**File:** `src/routes/game.setup.tsx`

- Import `useRef`. Inside `AddPlayerModal`, add `nameRef` and a `submit`
  helper that calls the parent `onAdd(name, num, pos)` then resets the
  form fields and re-focuses the name input.
- Parent `onAdd` no longer calls `setShowAdd(false)` — the modal owns
  its dismissal.
- Modal footer has two buttons: **Save** (closes modal) and
  **Save & Add Another** (calls `submit()` and stays open).
- Pressing Enter in the name field triggers `submit()`.

---

## 6. Deciding-set serve = coin toss

**Files:** `src/utils/setRules.ts`, `src/store/gameStore.ts`,
`src/components/game/CoinTossPopup.tsx`, `src/lib/fanview.ts`,
`src/routes/game.live.tsx`, `src/types/index.ts`

- `setRules.ts`: add `isDecidingSet(currentSet, matchFormat)` (set 3 for
  club, set 5 for HS) and `decidingSet(matchFormat)`. Have `getSetLabel`
  call out the deciding set.
- `MatchEvent` type union gains `"DECIDING_SERVE"`. `GameSession` gains
  `pendingDecidingServePrompt?: boolean`.
- `endSet()` in the store: for sets 1..(n-1), keep the existing
  loser-serves-next assignment. If the next set IS the deciding set,
  set `pendingDecidingServePrompt = true` and DO NOT touch
  `isHomeServing`.
- `setDecidingFirstServer(team)` action: sets `isHomeServing`, clears
  the prompt, and pushes a `DECIDING_SERVE` event.
- `undoLastAction`: undoing a `DECIDING_SERVE` re-opens the prompt.
- Live page renders `CoinTossPopup` whenever
  `pendingDecidingServePrompt === true`.
- `fanview.ts` maps `DECIDING_SERVE` → "Set N — Deciding Set. {team}
  serves first." with `tone: "deciding"`.

---

## 7. Scoreboard side-swap button

**Files:** `src/components/game/Scoreboard.tsx`, `src/lib/tips.ts`

- Local `flipped` state inside `Scoreboard`. A small swap-icon button in
  the scoreboard header toggles it.
- Build a `sides` mapping that picks which team renders on left vs right
  based on `flipped`. Score, color, name, sets-won all follow the
  mapping; the gold "leading" highlight follows the score value, not
  the position.
- Visual only — never modify session state, rotation, serving, or push
  to FanView. FanView always renders the standard orientation.
- Add a one-time tip key in `tips.ts` for the swap button.

---

## 8. Starting Serve pill uses team colors

**File:** `src/routes/game.setup.tsx`

- In the setup "Starting serve" segmented control, the active pill's
  background is the active team's selected color (`homeColor` for "My
  Team", `awayColor` for "Opponent") via inline `style`. Inactive pill
  keeps `text-muted-foreground` and no background. Remove
  `bg-[var(--gold)] text-background` from the active state.

---

## 9. Fix — Starting Serve pill text visibility

**File:** `src/routes/game.setup.tsx`

- The previous fix used `readableTextColor(teamColor)` which computes
  contrast against the dark page background, so text disappeared on the
  pill itself. Replace it with a luminance check against the team color:

```ts
const hex = teamColor.replace("#", "");
const r = parseInt(hex.slice(0, 2), 16);
const g = parseInt(hex.slice(2, 4), 16);
const b = parseInt(hex.slice(4, 6), 16);
const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
const textColor = luminance > 0.6 ? "#0A0A0A" : "#FFFFFF";
```

Apply `style={{ color: textColor }}` to the active pill text.

---

## 10. Clear / swap positions on starting rotation

**File:** `src/routes/game.setup.tsx`

In `RotationSlot` and parent setRotation helpers:

1. **Clear position button** — when a slot has a player, the picker
   sheet shows a destructive "Clear position" button at the bottom that
   calls the existing `onClear` prop and closes the sheet.
2. **Swap with another on-court player** — change the picker filter
   from "bench-only" to "full roster, with on-court players badged
   (P3, P5, …)". Add a swap helper in the parent:

```ts
const setRotationSwap = (slotIdx: number, playerId: string) => {
  setRotation((prev) => {
    const next = [...prev];
    const existingIdx = next.findIndex((id) => id === playerId);
    const current = next[slotIdx];
    next[slotIdx] = playerId;
    if (existingIdx !== -1 && existingIdx !== slotIdx) {
      next[existingIdx] = current ?? null;
    }
    return next;
  });
};
```

Pass `setRotationSwap` to `RotationSlot` as `onPick`. Handles both
bench → slot (existingIdx === -1) and on-court → slot (true swap).
Do not change the "+ Add" empty state, libero validation, or
`RotationState` types.

---

## 11. Grey out stat buttons when tracked player is benched

**Files:** `src/routes/game.live.tsx` (incl. `PositionAwareStatPanel`),
`src/lib/tips.ts`

- Derive `isOnCourt = ourRotation.indexOf(tracked.id) !== -1`.
- Track entry/exit transitions with a `useRef` + `useEffect` and fire a
  short `benchFlash` banner ("…on the bench — stat tracking paused" /
  "…back on court — stat tracking resumed").
- Gate every stat-recording handler in the live page with
  `if (!isOnCourt) return;` (handleStat, onAssistTap, onSetTap,
  onPassTap, dig, block, ace, error…).
- In `PositionAwareStatPanel`:
  - When `!isOnCourt`, replace the primary metric (Hit %/Pass Avg) with
    a coral red `● Bench` badge.
  - Apply `opacity-30 pointer-events-none transition-opacity duration-150`
    to the action button group.
  - Render an overlay label "[Name] is on the bench" over the disabled
    buttons.
- Register `playerBenched` in `tips.ts`; show a one-time "Got it" tip
  the first time the tracked player goes to the bench.
- Stats remain visible (just not incrementable). On return to court,
  buttons re-enable instantly.

---

## 12. Manual Rotation Correction (⋮ menu)

**Files:** `src/types/index.ts`, `src/store/gameStore.ts`,
`src/lib/fanview.ts`, new `src/components/game/CorrectRotationSheet.tsx`,
`src/routes/game.live.tsx`

### Types
- Add `"ROTATION_CORRECTION"` to the `EventType` union.
- Add `correctionSteps?: number` to `MatchEvent` (positive = forward,
  negative = back, value is the net steps committed).
- Reuse the existing `correctionTeam?: "home" | "away"` field to record
  which team's rotation was corrected.

### Store action
```ts
correctRotation: (team, netSteps) => {
  const cur = get().session;
  if (!cur || netSteps === 0) return;
  const s: GameSession = JSON.parse(JSON.stringify(cur));
  const key = team === "home" ? "homeRotationState" : "awayRotationState";
  let rot = [...s[key]] as RotationState;
  if (netSteps > 0) {
    for (let i = 0; i < netSteps; i++) rot = applyRotation(rot);
  } else {
    for (let i = 0; i < -netSteps; i++) rot = reverseRotation(rot);
  }
  s[key] = rot;
  s.pendingLiberoViolation = null;
  s.roster = s.roster.map((p) =>
    isLibero(p) ? { ...p, liberoPartnerId: null } : p,
  );
  pushEvent(s, {
    type: "ROTATION_CORRECTION",
    setNumber: s.currentSet,
    homeScore: s.homeScore,
    awayScore: s.awayScore,
    homeRotationState: s.homeRotationState,
    awayRotationState: s.awayRotationState,
    isHomeServing: s.isHomeServing,
    correctionSteps: netSteps,
    correctionTeam: team,
  });
  set({ session: s });
};
```

### Undo
In `undoLastAction`, when `last.type === "ROTATION_CORRECTION"` apply
the inverse: `reverseRotation` × steps if positive, `applyRotation` ×
|steps| if negative. Score, serving, and stats are untouched.

### Fanview feed mapping
```ts
if (ev.type === "ROTATION_CORRECTION") {
  const steps = ev.correctionSteps ?? 0;
  const message =
    steps > 0
      ? `Rotation corrected — moved forward ${steps} position${steps === 1 ? "" : "s"}`
      : steps < 0
        ? `Rotation corrected — moved back ${-steps} position${-steps === 1 ? "" : "s"}`
        : "Rotation corrected";
  return { ...base, type: "ROTATION_CORRECTION", message,
    tone: "score", team: ev.correctionTeam };
}
```

### Bottom sheet — `CorrectRotationSheet.tsx`
- Props: `open`, `initialRotation`, `roster`, `isHomeServing`,
  `isHomeOurs`, `ourColor`, `onConfirm(netSteps)`, `onCancel()`.
- Local `tempRotation` (copy of `initialRotation` on open) and
  `netSteps` (running net, +/-) reset every time `open` flips true.
- Renders a drag handle, "CORRECT ROTATION" header, "Score and stats
  are not affected" subhead, and a row of: `←` button (64×64), inline
  `<RotationCourt>` mini map showing `tempRotation`, `→` button
  (64×64). Each arrow tap applies `reverseRotation`/`applyRotation` to
  `tempRotation`, increments/decrements `netSteps`, and fires
  `tapHaptic("light")`.
- Counter line: "Corrections made: 0" / "N forward" / "N back".
- Confirm button: full width, `#39FF14`, disabled-look when
  `netSteps === 0`. On press: `tapHaptic("medium")` →
  `onConfirm(netSteps)`.
- Cancel link below: discards temp state and calls `onCancel`.
- Tapping the dim backdrop also cancels.

### Live page wiring
- Add `Repeat` to the lucide imports.
- Add a `correctRotationOpen` state.
- In the `⋮` overflow menu, prepend a "Correct Rotation" item (above
  "Change Tracked Player") that closes the menu and opens the sheet.
- Mount `<CorrectRotationSheet>` next to the existing
  `<TrackedPlayerPicker>`. On confirm, call
  `correctRotation(ourTeamKey, netSteps)` and
  `fanview.pushNow().catch(...)`.

### What does NOT change
`homeScore`, `awayScore`, set wins, `isHomeServing`,
`awayRotationState` (when our team is home), any player stats, any
prior events, FanView score display.

---

## Verification (post-apply smoke test)

1. Setup new game: pill backgrounds match team colors with legible text.
2. Add 3 players via "Save & Add Another" without reopening modal.
3. Place a player into the wrong rotation slot, then tap the slot and
   pick a different on-court player → they swap; tap "Clear position"
   on a slot → slot empties.
4. Start match, end first set → loser serves. Win one more → if next is
   deciding set, coin-toss popup appears; pick a team → that team
   serves.
5. On scoreboard, tap swap → visual flip only, scores/colors track
   correctly; FanView still standard orientation.
6. Move tracked player to back row → BLOCK greyed out. Sub them out →
   all stat buttons grey, BENCH badge shows, banner fires once. Sub
   back in → buttons re-enable.
7. Open ⋮ → Correct Rotation → tap → twice, ← once → counter "1
   forward", mini court reflects net +1 → Confirm → live court updates,
   score unchanged, summary line "Rotation corrected — moved forward 1
   position", FanView updates. Undo → rotation restored.
8. End Set button → confirm popup before ending.
