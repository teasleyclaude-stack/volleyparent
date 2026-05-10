# Restrict BLOCK to front-row positions

## Goal
The BLOCK button should only fire when the tracked player is in a front-row rotation slot (P2/P3/P4 → indices 1, 2, 3). When the tracked player is in the back row (P1/P5/P6 → indices 0, 4, 5), the button stays visible in the same slot but is greyed out and non-interactive, so users learn where the button lives.

This applies to **every panel that currently renders a Block button**: Attacker, Setter, and Defensive (non-Libero). Libero panels already omit Block and stay unchanged.

## How it works today
- `src/routes/game.live.tsx` line 232 derives `isMyPlayerServing` from the rotation; this is the existing pattern referenced as Updates 26 & 27.
- Block buttons render via `<StatButton stat="block" .../>` in three places:
  - `AttackerButtons` (line ~1133) — dedicated Block slot in the 3-col secondary row.
  - `SetterButtons` (line ~1230) — Block is the alt inside `<AceOrAlt>` (only shown when not serving).
  - `DefensiveButtons` non-Libero branch (line ~1323) — also via `<AceOrAlt>`.
- `StatButton` (`src/components/game/StatButton.tsx`) currently has no disabled state.

## Changes

### 1. Derive `isMyPlayerFrontRow` next to `isMyPlayerServing`
In `src/routes/game.live.tsx` (~line 232), add:
```ts
const FRONT_ROW_INDICES = [1, 2, 3] as const;
const myPlayerRotIndex = ourRotation.indexOf(tracked.id);
const isMyPlayerFrontRow = FRONT_ROW_INDICES.includes(myPlayerRotIndex as 1 | 2 | 3);
```
This re-evaluates on every render, which already happens after rally scoring, rotation, sub, set start, and tracked-player change (all flow through `session` state).

### 2. Thread it into `PositionPanelProps`
Add `isMyPlayerFrontRow: boolean` to the `PositionPanelProps` interface (~line 1007) and pass it from the panel render site (~line 465) alongside `isMyPlayerServing`.

### 3. Add a `disabled` prop to `StatButton`
In `src/components/game/StatButton.tsx`:
- Accept `disabled?: boolean`.
- When `disabled`, set `disabled` on the `<button>`, skip haptic + `onPress`, and apply muted styling: `opacity-40`, `grayscale`, `cursor-not-allowed`, `pointer-events-none` (still rendered for layout/training).

### 4. Wire the disabled flag into all Block buttons
- `AttackerButtons`: `<StatButton stat="block" label="Block" onPress={...} disabled={!props.isMyPlayerFrontRow} />`.
- `AceOrAlt` (used by Setter + Defensive): add an optional `altDisabled?: boolean` prop that forwards to the alt `<StatButton>`. Setter and Defensive call sites pass `altDisabled={!props.isMyPlayerFrontRow}`. The Ace branch is unaffected (serving implies back-row P1, but the existing serving-vs-block swap already handles that visually).

### 5. No other behavior changes
- No store / event / stat changes.
- Libero defensive branch unchanged (already no Block).
- Layout grids stay 3-column; the slot is preserved exactly where it was.

## Files touched
- `src/routes/game.live.tsx` — derive `isMyPlayerFrontRow`, extend `PositionPanelProps`, pass it in, forward through `AceOrAlt`.
- `src/components/game/StatButton.tsx` — add `disabled` prop + greyed style.

## Verification
1. Start a match, set tracked player into P2/P3/P4 → Block button fully colored and tappable.
2. Score until rotation moves them to P1/P5/P6 → Block button greys out, taps do nothing, no haptic.
3. Test under all three panels (OH/MB/RS attacker, S setter, DS defensive). Libero panel unchanged.
4. Sub the tracked flag onto another player in the back row → Block immediately greys without reload.
