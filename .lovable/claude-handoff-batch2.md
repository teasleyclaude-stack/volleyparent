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
