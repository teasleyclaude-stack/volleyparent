## Bug

`GameSession.rotationState` is a single 6-tuple. On every side-out, `applyRotation` mutates it — meaning the home lineup rotates even when the away team earned the serve (and vice versa). In real volleyball, only the team that just won a side-out rotates *their own* lineup; the other team is unaffected.

## Fix overview

Split rotation into two independent tuples — `homeRotationState` and `awayRotationState` — and rotate only the team that just earned the serve.

## Changes

### 1. `src/types/index.ts`
- In `GameSession`: replace `rotationState: RotationState` with:
  - `homeRotationState: RotationState`
  - `awayRotationState: RotationState`
- In `MatchEvent`: keep a single `rotationState` snapshot but make it the *full picture* — split into `homeRotationState` and `awayRotationState` so undo/redo can fully restore both. (Existing single-field consumers will be migrated.)

### 2. `src/store/gameStore.ts`
- `startSession` accepts `homeRotation` and `awayRotation` (callers will pass the same tuple as today for "our" team and a sensible default for the opponent — see step 4).
- Replace `addPoint` logic with the canonical handler:
  ```ts
  const winnerWasServing = (team === "home") === s.isHomeServing;
  if (winnerWasServing) {
    // serve point — score only
  } else {
    // side-out — only winner's lineup rotates, serve flips
    if (team === "home") s.homeRotationState = applyRotation(s.homeRotationState);
    else s.awayRotationState = applyRotation(s.awayRotationState);
    s.isHomeServing = team === "home";
  }
  ```
- `correctScore`: when reversing a side-out, only `reverseRotation` the team that earned the serve (mirrors `addPoint`). Serve-point corrections only decrement the score.
- `setRotation` becomes `setRotation(team: "home" | "away", rotation)` so the lineup modal / repair button targets one team.
- `makeSubstitution(playerId, courtIdx)` operates on the *home* rotation (our team — opponent subs are not tracked).
- `undoLastAction`: snapshots in events already include both rotation states, so restore both from the prior event.
- `endSet`: leave both rotations as-is (a fresh starting lineup is set via `SetLineupModal` for our team only).

### 3. `src/utils/stats.ts`
- `applyRotation` and `reverseRotation` are unchanged. No new helpers needed.

### 4. `src/routes/game.setup.tsx`
- Setup only collects *our* team's starting lineup. The opponent's lineup is unknown to the user, so we generate a synthetic 6-tuple of placeholder IDs (`"opp-1"` … `"opp-6"`) just so the rotation algorithm can shift positions and fanview can show "opponent rotated" if ever needed.
- `startSession({ ..., homeRotation, awayRotation })`: when `isHomeTeam` is true, our entered lineup is `homeRotation` and `awayRotation` is the opponent placeholder; when false, the reverse.

### 5. `src/routes/game.live.tsx`
- The on-court display (`RotationCourt`) always shows *our* team's rotation:
  ```ts
  const ourRotation = session.isHomeTeam ? session.homeRotationState : session.awayRotationState;
  ```
- Pass `ourRotation` into `RotationCourt`, `RotationWarning`, `validateRotation`, and `SetLineupModal`.
- `setRotationStore(next)` calls become `setRotation(session.isHomeTeam ? "home" : "away", next)`.

### 6. `src/utils/rotationValidation.ts`
- No signature change — already operates on a single rotation tuple; we just feed it *our* team's rotation.

### 7. `src/lib/fanview.ts`
- `FanviewState.rotationState` keeps showing *our* team's rotation (fanview is always from the perspective of the user's team).
- `buildState` derives it the same way as `game.live.tsx`.

### 8. Persisted-state migration
Active sessions stored in `localStorage` under `volleyparent-active-session` and historical sessions under `volleyparent-history` use the old shape. Add a one-time migration in the zustand `persist` config (`version` bump + `migrate`):
- If `rotationState` exists and the new fields don't, copy it into the correct slot based on `isHomeTeam` and seed the opponent slot with placeholder IDs.

### 9. UI labels
Remove the now-misleading "side out" inference in the Scoreboard hint — keep the existing two team score buttons; `addPoint` decides serve point vs side-out internally (already the case, just confirming behavior).

## Files touched

- `src/types/index.ts`
- `src/store/gameStore.ts`
- `src/routes/game.setup.tsx`
- `src/routes/game.live.tsx`
- `src/lib/fanview.ts`
- `src/store/historyStore.ts` (migration only)

## Verification (the 4 test cases)

1. Home serves 5 straight → both rotations unchanged.
2. Away side-out then 3 straight → away rotates once, home untouched.
3. Back-to-back side-outs → each team rotates once.
4. Side-out to home, then double-tap home score → home rotation reverses, away untouched.