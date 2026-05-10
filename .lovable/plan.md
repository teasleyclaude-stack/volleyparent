## Goal
Stop auto-assigning serve in the deciding set (Set 3 Club / Set 5 HS). Prompt the user with a coin-toss modal instead. Sets before the decider keep current "loser serves next" behavior. Add deciding-set visual treatment on scoreboard, last-action line, and FanView.

## Files to change

1. **`src/utils/setRules.ts`** — add `isDecidingSet(currentSet, matchFormat)` helper. Update `getSetLabel` so the deciding set returns `"DECIDING SET — TO 15"` (color `#F59E0B`) instead of `"TO 15"`.

2. **`src/store/gameStore.ts`** (`endSet`, ~lines 841–873)
   - Keep loser-serves-next assignment for non-deciding sets.
   - When the **next** set (`s.currentSet + 1`) is the deciding set, set a new transient flag `s.pendingDecidingServePrompt = true` and DO NOT mutate `isHomeServing` here. Add `pendingDecidingServePrompt?: boolean` to `GameSession` in `src/types/index.ts`.
   - Add a new store action `setDecidingFirstServer(team: 'home' | 'away')` that sets `isHomeServing` accordingly, clears `pendingDecidingServePrompt`, and pushes a synthetic feed-visible event (reuse SET_END pattern OR add a dedicated `DECIDING_SERVE` MatchEvent type — see Technical notes).

3. **`src/components/game/CoinTossPopup.tsx`** (new)
   - Props: `open`, `setNumber`, `homeTeam`, `awayTeam`, `homeColor`, `awayColor`, `isHomeOurs`, `onSelect(team: 'home'|'away')`.
   - Full-screen modal, non-dismissable (no X, no backdrop close, no Esc). Coin emoji 🪙, title "COIN TOSS" (uppercase tracked muted), subtitle `Set {N} — Deciding Set` (amber #F59E0B), body copy, two stacked full-width 64px buttons showing each team name with its team color border. `tapHaptic("medium")` on select.

4. **`src/routes/game.live.tsx`** (`confirmEndSet`, ~lines 310–335 and `handleEndSetConfirmed` ~347–355)
   - After `endSet()` and before/after opening `SetLineupModal`, check `after.pendingDecidingServePrompt`. The flow becomes: confirm end set → SetLineupModal → on lineup confirm, if `pendingDecidingServePrompt`, open `<CoinTossPopup>` before the new set is "live". On select, call `setDecidingFirstServer(team)` then push FanView (`fanview.pushNow()`).
   - Render `<CoinTossPopup>` near the other popups (~line 776+).

5. **`src/components/game/Scoreboard.tsx`** (~line 157)
   - When `isDecidingSet(setNumber, matchFormat)`, override the set label area to show `SET {N} — DECIDING` in amber. Use `getSetLabel`'s updated decider text for the to-15 indicator.

6. **`src/lib/fanview.ts`**
   - In `latestFeedItem` / event-to-feed mapping (~line 304), when the new `DECIDING_SERVE` event (or the next SCORE in a deciding set with no prior SCORE) is encountered, emit:
     `"Set {N} — Deciding Set. {Team} serves first."` with tone `set` (existing) or add a new `deciding` tone mapped to `#F59E0B`. Add `LastActionLine` accent mapping.
   - In `buildState`/`buildMeta`, expose `isDeciding: boolean` so FanView client can render a "DECIDING SET" amber badge next to the set number.
   - `fanview.$sessionId.tsx`: render the badge when `state.isDeciding`.

## Flow

```text
Set ends
  └─ SetOverPopup → Confirm End Set
        └─ endSet() (store)
              ├─ if next set is decider → mark pendingDecidingServePrompt, leave isHomeServing untouched
              └─ else → isHomeServing = loser of just-completed set (current behavior)
        └─ SetLineupModal opens (currentSet already incremented)
              └─ onConfirm
                    ├─ if pendingDecidingServePrompt → open CoinTossPopup (blocking)
                    │     └─ onSelect(team) → setDecidingFirstServer(team) → fanview.pushNow()
                    └─ else → set is live, normal play resumes
```

## Verify (matches user's test cases)

1. Set 1 ends, normal flow: no coin toss; loser serves Set 2.
2. Club Set 2 ends with series 1–1: SetLineupModal → CoinTossPopup → choose team → Set 3 starts with chosen server, scoreboard shows `SET 3 — DECIDING` amber, label `DECIDING SET — TO 15`.
3. HS Set 4 ends 2–2: same flow for Set 5.
4. Selecting either team correctly sets `isHomeServing` regardless of `isHomeTeam`.
5. LastActionLine shows `Deciding set — {Team} serving first` in amber.
6. FanView feed shows the deciding-set message; FanView scoreboard shows DECIDING SET badge.
7. Coin toss modal cannot be dismissed without selecting.

## Technical notes

- New event type `DECIDING_SERVE` (extend `EventType`) is preferred over reusing SET_END so undo and feed history stay clean. Push it from `setDecidingFirstServer`. Add to event→feed mapping.
- `pendingDecidingServePrompt` is transient state on the session (similar to `pendingLiberoViolation`). Add migration default `false` in the persisted-state migrator (`gameStore.ts` migrate fn).
- Guided Tour (Update 19) only reaches Set 1 — no changes required.
- All colors via tokens where possible; the amber `#F59E0B` matches the existing `getSetLabel` "TO 15" color so no new token needed.