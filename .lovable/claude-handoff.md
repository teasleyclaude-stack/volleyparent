# Claude Handoff — Source-of-Truth for 4 Rules

Use these exact files/lines. Do **not** re-implement logic that already exists — re-use it.

---

## 1. Team color swatches

**File:** `src/routes/game.setup.tsx`

- **Lines 764–767** — `SWATCHES` array:
  ```ts
  const SWATCHES = [
    "#F4B400", "#3B82F6", "#EF4444", "#10B981", "#8B5CF6",
    "#EC4899", "#F97316", "#06B6D4", "#84CC16", "#FFFFFF",
  ];
  ```
  - **Remove** `#06B6D4` (cyan).
  - **Add** `#000000` (black).
- **Lines 769–810** — `ColorPicker` component. The selected swatch + the small preview dot are rendered here. When the value is `#FFFFFF`, render a visible **black border** (`border border-black` or `outline outline-1 outline-black`) so white doesn't disappear against the card background.
- **Lines 788–790** — the `+` button is already a native `<input type="color">`. Keep it; just confirm the chosen color flows back through the same `onChange` and is shown alongside the preset swatches.

White also needs a black ring anywhere else a team color is rendered as a dot/chip — check `Scoreboard.tsx`, `MatchOverPopup.tsx`, `SetOverPopup.tsx`.

---

## 2. Confirm End Set at 25 when winning by 2

**Rule logic (do NOT rewrite — reuse):**
- `src/utils/setRules.ts`
  - `setTarget(setNumber, matchFormat)` — line 22 (returns 25, or 15 for the deciding set).
  - `checkSetWon(homeScore, awayScore, setNumber, matchFormat)` — lines 26–38. Returns `"home" | "away" | null` only when `higher >= target && lead >= 2`.

**Trigger:** `src/routes/game.live.tsx` lines **136–161** — `useEffect` watches score changes, calls `checkSetWon`, and if non-null opens `SetOverPopup`.

**UI:** `src/components/game/SetOverPopup.tsx` — has "Confirm End Set" (green) and "Keep playing this set" buttons.

**Confirm handler:** `src/routes/game.live.tsx` line **306–323** (`confirmEndSet`) → calls `endSet()` then `checkMatchWon`.

**Store action:** `src/store/gameStore.ts` line **841** (`endSet`).

---

## 3. No heat map after Setter Dump

**File:** `src/routes/game.live.tsx`

- **Lines 612–627** — `SetActionModal` `onSelect`. Currently:
  ```ts
  } else if (outcome === "dump_kill") {
    setDumpKillZoneOpen(true);
  }
  ```
  Replace with a direct call:
  ```ts
  } else if (outcome === "dump_kill") {
    recordDumpKill(tracked.id, undefined);
  }
  ```
- **Lines 629–638** — delete the second `<KillHeatMap>` block (the one commented `Dump Kill zone picker — reuses KillHeatMap`).
- Remove the `dumpKillZoneOpen` `useState` declaration (search for it in this file).

**Store already supports it:** `src/store/gameStore.ts` line 39 (type) and line 422 (`recordDumpKill`) accept an optional zone.

---

## 4. Libero sub list shows wrong roster

**File:** `src/components/game/LiberoSubPopup.tsx` lines **46–51**.

The CORRECT filter is bench-only (NOT on court), excluding other Liberos:
```ts
const onCourt = new Set(rotation);
const candidates = roster.filter(
  (p) => !onCourt.has(p.id) && !isLibero(p),
);
```

If Claude's build only shows on-court players, the bug is an **inverted** filter — likely `onCourt.has(p.id)` instead of `!onCourt.has(p.id)`. Fix the `!`.

**Why this list exists:** when a Libero rotates into a front-row slot, the coach must pick a bench front-row player to swap them out for. Detection logic:
- `src/store/gameStore.ts` lines **125–134** — `findLiberoFrontRowViolation`.
- `src/store/gameStore.ts` lines **261–296** — auto-return + sets `pendingLiberoViolation`.

**Mounted at:** `src/routes/game.live.tsx` lines **783–792**.
**Confirm action:** `src/store/gameStore.ts` line **642** (`confirmLiberoSub`).
