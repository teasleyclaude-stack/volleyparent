# Claude Handoff — Deciding-Set Coin Toss

Source of truth: the current Lovable build. Match the AFTER exactly. Reuse existing helpers — do NOT rewrite.

---

## Rule

- Sets 1 … (n−1): loser of the just-completed set serves first. **Unchanged.**
- Deciding set (Set 3 Club / Set 5 HS): **do NOT auto-assign** `isHomeServing`. Prompt the user with a coin-toss modal and record their selection.

`n` = `decidingSet(matchFormat)` from `src/utils/setRules.ts` (3 for `"club"`, 5 for `"highschool"`).

---

## FIX 1 — `isDecidingSet` helper + amber set label

**File:** `src/utils/setRules.ts`

```ts
export function isDecidingSet(setNumber: number, matchFormat: MatchFormat): boolean {
  return setNumber === decidingSet(matchFormat);
}
```

`getSetLabel` returns the amber decider label *before* the WIN-BY-2 fallback only when not in extended play:

```ts
if (higher >= target && lead < 2) {
  return { text: "WIN BY 2", color: "#FF4D4D" };
}
if (isDecidingSet(setNumber, matchFormat)) {
  return { text: "DECIDING SET — TO 15", color: "#F59E0B" };
}
return { text: `TO ${target}`, color: null };
```

Color token: `#F59E0B` (amber). Reused everywhere — do NOT introduce a new token.

---

## FIX 2 — Store: defer serve assignment, add `setDecidingFirstServer`

**File:** `src/store/gameStore.ts` (`endSet`, ~lines 849–891)

```ts
const nextSet = s.currentSet + 1;
const nextIsDecider = nextSet === (s.matchFormat === "club" ? 3 : 5);

if (nextIsDecider) {
  // Defer serve assignment to the coin-toss prompt.
  s.pendingDecidingServePrompt = true;
} else {
  if (homeWonSet) s.isHomeServing = false;
  else if (awayWonSet) s.isHomeServing = true;
}
s.currentSet = nextSet;
// … reset scores / timeouts / libero partner memory as before
```

New action (right after `endSet`):

```ts
setDecidingFirstServer: (team) => {
  const s = JSON.parse(JSON.stringify(get().session));
  s.isHomeServing = team === "home";
  s.pendingDecidingServePrompt = false;
  pushEvent(s, {
    type: "DECIDING_SERVE",
    setNumber: s.currentSet,
    homeScore: 0, awayScore: 0,
    homeRotationState: s.homeRotationState,
    awayRotationState: s.awayRotationState,
    isHomeServing: s.isHomeServing,
    scoringTeam: team,
  });
  set({ session: s });
},
```

`undoLastAction` must handle `DECIDING_SERVE`: clear `isHomeServing` decision and restore `pendingDecidingServePrompt = true`.

Add migration default for `pendingDecidingServePrompt = false` in the persisted-state migrator.

---

## FIX 3 — Types

**File:** `src/types/index.ts`

- `EventType` union adds `"DECIDING_SERVE"`.
- `GameSession` adds `pendingDecidingServePrompt?: boolean`.

---

## FIX 4 — `CoinTossPopup` (new component)

**File:** `src/components/game/CoinTossPopup.tsx`

Full-screen, **non-dismissable** modal (no X, no backdrop close, no Esc). z-index `60`.

Props:
```ts
{ open; setNumber; homeTeam; awayTeam; homeColor; awayColor; isHomeOurs; onSelect(team: "home"|"away") }
```

Layout (max-w 420):
- 🪙 emoji (28px)
- "COIN TOSS" — 12px, black, uppercase, tracked, muted
- "Set {N} — Deciding Set" — 16px black, color `#F59E0B`
- Body: "Who won the coin toss and will serve first?"
- Two stacked 64px-tall buttons (rounded-2xl, border-2). Background = team color, text = `readableTextColor(teamColor)` from `src/lib/colorContrast.ts`.
- Home button first, Away second (regardless of `isHomeOurs`).
- `tapHaptic("heavy")` on open, `tapHaptic("medium")` on select.

---

## FIX 5 — Wire popup in live route

**File:** `src/routes/game.live.tsx`

Local state: `const [coinTossOpen, setCoinTossOpen] = useState(false);`

After `endSet()` the flow is: `SetOverPopup` → confirm → `SetLineupModal` opens. Both `onKeep` and `onConfirm` must check the flag and open the popup:

```tsx
const after = useGameStore.getState().session;
if (after?.pendingDecidingServePrompt) setCoinTossOpen(true);
```

Safety effect (handles app reload mid-flow):

```tsx
useEffect(() => {
  if (!session?.pendingDecidingServePrompt) return;
  if (lineupModalOpen || setOverPopup || matchOverPopup) return;
  if (coinTossOpen) return;
  setCoinTossOpen(true);
}, [session?.pendingDecidingServePrompt, lineupModalOpen, setOverPopup, matchOverPopup, coinTossOpen]);
```

Render near the other popups:

```tsx
<CoinTossPopup
  open={coinTossOpen}
  setNumber={session.currentSet}
  homeTeam={session.homeTeam}
  awayTeam={session.awayTeam}
  homeColor={session.homeColor}
  awayColor={session.awayColor}
  isHomeOurs={session.isHomeTeam}
  onSelect={(team) => {
    setDecidingFirstServer(team);
    setCoinTossOpen(false);
    fanview.pushNow().catch((e) => console.error("fanview push failed", e));
  }}
/>
```

`setDecidingFirstServer` comes from `useGameStore`.

---

## FIX 6 — Scoreboard amber treatment

**File:** `src/components/game/Scoreboard.tsx` (~line 176)

```tsx
import { getSetLabel, maxSets, formatLabelShort, isDecidingSet } from "@/utils/setRules";
…
{isDecidingSet(setNumber, matchFormat) ? (
  <span style={{ color: "#F59E0B" }}>SET {setNumber} — DECIDING</span>
) : (
  /* existing label */
)}
```

The "TO 15 / DECIDING SET — TO 15" pill keeps using `getSetLabel`'s color.

---

## FIX 7 — LastActionLine accent

**File:** `src/components/game/LastActionLine.tsx`

Add tone:
```ts
const TONE_ACCENT: Record<FanviewFeedItem["tone"], string> = {
  …,
  deciding: "#F59E0B",
};
```

---

## FIX 8 — FanView

**File:** `src/lib/fanview.ts`

- Add tone `"deciding"`.
- Map `DECIDING_SERVE` event → feed item:
  `"Set {N} — Deciding Set. {Team} serves first."`, tone `"deciding"`.
- `buildState` / `buildMeta` expose `isDeciding: boolean = isDecidingSet(state.currentSet, meta.matchFormat)`.

**File:** `src/routes/fanview.$sessionId.tsx`

Render an amber "DECIDING SET" badge next to the set number when `state.isDeciding` (already in place around line 276).

---

## Verification (matches user test cases)

1. Set 1 ends, normal flow: no coin toss; loser serves Set 2.
2. Club Set 2 ends 1–1: Lineup modal → CoinTossPopup → choose team → Set 3 starts with chosen server. Scoreboard shows `SET 3 — DECIDING` (amber) and `DECIDING SET — TO 15` pill.
3. HS Set 4 ends 2–2: same flow for Set 5.
4. Selecting either team correctly sets `isHomeServing` regardless of `session.isHomeTeam`.
5. LastActionLine shows the deciding-serve line with amber accent.
6. FanView feed shows `"Set N — Deciding Set. {Team} serves first."`; FanView header shows DECIDING SET badge.
7. CoinTossPopup cannot be dismissed without selecting a team.
8. App reload while `pendingDecidingServePrompt === true` re-opens the popup.
