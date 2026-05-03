# Claude Handoff — BEFORE → AFTER snapshot

This is the **current Lovable build state** (BEFORE) and the **exact target state** (AFTER) for four fixes. Match the AFTER exactly. Reuse existing logic — do NOT rewrite helpers.

---

## FIX 1 — Team color swatches

**File:** `src/routes/game.setup.tsx`

### BEFORE (lines 764–767)
```ts
const SWATCHES = [
  "#F4B400", "#3B82F6", "#EF4444", "#10B981", "#8B5CF6",
  "#EC4899", "#F97316", "#06B6D4", "#84CC16", "#FFFFFF",
];
```

### AFTER
```ts
const SWATCHES = [
  "#F4B400", "#3B82F6", "#EF4444", "#10B981", "#8B5CF6",
  "#EC4899", "#F97316", "#000000", "#84CC16", "#FFFFFF",
];
```
- Removed `#06B6D4` (cyan), added `#000000` (black).

### BEFORE — preview dot (lines 781–784)
```tsx
<span
  className="inline-block h-5 w-5 rounded-full border border-border"
  style={{ backgroundColor: value }}
/>
```

### AFTER
```tsx
<span
  className={cn(
    "inline-block h-5 w-5 rounded-full border",
    value.toLowerCase() === "#ffffff" ? "border-black" : "border-border",
  )}
  style={{ backgroundColor: value }}
/>
```

### BEFORE — swatch button (lines 800–812)
```tsx
<button
  key={c}
  type="button"
  onClick={() => onChange(c)}
  aria-label={`Pick ${c}`}
  className={cn(
    "h-7 w-full rounded-md border transition-transform active:scale-95",
    value.toLowerCase() === c.toLowerCase()
      ? "border-foreground ring-2 ring-foreground/40"
      : "border-border",
  )}
  style={{ backgroundColor: c }}
/>
```

### AFTER
```tsx
<button
  key={c}
  type="button"
  onClick={() => onChange(c)}
  aria-label={`Pick ${c}`}
  className={cn(
    "h-7 w-full rounded-md border transition-transform active:scale-95",
    value.toLowerCase() === c.toLowerCase()
      ? "border-foreground ring-2 ring-foreground/40"
      : c.toLowerCase() === "#ffffff"
        ? "border-black"
        : "border-border",
  )}
  style={{ backgroundColor: c }}
/>
```

The `+` button at lines 788–796 is already a native color picker — keep it untouched.

Also apply the white→black-border rule wherever a team color dot/chip is rendered: `src/components/game/Scoreboard.tsx`, `MatchOverPopup.tsx`, `SetOverPopup.tsx`.

---

## FIX 2 — Confirm End Set at 25 (win-by-2)

**Already implemented. Do NOT rewrite.**

### Source of truth — `src/utils/setRules.ts` lines 26–38
```ts
export function checkSetWon(
  homeScore: number,
  awayScore: number,
  setNumber: number,
  matchFormat: MatchFormat,
): "home" | "away" | null {
  const target = setTarget(setNumber, matchFormat);  // 25 or 15
  const higher = Math.max(homeScore, awayScore);
  const lead = Math.abs(homeScore - awayScore);
  if (higher < target) return null;
  if (lead < 2) return null;
  return homeScore > awayScore ? "home" : "away";
}
```

### Wiring (already in place)
- `src/routes/game.live.tsx` lines 136–161 — `useEffect` watches `homeScore`/`awayScore`, calls `checkSetWon`, opens `<SetOverPopup>`.
- `confirmEndSet` (~line 306) → `endSet()` in `src/store/gameStore.ts` (~line 841).

If the popup isn't appearing in your build, the bug is one of:
1. `useEffect` deps array missing `homeScore`/`awayScore`/`currentSet`/`matchFormat`.
2. `<SetOverPopup>` not mounted in JSX tree.
3. `matchFormat` undefined at call site.

Read those exact lines and report which — do NOT rewrite `checkSetWon`.

---

## FIX 3 — No heat map after Setter Dump

**File:** `src/routes/game.live.tsx`

### BEFORE (lines 612–638)
```tsx
{/* Setter SET sub-menu */}
<SetActionModal
  open={setActionOpen}
  onCancel={() => setSetActionOpen(false)}
  onSelect={(outcome: SetOutcome) => {
    setSetActionOpen(false);
    if (outcome === "assist") {
      recordAssist(tracked.id);
      setAssistPromptOpen(true);
    } else if (outcome === "dump_kill") {
      setDumpKillZoneOpen(true);
    } else if (outcome === "setting_error") {
      recordSettingError(tracked.id, "other");
    }
  }}
/>

{/* Dump Kill zone picker — reuses KillHeatMap */}
<KillHeatMap
  open={dumpKillZoneOpen}
  onSelect={(zone) => {
    setDumpKillZoneOpen(false);
    recordDumpKill(tracked.id, zone);
  }}
  onCancel={() => setDumpKillZoneOpen(false)}
  previousByZone={previousByZone}
/>
```

### AFTER
```tsx
{/* Setter SET sub-menu */}
<SetActionModal
  open={setActionOpen}
  onCancel={() => setSetActionOpen(false)}
  onSelect={(outcome: SetOutcome) => {
    setSetActionOpen(false);
    if (outcome === "assist") {
      recordAssist(tracked.id);
      setAssistPromptOpen(true);
    } else if (outcome === "dump_kill") {
      recordDumpKill(tracked.id, undefined);
    } else if (outcome === "setting_error") {
      recordSettingError(tracked.id, "other");
    }
  }}
/>
{/* Dump Kill zone picker removed — no heat map for setter dumps */}
```

Then DELETE the `dumpKillZoneOpen` `useState` line earlier in the file (search `dumpKillZoneOpen`).

`recordDumpKill` in `src/store/gameStore.ts` (~line 422) already accepts an optional zone — `undefined` is correct.

---

## FIX 4 — Libero sub list (bench-only)

**File:** `src/components/game/LiberoSubPopup.tsx`

### CURRENT state in Lovable build (lines 46–51) — already correct
```ts
// Candidate sub-in players are bench players (not currently on court),
// excluding other Liberos (a Libero cannot sub in for a Libero in the front row).
const onCourt = new Set(rotation);
const candidates = roster.filter(
  (p) => !onCourt.has(p.id) && !isLibero(p),
);
```

### If Claude's build shows on-court players instead, the bug is the missing `!`:
```ts
// WRONG — this returns on-court players
const candidates = roster.filter((p) => onCourt.has(p.id) && !isLibero(p));
```

Fix by ensuring `!onCourt.has(p.id)`. Also verify `rotation` being passed in is the OUR-team rotation (`session.isHomeTeam ? homeRotationState : awayRotationState`), not the opponent's.

Detection logic that triggers this popup (do not touch):
- `src/store/gameStore.ts` lines 125–134 — `findLiberoFrontRowViolation`
- `src/store/gameStore.ts` lines 261–296 — auto-return + `pendingLiberoViolation`
- Mounted at `src/routes/game.live.tsx` lines 783–792
- Confirm action: `confirmLiberoSub` in `src/store/gameStore.ts` (~line 642)

---

## Proof checklist for Claude

For each fix, paste back:
1. The exact lines you changed
2. BEFORE / AFTER snippet
3. "Verified by re-reading file after edit"

Do not say "done" without proof.
