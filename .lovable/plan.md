## Problem

In Practice Mode, the tutorial auto-advances when you tap the highlighted button (Step 1 = home `+`, Step 2 = away `+`, etc.). There is no "Next" button by design.

You're stuck on Step 1 because the dim overlay is intercepting your taps. The spotlight is purely visual — the button underneath never receives the click, so the home score never increments and the coordinator never advances.

### Root cause

`src/components/practice/TutorialOverlay.tsx` renders a full-screen `<svg>` with `pointer-events-auto` and uses an SVG `<mask>` to "punch holes" for the spotlighted target(s). SVG masks only control **rendering**, not hit-testing — the masked-out pixels are invisible but the SVG rect still captures pointer events across the entire viewport. Result: every tap (including on the highlighted button) hits the SVG and is swallowed by its `onClick` / `onPointerDown` stopPropagation handlers.

## Fix

Replace the single full-screen click-blocking SVG with a layout that lets pointer events pass through to the highlighted target:

1. Keep the SVG for **visual dimming only** — set it to `pointer-events: none` and remove the `onClick` / `onPointerDown` handlers on its `<rect>`.
2. Render **four absolutely-positioned dim "frame" divs** around the spotlight rect (top / bottom / left / right strips) with `pointer-events: auto`. These block taps everywhere *except* the cutout, so the highlighted button is naturally clickable. They also visually match the SVG dim (transparent click-blockers; the SVG provides the dark color).
   - When there are two targets (`target` + `target2`, used on the side-out step), compute the union bounding box and frame around that, OR render two sets of frames. Simplest: union box, since both targets are on the same screen region (away `+` and court).
   - When `rect` is null (target not yet mounted), fall back to a single full-screen blocker so users can't tap through during transitions.
3. Keep the instruction card and pulse ring exactly as they are (already `pointer-events-auto` / `pointer-events-none` correctly).
4. Sanity check: confirm the `+` button in `Scoreboard.tsx` has no `disabled` / `pointer-events-none` styling that would still block it. (Already verified `data-tutorial="score-home"` is on the button.)

## Files to change

- `src/components/practice/TutorialOverlay.tsx` — restructure the dim layer as described.

## Verification

- Start Practice Mode → Step 1 highlights home `+` → tapping it increments score and advances to Step 2.
- Step 2 highlights away `+` and the court → tapping away `+` advances; the rest of the screen is still un-tappable.
- Steps 3–8 each advance when their target is tapped.
- Tapping the dimmed area outside the spotlight does nothing (no accidental score, no menu opens).
- "Skip tutorial" button in the instruction card still works.

No changes to the coordinator, store, or any other files.