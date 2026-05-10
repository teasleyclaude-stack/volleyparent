# QA Checklist — May 10 batch

Cross-platform verification for the 12 changes shipped on May 10. Run on
iOS Safari (current iOS), Android Chrome (current), and a desktop
Chrome control. Note pass/fail per device. App is a PWA-style web app —
test both standalone (added to home screen) and in-tab.

Legend: [ ] iOS  [ ] Android  [ ] Desktop

---

## Pre-flight

- [ ] Fresh install / clear local storage on each device.
- [ ] Set device to portrait. Re-test landscape only where called out.
- [ ] One device with system **Light** mode, one with **Dark** — confirm
      both render readable.
- [ ] Set up a single test match: My Team "Hawks" (color = white),
      Opponent "Tigers" (color = navy). 8-player roster including 1
      Setter, 1 Libero, 2 OH, 1 MB, 1 RS, plus 2 bench.

---

## 1. BLOCK button — front-row only

- [ ] Track an OH. Move them to P2 (front row) → BLOCK is full opacity
      and tappable.
- [ ] Rotate so the tracked OH lands in P1 (back row) → BLOCK is at
      ~40% opacity, no haptic on tap, tap does nothing.
- [ ] Repeat in Setter panel (track the S, watch BLOCK in front vs back).
- [ ] Repeat in Defensive panel (track the L). BLOCK should stay
      disabled in all 6 rotations because Libero is back-row only.
- [ ] Long-press disabled BLOCK → still nothing fires.
- **Edge:** After a sub that puts the tracked player into P3, BLOCK
  re-enables instantly with no reload. [ ] iOS [ ] Android

---

## 2. End Set confirmation popup

- [ ] Tap the bottom "End Set N" button → confirm popup appears.
      "Keep Playing" dismisses with no change. "End Set" ends the set.
- [ ] Open ⋮ → "End Set Early" → same popup, same behavior.
- [ ] Auto end-of-set (team reaches 25 with 2-pt lead) still uses the
      existing `SetOverPopup` (no double-confirm).
- **Edge:** Open the confirm, background the app for 30s, return → the
  popup is still there and functional. [ ] iOS [ ] Android
- **Edge:** Tap "End Set" with iPhone in landscape → set ends, lineup
  modal opens cleanly without clipping.

---

## 3. Home/Away → My Team / Opponent perspective

Run the next four with **My Team = AWAY** in setup (the historical
broken case).

- [ ] Score one point for My Team → score increments on the correct
      side; "we serve" indicator follows our team, not the home slot.
- [ ] Take a timeout → counter decrements on the My Team side; opponent
      timeout decrements on Opponent side.
- [ ] Per-player stats (kill, dig, ace) all attribute to the tracked
      player and show in the report under "My Team".
- [ ] After a side-out, our rotation advances clockwise and shows on
      the dashboard court map facing us (net at top).
- **Edge:** Mid-match, force-quit and reopen → state still reads from
  My-Team perspective, no flip. [ ] iOS [ ] Android

---

## 4. Setup screen — team naming

- [ ] Setup labels read "My Team" and "Opponent" (not Home/Away).
- [ ] After saving, the live dashboard, scoreboard, and report all use
      the team names, not "Home/Away".

---

## 5. "Save & Add Another" on Add Player modal

- [ ] Open Add Player → enter "Anna #4 OH" → tap **Save & Add Another**
      → modal stays open, fields cleared, name input is focused, soft
      keyboard stays up on mobile.
- [ ] Type "Brooke #5", press Enter on the on-screen keyboard → submits
      via Enter, modal stays open.
- [ ] Tap **Save** → modal closes, both players appear in roster.
- **Edge iOS:** Enter via Bluetooth keyboard also submits.
- **Edge Android:** IME "Done" key on Gboard submits.
- **Edge:** Try to submit empty name → no submission, no crash, focus
  stays on name field.

---

## 6. Deciding-set serve = coin toss

- [ ] Club format (best of 3): play to set 2 finish. Confirm next set
      auto-assigns serve to the loser of set 2 (no popup yet).
- [ ] Force a set 2 win that brings the score to 1–1 → starting set 3
      shows the **Coin Toss** popup before any tap registers.
- [ ] Pick "My Team won the toss" → My Team serves first; popup closes;
      `DECIDING_SERVE` event in feed reads "Set 3 — Deciding Set.
      Hawks serves first."
- [ ] HS format (best of 5): repeat for set 5. Sets 1–4 use
      loser-serves; only set 5 prompts.
- **Edge — Undo:** Pick a side from the toss, then tap UNDO → popup
  re-opens, previous selection cleared. [ ] iOS [ ] Android
- **Edge:** Background the app while the popup is showing, return → popup
  still showing, score frozen, no points credited.
- **Edge:** Try to record a stat or score while popup is up → blocked.

---

## 7. Scoreboard side-swap button

- [ ] Tap swap → left/right team blocks visually swap (name, color,
      score, sets-won) with a brief animation.
- [ ] The "leading score" gold highlight follows the higher score, not
      the side.
- [ ] Score a point for the team now on the left → it increments
      correctly; underlying data unchanged (verify by tapping swap back
      and confirming totals).
- [ ] FanView in another browser/device — orientation does NOT flip on
      the watcher; only the local dashboard flips.
- [ ] First-time-only tip appears once, dismisses, and does not return.
- **Edge:** Rotate device portrait ↔ landscape with `flipped` true →
  swap state persists for the session, no glitch. [ ] iOS [ ] Android
- **Edge:** Reload page → flip resets to default (it's local UI state).

---

## 8. Starting Serve pill uses team colors

- [ ] In setup with My Team color = navy: tap "My Team" pill → pill
      background = navy.
- [ ] Tap "Opponent" pill (color = white) → pill background = white.
- [ ] Inactive pill: no background, muted gray text.

## 9. Fix — Starting Serve pill text visibility

- [ ] Active pill with **navy** bg → label text is white and clearly
      readable.
- [ ] Active pill with **white** bg → label text is near-black and
      clearly readable.
- [ ] Active pill with **yellow / light** bg → label text is near-black.
- [ ] Active pill with **black** bg → label text is white.
- [ ] Toggle quickly between pills → no flash of unreadable text on
      either side. [ ] iOS [ ] Android
- **Edge:** Test in both Light and Dark device themes.

---

## 10. Clear / swap positions on starting rotation

- [ ] Setup rotation: tap an empty slot → picker shows bench players +
      empty option. Pick a player → slot fills.
- [ ] Tap an occupied slot → sheet shows full roster grouped Bench /
      On Court (with P-badges on on-court players) plus a destructive
      **Clear position** button at the bottom.
- [ ] Tap "Clear position" → slot empties, sheet closes, no other
      slot affected.
- [ ] In the picker, pick a player who is currently in a different slot
      → the two slots **swap** in one tap.
- [ ] Pick a bench player into an occupied slot → previous occupant
      goes to bench.
- **Edge:** Try to drop the Libero into a front-row slot → existing
  libero validation still blocks/warns.
- **Edge — back-to-back swaps:** Swap A↔B, then A↔C. After both, A is
  in C's original slot, B in A's original, C in B's original.

---

## 11. Grey out stat buttons when tracked player is benched

- [ ] Tracked player on court → stat strip shows Hit % (or Pass Avg for
      Libero/DS); all stat buttons full opacity.
- [ ] Sub the tracked player to bench → within 150ms:
  - [ ] All stat buttons fade to ~30% opacity, untappable.
  - [ ] Hit %/Pass Avg replaced by red "● Bench" badge.
  - [ ] Overlay label "[Name] is on the bench" visible over buttons.
  - [ ] Top banner "…stat tracking paused" flashes briefly.
  - [ ] First-ever benching shows "Got it" tip; subsequent benchings do
        not show the tip again.
- [ ] Sub them back in → buttons re-enable instantly, banner
      "…tracking resumed" flashes.
- [ ] While benched, prior stats (K:7 D:3) remain visible — only
      incrementing is blocked.
- **Edge — Libero auto-sub churn:** Track the Libero. Play through 6
  rotations causing 4+ auto in/out cycles. Each transition flips the
  panel state correctly with no stale buttons. [ ] iOS [ ] Android
- **Edge — Long-press subs:** Long-press a court cell to swap → bench
  state recomputes correctly.
- **Edge — Change tracked mid-bench:** Player A benched, change tracked
  to Player B who is on court → buttons re-enable for B; banner does
  not re-fire.
- **Edge — Undo a sub:** Sub tracked player off, then UNDO → they
  return to court and buttons re-enable. UNDO again on the bring-on
  sub → bench state returns.

---

## 12. Manual Rotation Correction (⋮ menu)

### Open + visuals
- [ ] ⋮ → "Correct Rotation" is the first item, with the Repeat icon.
- [ ] Bottom sheet slides up, drag handle visible, header reads
      "CORRECT ROTATION" with subhead "Score and stats are not affected".
- [ ] Mini court map matches current dashboard rotation. Server cell
      has team-colored border. Tracked player has star.
- [ ] Counter shows "Corrections made: 0".

### Arrow taps
- [ ] Tap → once → mini map shifts clockwise; counter "1 forward".
      Light haptic fires (iOS Haptic Feedback API; Android Vibration).
- [ ] Tap → twice more → counter "3 forward"; map matches.
- [ ] Tap ← four times → counter shows "1 back" (net).
- [ ] Tap until counter = 0 → Confirm visually de-emphasized
      (muted/disabled look).

### Confirm
- [ ] With non-zero net, tap **Confirm** → sheet closes, dashboard
      court map reflects new rotation, score & serving unchanged,
      `Last action` line reads "Rotation corrected — moved forward N
      position(s)" (or back N).
- [ ] FanView watcher sees new court map within normal sync window;
      feed shows the corrected line.

### Cancel
- [ ] Open sheet, tap → twice, tap **Cancel — no changes** → sheet
      closes, court map shows ORIGINAL rotation, no event logged.
- [ ] Repeat with backdrop tap → same outcome.
- [ ] Drag the sheet down (touch) → dismisses with no commit. [ ] iOS
      [ ] Android

### Score / serving / stats invariants
- [ ] Note homeScore, awayScore, isHomeServing, away rotation, all
      player stats before. Confirm a 2-step forward correction. Verify
      every one of those is bit-identical after.

### Undo
- [ ] After a confirmed correction, tap UNDO on the dashboard →
      rotation restored to pre-correction; FanView updates; feed shows
      undo entry.
- [ ] Mixed: confirm +2, then undo → -2 reversed correctly (back to
      original). Confirm -1, then undo → +1 reversed.
- [ ] Multiple corrections in a row, undo one at a time → each undo
      reverses exactly one correction event.

### Edge cases
- [ ] **During pending Libero violation:** trigger a Libero front-row
      violation, then open Correct Rotation and confirm any change →
      pending violation is cleared, libero partner memory reset (this is
      intended; document if surfaced to the user).
- [ ] **Mid-rally:** Open Correct Rotation while a stat sub-menu is
      partly open → stat sub-menu closes or is non-blocking; no double
      modal.
- [ ] **Set boundary:** Confirm a correction in set 1, end set, start
      set 2 → set 2 begins with the rotation the coach last set in
      lineup modal; previous correction does not bleed into set 2.
- [ ] **Decider coin toss pending:** With deciding-set popup open,
      Correct Rotation should not be reachable from the menu (or, if
      it is, confirm produces no score/serving side-effects).
- [ ] **Background mid-correction:** Open sheet, tap → 2 times,
      background the app, return → sheet still open with same temp
      rotation and counter. [ ] iOS [ ] Android
- [ ] **Network offline:** Disable network. Confirm correction →
      rotation commits locally; FanView push fails gracefully (no
      crash, error logged to console). Re-enable → next FanView push
      reflects current rotation.
- [ ] **Rapid tap stress:** Tap → 30 times in 5 seconds → counter is
      "30 forward", court map reflects 30 % 6 = 0 net visible change
      (full cycle), Confirm logs `correctionSteps: 30`, undo reverses
      cleanly.

---

## Cross-cutting iOS / Android checks

- [ ] **Safe areas:** Bottom sheet (CorrectRotationSheet, End Set
      confirm, Coin Toss popup) respects iPhone home-indicator inset.
- [ ] **Soft keyboard (Add Player):** Modal scrolls/repositions so
      input stays visible above keyboard on both platforms.
- [ ] **Haptics:** Light haptic on rotation arrows (iOS WebKit honors
      `navigator.vibrate` poorly — accept silent on iOS Safari, must
      vibrate on Android Chrome).
- [ ] **PWA standalone:** Add to home screen, repeat smoke flow #1, #6,
      #11, #12 in standalone mode.
- [ ] **Reload mid-game:** Hard refresh during set 2 → state restores
      from local persistence; bench state, sets won, deciding-set
      pending flag all survive.
- [ ] **FanView simultaneous:** Open FanView on a second device. All
      relevant updates (score, sub, rotation correction, deciding
      serve) appear there within ~2s.

---

## Regression smoke (ensure no collateral damage)

- [ ] Record a full set: kills, errors, digs, blocks, aces, assists,
      libero passes, setter dumps, timeouts, manual sub. All show in
      the post-set report.
- [ ] Match-end popup fires correctly when match-winning set ends.
- [ ] Light/Dark theme toggle in Settings still works and persists.
- [ ] Roster screen still renders, edits still save.
- [ ] History screen still loads past sessions.

---

## Sign-off

| Section | iOS | Android | Desktop | Notes |
|---|---|---|---|---|
| 1 BLOCK | | | | |
| 2 End Set confirm | | | | |
| 3 Perspective | | | | |
| 4 Setup naming | | | | |
| 5 Save & Add Another | | | | |
| 6 Coin toss | | | | |
| 7 Scoreboard swap | | | | |
| 8 Pill colors | | | | |
| 9 Pill text contrast | | | | |
| 10 Clear/swap rotation | | | | |
| 11 Bench gating | | | | |
| 12 Manual rotation correction | | | | |
| Cross-cutting | | | | |
| Regression smoke | | | | |
