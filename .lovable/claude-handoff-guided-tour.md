# Guided Tour Update — Cover Newer Features

Goal: extend the Practice Mode guided tour to teach the features that have shipped since the original 11-step tour. Do NOT change scoring/stat logic — this is tour-only work (new steps, copy, `data-tutorial` anchors, and detection events).

## Files involved (read first)

- `src/store/practiceStore.ts` — step enum + `PRACTICE_STEPS` array
- `src/components/practice/PracticeCoordinator.tsx` — `STEPS` config, `TOTAL`, detection (event-store + window events)
- `src/components/practice/TutorialOverlay.tsx` — `StepConfig` shape (no change needed)
- `src/routes/game.live.tsx` — where `data-tutorial` anchors live for the live dashboard
- `src/components/game/SetActionModal.tsx`, `PassGradeSheet.tsx`, `AssistKillerPrompt.tsx`, `FanviewButton.tsx` — components needing new anchors

## Current tour (keep, do not renumber existing copy)

`point → doubleTapRemove → attempt → kill → killZone → defense → longPressSub → undo → scoreSwap → correctRotation → changeTracked` (11 steps).

## New steps to add

Insert in this order. Update `PracticeStep` union, `PRACTICE_STEPS` array, `STEPS` config in `PracticeCoordinator.tsx`, and `TOTAL = 16`.

### 1. After `defense`, before `longPressSub` — `assistSlot`
- **title**: "Assist vs Ace — same slot"
- **description**: "The variable slot auto-swaps: when our team is serving it shows **Ace**; otherwise it shows **Assist** (purple ★). Both auto-score +1 for our team."
- **target**: `assist-ace-slot` (new anchor — wrap the variable slot button in `game.live.tsx` around lines 1379/1386/1529/1547/1574 with `data-tutorial="assist-ace-slot"`)
- **cardPosition**: `"top"`
- **advance**: detect any `STAT` event with `statType === "ace"` OR `statType === "assist"`

### 2. After `assistSlot` — `assistKiller`
- **title**: "Tag who got the kill"
- **description**: "After an Assist, tap the teammate who put it away. The killer doesn't get a separate kill stat — this just attributes the assist."
- **target**: `assist-killer-sheet` (add `data-tutorial="assist-killer-sheet"` to the root sheet container in `AssistKillerPrompt.tsx`)
- **cardPosition**: `"top"`
- **advance**: listen for new window event `practice:assist-killer-tagged` (fire from `AssistKillerPrompt` on teammate tap AND on skip/auto-dismiss)

### 3. After `assistKiller` — `settingMenu` (setter only — show if a setter is on court, otherwise skip)
- **title**: "Setter actions"
- **description**: "Tap **Setting ▾** for the setter to log Assist, Dump Kill, or Setting Error in one place. Dumps roll into hitting %."
- **target**: `btn-setting-menu` (add `data-tutorial="btn-setting-menu"` to the Setting ▾ button in `game.live.tsx` near line 1453)
- **cardPosition**: `"top"`
- **advance**: window event `practice:setting-menu-open` (fire when `SetActionModal` opens) → advance on first selection (any `STAT` event with `statType` in `assist|dumpKill|setError`)

### 4. After `settingMenu` — `passingMenu` (defensive only — L/DS)
- **title**: "Pass grades"
- **description**: "Tap **Passing ▾** for L/DS to grade a pass 0–3. Pass grades never affect the score or hitting %."
- **target**: `btn-passing-menu` (add `data-tutorial="btn-passing-menu"` to the Passing ▾ button near line 1501)
- **cardPosition**: `"top"`
- **advance**: detect any `STAT` event with `statType === "pass"` (or whatever the pass-grade event type is — verify in `gameStore`)

### 5. After `correctRotation`/`changeTracked` — `fanview`
- **title**: "Share the live view"
- **description**: "Tap to open Fan View — a read-only mirror parents can watch from the stands. Share the QR or link and they see the score + stats in real time."
- **target**: `fanview-btn` (anchor already exists at `game.live.tsx:425`)
- **cardPosition**: `"bottom"`
- **advance**: window event `practice:fanview-opened` (fire from `FanviewButton` onClick)

## Code changes summary

### `src/store/practiceStore.ts`
Add to `PracticeStep` union and `PRACTICE_STEPS` array, in order:
```
"defense", "assistSlot", "assistKiller", "settingMenu", "passingMenu",
"longPressSub", "undo", "scoreSwap", "correctRotation", "changeTracked", "fanview"
```

### `src/components/practice/PracticeCoordinator.tsx`
- `TOTAL = 16`
- Add 5 entries to `STEPS` using the copy above.
- In the event-store effect, add branches:
  - `step === "assistSlot"` → look for `STAT` with `statType` in `["ace","assist"]`
  - `step === "passingMenu"` → look for `STAT` with `statType === "pass"`
- In the window-event effect, register four new listeners and matching cleanup:
  - `practice:assist-killer-tagged` → advance if `step === "assistKiller"`
  - `practice:setting-menu-open` → no-op for spotlight; advance on the STAT branch (`assist|dumpKill|setError`) when `step === "settingMenu"`
  - `practice:fanview-opened` → advance if `step === "fanview"`

### Anchors to add (one-liners)
| File | What | Attribute |
|---|---|---|
| `src/routes/game.live.tsx` ~1379/1386/1529/1547/1574 | Wrap the `<AssistButton>` (and the variable Ace slot) so a single element carries the anchor | `data-tutorial="assist-ace-slot"` |
| `src/routes/game.live.tsx` ~1453 | Setting ▾ button | `data-tutorial="btn-setting-menu"` |
| `src/routes/game.live.tsx` ~1501 | Passing ▾ button | `data-tutorial="btn-passing-menu"` |
| `src/components/game/AssistKillerPrompt.tsx` root sheet | `data-tutorial="assist-killer-sheet"` |
| `src/components/game/FanviewButton.tsx` button root | already covered by parent `fanview-btn` anchor — verify it's still on the right element |

### Window events to dispatch
Use `window.dispatchEvent(new Event("..."))`, only when `usePracticeStore.getState().isPractice` is true (avoid noise in real games).

- `FanviewButton` onClick → `practice:fanview-opened`
- `SetActionModal` on open → `practice:setting-menu-open`
- `AssistKillerPrompt` on tag/skip/auto-dismiss → `practice:assist-killer-tagged`

## Conditional skips (setter/defensive)

`settingMenu` requires a Setter on court; `passingMenu` requires an L/DS on court. In `PracticeCoordinator`, when the step becomes one of those and the position isn't on court, call `advance()` immediately so the tour doesn't stall. Inspect `session.trackedPlayer.position` (or the equivalent in `gameStore`) to decide.

## Validation checklist

- [ ] `TOTAL` matches `PRACTICE_STEPS.length` (= 16).
- [ ] Every `STEPS[key].target` resolves to a real `data-tutorial` node on the live page when that step is active. (Spotlight stays put — no full-screen dim.)
- [ ] Conditional steps auto-skip when the relevant position isn't tracked.
- [ ] Window events fire ONLY when `isPractice === true`.
- [ ] Existing 11 steps still pass end-to-end (no copy or ordering regressions for `point`–`changeTracked`).
- [ ] No changes to `handleStat`, `recordAssist`, score logic, or hitting% — tour-only work.
