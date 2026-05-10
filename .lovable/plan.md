# Confirm before manually ending a set

## Goal
Prevent accidental taps on the manual **End Set** buttons. Show a "Keep Playing / End Set" confirmation popup before actually ending the set. Mirror the existing "End Game?" confirmation pattern already in the file — same look, same feel.

The auto end-of-set popup (`SetOverPopup`, fired when a side-out completes a set) already has Confirm / Keep Playing buttons and is unaffected.

## What triggers a manual end-of-set today
Two places in `src/routes/game.live.tsx` call `endSet()` directly with no confirmation:
1. **Line 583–596** — bottom-of-screen "End Set N" button (visible whenever it isn't the final set).
2. **Line 817–830** — "End Set Early" item inside the overflow (⋯) menu.

Both need to route through the new confirm.

## Changes

### 1. Add confirm state (`src/routes/game.live.tsx`, near line 83 next to `endConfirmOpen`)
```ts
const [endSetConfirmOpen, setEndSetConfirmOpen] = useState(false);
```

### 2. Extract the actual "end set" effect into one helper
Both call sites share identical follow-up logic (open lineup modal if more sets remain). Define once near other handlers:
```ts
const handleEndSetConfirmed = () => {
  setEndSetConfirmOpen(false);
  endSet();
  const after = useGameStore.getState().session;
  if (after && after.currentSet <= maxSets(after.matchFormat)) {
    setLineupModalOpen(true);
  }
};
```

### 3. Wire both manual triggers to open the confirm instead
- Line 583 button `onClick`: `() => setEndSetConfirmOpen(true)` (with haptic `tapHaptic("medium")`).
- Line 819 overflow item `onClick`: close overflow, then `setEndSetConfirmOpen(true)`.

### 4. Render the confirm popup
Place right next to the existing `endConfirmOpen` block (~line 699). Same bottom-sheet-on-mobile / centered-on-desktop styling. Outside-tap = cancel:

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

### 5. Haptic on the confirm tap
`handleEndSetConfirmed` adds `tapHaptic("heavy")` before `endSet()` so it matches the auto popup's "destructive confirm" feel.

## What stays unchanged
- `SetOverPopup` (auto end-of-set after a side-out) — already has Confirm / Keep Playing.
- `gameStore.endSet()` — no logic changes.
- "End Match" / End Game flow — already confirmed via `endConfirmOpen`, untouched.
- Final-set behavior — when it's the final set the bottom button is "End Match" (different `setEndConfirmOpen` modal), so no double confirm.

## Files touched
- `src/routes/game.live.tsx` — add state, helper, two trigger swaps, one new modal block.

## Verification
1. Mid-set, tap the bottom **End Set N** button → confirm popup appears, score and set number shown correctly.
2. Tap **Keep Playing** or outside → popup closes, set is NOT ended (score unchanged).
3. Tap **End Set N** in popup → set closes, lineup modal opens for next set.
4. Open ⋯ menu → **End Set Early** → same confirm popup behavior.
5. Auto end-of-set popup still works normally on a winning rally (no double prompt).

## Claude handoff
After implementation, append this fix to `.lovable/claude-handoff-batch2.md` AND post the same prompt in chat (per user's standing rule).
