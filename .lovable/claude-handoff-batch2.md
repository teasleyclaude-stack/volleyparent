# Claude Handoff #2 — BEFORE → AFTER snapshot

Source of truth: the current Lovable build. Match the AFTER exactly. Reuse existing helpers — do NOT rewrite.

---

## FIX 1 — Setter primary stat shows Assists (not Hit %)
## FIX 2 — Libero/DS primary stat shows Pass Avg (not Hit %)

**File:** `src/routes/game.live.tsx`
**Already implemented.** The position-aware tracked-player panel branches on `getPositionGroup(tracked.position)`.

### Current state — lines 1057–1068 (do not change)
```tsx
<div className="text-right">
  <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
    {group === "setter" ? "Assists" : group === "defensive" ? "Pass Avg" : "Hit %"}
  </div>
  <div className="text-2xl font-black tabular-nums text-primary">
    {group === "setter"
      ? tracked.stats.assists
      : group === "defensive"
        ? passAverage(tracked.stats)
        : hittingPercentage(tracked.stats)}
  </div>
</div>
```

`group` comes from `getPositionGroup(tracked.position)`:
- `"setter"`  → S
- `"defensive"` → L, DS
- `"attacker"` (default) → OH, OPP, MB

If Claude's build still shows "Hit %" for setters/liberos:
- Check `getPositionGroup` in `src/utils/stats.ts` returns the right group for `position === "S"` and `position === "L" | "DS"`.
- Check the panel reads `tracked.position` (single tracked player), not the player at a fixed rotation index.

Stat strip below also branches by group — see lines 1098–1122. Do not regress.

---

## FIX 3 — Change Tracked Player

**Already implemented.** Two entry points:

### a) Overflow menu in the live header — `src/routes/game.live.tsx` lines 803–812
```tsx
<button
  type="button"
  onClick={() => {
    setOverflowOpen(false);
    setTrackedPickerOpen(true);
  }}
  className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm font-bold text-foreground hover:bg-card"
>
  <UserCheck className="h-4 w-4" /> Change Tracked Player
</button>
```

### b) Between-sets lineup modal — `src/components/game/SetLineupModal.tsx` (header "Tracking" card opens `TrackedPlayerPicker`)

### The picker
**File:** `src/components/game/TrackedPlayerPicker.tsx` — lists full roster, highlights current tracked player (green star), calls `onSelect(playerId)`.

### The store action
`src/store/gameStore.ts` (~line 687):
```ts
setTrackedPlayer: (newPlayerId) => {
  // toggles isTracked on roster, logs TRACKING_CHANGE event
  roster.forEach(p => p.isTracked = p.id === newPlayerId);
}
```

If missing in Claude's build: wire the overflow button → open `<TrackedPlayerPicker>` → call `setTrackedPlayer(id)` from the store.

---

## FIX 4 — Last-play summary line, mirrored placement

**Already implemented.**

**File:** `src/routes/game.live.tsx` line 460
```tsx
<LastActionLine session={session} />
```

It is rendered **above** the tracked-player stat panel (`PositionAwareStatPanel`), mirroring the FanView feed location.

**Component:** `src/components/game/LastActionLine.tsx`
- Shows the latest entry from `latestFeedItem(session)` (same source as FanView — `src/lib/fanview.ts`).
- Tone-coloured left bar (kill green, error red, score blue, set purple, libero cyan, rotation blue).
- Auto-flashes "↩ Undone — …" for 600ms when an event is removed.

If Claude's build is missing it: import `LastActionLine` and place it directly above `<PositionAwareStatPanel ... />` in `game.live.tsx`. Do not roll your own — use `latestFeedItem` so the summary always matches FanView.

---

## FIX 5 — Show player position labels on court

**Already implemented.**

**File:** `src/components/game/RotationCourt.tsx` lines 158–169

```tsx
<span className="mt-0.5 max-w-full truncate text-[10px] font-medium text-muted-foreground">
  {player ? `${player.name.split(" ")[0]} · ${player.position}` : "Empty"}
</span>
{liberoCell ? (
  <span className="mt-0.5 text-[9px] font-black uppercase tracking-wider text-[#00ACC1]">
    LIB · P{rotIdx + 1}
  </span>
) : (
  <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/70">
    P{rotIdx + 1} · {isFrontRow ? "Front" : "Back"}
  </span>
)}
```

Each on-court cell shows: jersey #, first name + position (OH/MB/OPP/S/L/DS), and `P{n} · Front/Back` (or `LIB · P{n}` for liberos). If Claude's build is missing the position, ensure the `${player.position}` token is included in that first `<span>`.

---

## FIX 6 — Assist → Kill adds a point to OUR team

**Already implemented and correct.**

**File:** `src/store/gameStore.ts` lines 494–517
```ts
recordAssist: (playerId, killerId = null) => {
  const cur = get().session;
  if (!cur) return;
  const s: GameSession = JSON.parse(JSON.stringify(cur));
  const p = s.roster.find((r) => r.id === playerId);
  if (!p) return;
  p.stats.assists += 1;
  pushEvent(s, {
    type: "STAT",
    playerId,
    statType: "assist",
    /* …rotation snapshot… */
    killerId: killerId ?? undefined,
  });
  set({ session: s });
  // Always score for OUR team.
  get().addPoint(s.isHomeTeam ? "home" : "away");
},
```

The flow:
1. User taps **Set** on tracked setter → `SetActionModal` opens.
2. Picks **Assist** → `recordAssist(tracked.id)` (game.live.tsx line 619) → adds 1 assist + 1 point to OUR team.
3. `AssistKillerPrompt` then opens to attribute the kill to a teammate; selecting one calls a follow-up that adds the kill stat (point already added — do not double-score).

If Claude's build is not adding a point on assist: confirm `recordAssist` ends with `get().addPoint(s.isHomeTeam ? "home" : "away")`. Do NOT also call `addPoint` from `AssistKillerPrompt` — that would double-score.

---

## Proof checklist for Claude

For each fix, paste back:
1. The exact lines confirmed/changed
2. BEFORE / AFTER snippet (or "matches Lovable, no change needed")
3. "Verified by re-reading file after edit"

Do not say "done" without proof.

---

## FIX 7 — Settings offers Light + Dark mode

**Already implemented.**

**File:** `src/routes/settings.tsx` lines 14–17
```ts
const THEME_OPTIONS = [
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "light", label: "Light", Icon: Sun },
] as const;
```

**Render — lines 99–130:** "Appearance" section renders both options as a 2-column toggle. Active option uses `bg-primary text-primary-foreground`; tap calls `setTheme(value)`.

**Hook:** `src/hooks/useTheme.ts`
- Persists choice to localStorage key `courtsideview_theme`.
- Applies via `root.classList.toggle("light", theme === "light")` and sets `root.style.colorScheme`.
- Default = `"dark"`.

**CSS contract:** `src/styles.css` must define `:root { … }` (dark tokens) and `:root.light { … }` (light tokens) in oklch — both for `--background`, `--foreground`, `--primary`, `--card`, `--border`, `--muted-foreground`, etc.

If Claude's build is missing the toggle: ensure `THEME_OPTIONS` includes both `"dark"` and `"light"` and `useTheme` exports `{ theme, setTheme }`. Do NOT add a "system" option unless the user asks — Lovable's spec is explicit Light/Dark only. FanView pages intentionally ignore this setting and follow the watcher's own OS preference.

---

## FIX 9 — Native color wheel on the "+" button (not a HEX prompt)

**File:** `src/routes/game.setup.tsx` lines 788–796

**Already implemented in Lovable.** The "+" is a `<label>` wrapping a hidden native `<input type="color">`. Tapping the label opens the OS color wheel; the picker writes back via `onChange(e.target.value)`.

### Current state — match exactly
```tsx
<label className="ml-auto inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-popover text-[10px] text-muted-foreground">
  +
  <input
    type="color"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="sr-only"
  />
</label>
```

If Claude's build is showing a HEX text prompt, the bug is one of:
1. `<input type="color">` was replaced with `type="text"` or a `window.prompt(...)`. **Fix:** restore `type="color"`.
2. The `<input>` is not wrapped inside the `<label>` — the label's click won't open the picker. **Fix:** nest the input inside the label as shown above.
3. The input was given `display: none` instead of `className="sr-only"`. Some browsers refuse to open native pickers on truly hidden inputs. **Fix:** use `sr-only` (visually hidden but still focusable).

Do NOT add a custom HSL color wheel component. The native `<input type="color">` already provides the OS color wheel on iOS, Android, and desktop browsers.

---

## FIX 10 — Auto end-of-set works for sets 2, 3, 4, 5 (not just Set 1)

**File:** `src/routes/game.live.tsx` lines 136–163

**Already correct in Lovable** — the `useEffect` re-runs on every score change AND on `session.currentSet`, and `dismissedSetWins` is a `Set<number>` keyed by set number so dismissal in Set 1 does not block Set 2+.

### Current state — match exactly
```tsx
// Auto-detect set win after every score change.
useEffect(() => {
  if (!session) return;
  if (setOverPopup || matchOverPopup || lineupModalOpen) return;
  const winner = checkSetWon(
    session.homeScore,
    session.awayScore,
    session.currentSet,
    session.matchFormat,
  );
  if (!winner) return;
  if (dismissedSetWins.has(session.currentSet)) return;
  setSetOverPopup({
    winner,
    setNumber: session.currentSet,
    homeScore: session.homeScore,
    awayScore: session.awayScore,
  });
}, [
  session?.homeScore,
  session?.awayScore,
  session?.currentSet,
  setOverPopup,
  matchOverPopup,
  lineupModalOpen,
  dismissedSetWins,
  session,
]);
```

If Claude's build only fires on Set 1, the bug is one of:
1. **`dismissedSetWins` is a `boolean` instead of `Set<number>`.** Once flipped true in Set 1, it blocks every later set. **Fix:** `const [dismissedSetWins, setDismissedSetWins] = useState<Set<number>>(new Set());` and check `dismissedSetWins.has(session.currentSet)`. When the user picks "Keep playing this set", add the current set number to the set, don't flip a global flag.
2. **`session.currentSet` missing from the deps array.** When `endSet()` advances `currentSet` from 1→2 but the scores reset to 0–0, the effect won't re-evaluate until a score changes — which is fine — but if scores happen to land on the same values that triggered it before, React may bail. Including `session.currentSet` in deps guarantees a re-check on set change.
3. **`endSet()` doesn't reset `homeScore`/`awayScore` to 0.** Then `checkSetWon` immediately fires again for Set 2 with stale scores. Verify `endSet` in `src/store/gameStore.ts` (~line 841) sets `s.homeScore = 0; s.awayScore = 0;` and increments `s.currentSet`.
4. **`session.matchFormat` becomes undefined after Set 1.** `checkSetWon` would still work (target falls back to 25), but if `matchFormat` is read elsewhere as `session.matchFormat!` and crashes, the effect never re-runs. Verify `matchFormat` persists across `endSet()`.

`checkSetWon` itself in `src/utils/setRules.ts` is set-number-aware: target is 25 for non-deciding sets and 15 for the deciding set (set 3 in club, set 5 in HS), with win-by-2 enforced. Do NOT rewrite it — confirm it's being called with the live `session.currentSet` each time.

---

## FIX 11 — "Load" roster button reuses players from previous games

**Already implemented in Lovable.** The Load button opens a modal listing past saved sessions; tapping one copies that roster into the new game with fresh stats. Source of truth: `useHistoryStore` (persisted to localStorage as `volleyparent-history`).

### a) Read past sessions — `src/routes/game.setup.tsx` line 27
```ts
const pastSessions = useHistoryStore((s) => s.sessions);
```

### b) Load handler — `src/routes/game.setup.tsx` lines 124–139
```ts
const loadFromSession = (sessionId: string) => {
  const s = pastSessions.find((x) => x.id === sessionId);
  if (!s) return;
  // Reset stats, keep player identities
  const fresh: Player[] = s.roster.map((p) => ({
    ...p,
    stats: defaultStats(),
  }));
  // ensure exactly one tracked
  if (!fresh.some((p) => p.isTracked) && fresh.length > 0) {
    fresh[0].isTracked = true;
  }
  setRoster(fresh);
  setRotation(
    fresh.slice(0, 6).map((p) => p.id)
      .concat(Array(Math.max(0, 6 - fresh.length)).fill(null))
      .slice(0, 6),
  );
  setShowLoad(false);
};
```

### c) The button — lines 308–318
```tsx
<button
  type="button"
  onClick={() => setShowLoad(true)}
  disabled={pastSessions.length === 0}
  className={cn(
    "flex h-11 items-center justify-center gap-1.5 rounded-xl border border-border text-[11px] font-black uppercase tracking-widest active:scale-[0.98]",
    pastSessions.length === 0 ? "bg-card/50 text-muted-foreground/50" : "bg-card text-foreground",
  )}
>
  <Users className="h-3.5 w-3.5" /> Load
</button>
```

### d) The modal mount — lines 486–492
```tsx
{showLoad && (
  <LoadRosterModal
    sessions={pastSessions}
    onClose={() => setShowLoad(false)}
    onLoad={loadFromSession}
  />
)}
```

### e) The modal — `src/routes/game.setup.tsx` lines 705–760
Renders each past session as a tappable row (`HomeTeam vs AwayTeam`, date, player count). Tapping calls `onLoad(s.id)`.

### f) Persistence — `src/store/historyStore.ts`
- Zustand store with `persist` middleware, key `volleyparent-history`, version 3.
- `saveSession(s)` is called automatically when a match ends; it dedupes by id, keeps the last 50, and stores a clean `lastRoster` (stats reset).
- `sessions` survives page reloads via localStorage.

### If Claude's build's Load button does nothing or is permanently disabled, the bug is one of:

1. **`pastSessions` is empty because nothing ever calls `saveSession`.** The Load button shows `disabled` when `pastSessions.length === 0`. **Fix:** confirm the end-of-match flow (e.g. `MatchOverPopup` → `endMatch` in `src/store/gameStore.ts`) calls `useHistoryStore.getState().saveSession(session)` before navigating away. If the store isn't being written, the button has nothing to load.

2. **`useHistoryStore` is not persisted, or persisted under a different key.** Must be wrapped in `persist(...)` with `name: "volleyparent-history"` and a `createJSONStorage(() => window.localStorage)` storage that SSR-guards `typeof window !== "undefined"`. Without SSR-guard, TanStack Start's SSR pass crashes and the store silently resets on every page load.

3. **`onClick={() => setShowLoad(true)}` is wired to a no-op or `setShowLoad` never declared.** Verify line 67: `const [showLoad, setShowLoad] = useState(false);`.

4. **Modal not mounted.** Verify the `{showLoad && <LoadRosterModal ... />}` block at lines 486–492 is inside the same JSX tree as the button (still inside `<PhoneShell>`), not accidentally orphaned outside the return.

5. **`loadFromSession` writes to local state but the new game ignores it.** `handleStart` (line 141) reads from `roster` and `rotation` state — confirm `setRoster(fresh)` and `setRotation(...)` from `loadFromSession` are using the SAME `useState` setters that `handleStart` reads, not a stale closure or a duplicate `useState` block.

6. **`s.roster` on saved sessions is missing or `defaultStats()` is undefined.** Confirm `import { defaultStats } from "@/types"` and that historical sessions still have `roster: Player[]` (the v2/v3 migration in `historyStore.ts` does not drop roster — do NOT add a migration that does).

### Proof required
Paste BEFORE/AFTER of the exact lines changed in `game.setup.tsx` and `historyStore.ts` (if touched), plus one console line confirming `useHistoryStore.getState().sessions.length > 0` after finishing a match. Write "Verified by re-reading file after edit." Do NOT rewrite the modal or the store — the wiring above already works in Lovable.


---

## FIX 12 — Restrict BLOCK to front-row positions (grey out in back row)

### Goal
The BLOCK button must only fire when the tracked player ("My Player") is in a front-row rotation slot (P2/P3/P4 → indices **1, 2, 3**). When they are in the back row (P1/P5/P6 → indices **0, 4, 5**), the Block button stays **visible in the same slot** but is **greyed out and non-interactive** so users learn where the button lives. No layout shifts, no slot swap, no removed buttons.

Apply across **every panel that currently renders a Block button**: `AttackerButtons`, `SetterButtons`, and the non-Libero branch of `DefensiveButtons`. Libero panel already omits Block — leave alone.

### Files to touch (only these two)
1. `src/components/game/StatButton.tsx` — add a `disabled` prop.
2. `src/routes/game.live.tsx` — derive `isMyPlayerFrontRow`, thread through `PositionPanelProps` + `AceOrAlt`, pass to the three Block call sites.

DO NOT touch `gameStore.ts`, event types, stat schema, or `RotationCourt.tsx`. This is a UI gate, not a stat-recording change.

### Step 1 — `src/components/game/StatButton.tsx`

Add `disabled?: boolean` to the interface, accept it in the component, and apply muted styling + early-return guard.

```tsx
interface StatButtonProps {
  stat: StatType;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

export function StatButton({ stat, label, onPress, disabled = false }: StatButtonProps) {
  const [animKey, setAnimKey] = useState(0);
  const s = STYLES[stat] ?? STYLES.kill;
  const { Icon } = s;

  return (
    <button
      key={animKey}
      type="button"
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        tapHaptic("medium");
        setAnimKey((k) => k + 1);
        onPress();
      }}
      className={cn(
        "vp-press-anim flex h-[88px] w-full flex-col items-center justify-center gap-1 rounded-2xl shadow-lg shadow-black/30",
        s.bg,
        s.fg,
        disabled && "pointer-events-none cursor-not-allowed opacity-40 grayscale",
      )}
    >
      <Icon className="h-7 w-7" strokeWidth={2.4} />
      <span className="text-[12px] font-black uppercase tracking-widest">{label}</span>
    </button>
  );
}
```

### Step 2 — `src/routes/game.live.tsx`

**(a)** Right after the existing `isMyPlayerServing` line (~line 232), add:

```ts
const myPlayerRotIndex = ourRotation.indexOf(tracked.id);
const isMyPlayerFrontRow =
  myPlayerRotIndex === 1 || myPlayerRotIndex === 2 || myPlayerRotIndex === 3;
```

This re-evaluates on every render, which already happens after rally scoring, rotation advance, substitutions, set start, and tracked-player change — they all update `session` state.

**(b)** Extend `PositionPanelProps` (~line 1007):

```ts
interface PositionPanelProps {
  tracked: PlayerType;
  isMyPlayerServing: boolean;
  isMyPlayerFrontRow: boolean;   // NEW
  // ...rest unchanged
}
```

**(c)** Pass it at the panel render site (~line 465), right after `isMyPlayerServing={isMyPlayerServing}`:

```tsx
isMyPlayerFrontRow={isMyPlayerFrontRow}
```

**(d)** `AttackerButtons` Block (~line 1133) — direct disabled prop:

```tsx
<StatButton stat="block" label="Block" onPress={props.onBlock} disabled={!props.isMyPlayerFrontRow} />
```

**(e)** Extend `AceOrAlt` to forward a disabled flag to its alt slot:

```tsx
function AceOrAlt({
  isServing,
  onAce,
  altLabel,
  altOnPress,
  altStat,
  altDisabled = false,
}: {
  isServing: boolean;
  onAce: () => void;
  altLabel: string;
  altOnPress: () => void;
  altStat: StatType;
  altDisabled?: boolean;
}) {
  return (
    <div key={isServing ? "ace" : "alt"} className="animate-in fade-in duration-150">
      {isServing ? (
        <StatButton stat="ace" label="Ace" onPress={onAce} />
      ) : (
        <StatButton stat={altStat} label={altLabel} onPress={altOnPress} disabled={altDisabled} />
      )}
    </div>
  );
}
```

**(f)** Pass `altDisabled={!props.isMyPlayerFrontRow}` to BOTH `AceOrAlt` call sites — the one inside `SetterButtons` (~line 1230) and the one inside `DefensiveButtons` non-Libero branch (~line 1325).

### What NOT to do
- Do **not** hide or remove the Block button when in back row. It must remain visible (greyed out) so users learn its location.
- Do **not** add a separate `disabled` prop to `AceOrAlt`'s Ace branch — serving (P1) is always back row but the existing serving swap already replaces Block with Ace, so it's a non-issue.
- Do **not** modify the Libero defensive branch (it already has no Block).
- Do **not** change `gameStore.ts`, `handleStat`, or any event recording — the gate is purely on the button.
- Do **not** add a tooltip, toast, or popup explaining why it's disabled. Greying is the only signal.

### Proof required
Paste BEFORE/AFTER of:
1. `StatButton.tsx` interface + component body.
2. The new `isMyPlayerFrontRow` derivation in `game.live.tsx`.
3. The `PositionPanelProps` interface change.
4. All three Block call sites + the updated `AceOrAlt` signature.

Then walk through this manually and report results:
- Tracked player at P2/P3/P4 → Block fully colored, tap fires `recordStat("block")`.
- Score one rally so they rotate to P1 (serving) → Block slot now shows Ace (existing swap), no regression.
- Score until they reach P5 or P6 → Block visible but greyed, opacity ~40%, taps do nothing, no haptic.
- Repeat for a Setter and a non-Libero DS tracked player.

Write "Verified by re-reading file after edit." Do NOT claim done without the BEFORE/AFTER paste.

---

## FIX 13 — Confirm before manually ending a set

### Goal
Prevent accidental taps on the manual **End Set** button. Show a "Keep Playing / End Set N" confirmation popup before `endSet()` actually fires. Mirror the existing **End Game?** confirmation pattern already in `game.live.tsx` — same look, same feel, same destructive button color.

The auto end-of-set popup (`SetOverPopup`, fired when a side-out completes a set) already has Confirm / Keep Playing — DO NOT touch it.

### Files to touch (only this one)
`src/routes/game.live.tsx`

DO NOT touch `gameStore.ts`, `endSet()`, or `SetOverPopup.tsx`.

### Manual triggers that need confirm (currently call `endSet()` directly)
1. **Bottom-of-screen "End Set N" button** (~line 593–607).
2. **"End Set Early" item in overflow ⋯ menu** (~line 827–841).

### Step 1 — Add confirm state
Right next to `const [endConfirmOpen, setEndConfirmOpen] = useState(false);` (~line 83):
```ts
const [endSetConfirmOpen, setEndSetConfirmOpen] = useState(false);
```

### Step 2 — Add the shared handler near other set handlers
After `keepPlayingSet` (~line 344):
```ts
const handleEndSetConfirmed = () => {
  setEndSetConfirmOpen(false);
  tapHaptic("heavy");
  endSet();
  const after = useGameStore.getState().session;
  if (after && after.currentSet <= maxSets(after.matchFormat)) {
    setLineupModalOpen(true);
  }
};
```

### Step 3 — Re-wire both manual triggers to open the confirm
Bottom End Set button:
```tsx
onClick={() => {
  tapHaptic("medium");
  setEndSetConfirmOpen(true);
}}
```

Overflow "End Set Early":
```tsx
onClick={() => {
  setOverflowOpen(false);
  setEndSetConfirmOpen(true);
}}
```

### Step 4 — Render the confirm popup
Place IMMEDIATELY AFTER the existing `endConfirmOpen` modal block, BEFORE `<SetOverPopup ... />`:
```tsx
{endSetConfirmOpen && (
  <div
    className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
    onClick={() => setEndSetConfirmOpen(false)}
  >
    <div
      className="w-full max-w-[440px] rounded-t-3xl border border-border bg-popover p-5 sm:rounded-3xl"
      onClick={(e) => e.stopPropagation()}
    >
      <h3 className="text-lg font-black text-foreground">
        End Set {session.currentSet} now?
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Current score is {session.homeScore}–{session.awayScore}. The set will close
        and you'll set the lineup for Set {session.currentSet + 1}.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setEndSetConfirmOpen(false)}
          className="h-12 rounded-2xl border border-border bg-card text-sm font-black uppercase tracking-widest text-muted-foreground"
        >
          Keep Playing
        </button>
        <button
          type="button"
          onClick={handleEndSetConfirmed}
          className="h-12 rounded-2xl bg-destructive text-sm font-black uppercase tracking-widest text-destructive-foreground"
        >
          End Set {session.currentSet}
        </button>
      </div>
    </div>
  </div>
)}
```

### What NOT to do
- Do NOT touch `SetOverPopup` (auto end-of-set after a winning rally already has Confirm/Keep Playing).
- Do NOT modify `gameStore.endSet()`.
- Do NOT touch the End Match / End Game flow — it already uses `endConfirmOpen`.
- Do NOT add a separate confirm to the auto popup path — only the two MANUAL triggers above.
- Do NOT remove the lineup-modal-opens-after-end-set follow-up logic — keep it inside `handleEndSetConfirmed`.

### Proof required
Paste BEFORE/AFTER of:
1. The new state line in the component body.
2. The `handleEndSetConfirmed` helper.
3. The two re-wired `onClick` blocks (bottom button + overflow item).
4. The new `{endSetConfirmOpen && ...}` JSX block.

Then verify manually:
- Mid-set → tap bottom **End Set N** → popup shows correct score & set number.
- Tap **Keep Playing** or backdrop → popup closes, score/set unchanged.
- Tap **End Set N** in popup → set closes, lineup modal opens for next set.
- Open ⋯ → **End Set Early** → same confirm behavior.
- Win a rally that completes a set normally → original `SetOverPopup` still appears (no double prompt).

Write "Verified by re-reading file after edit." Do NOT claim done without the BEFORE/AFTER paste.
