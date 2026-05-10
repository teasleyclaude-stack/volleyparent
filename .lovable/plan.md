## Goal
Allow adding multiple players from the Add Player modal without closing back to the Setup screen between each one.

## Current behavior
`AddPlayerModal` (`src/routes/game.setup.tsx`) calls `onAdd` then the parent immediately calls `setShowAdd(false)`, dismissing the sheet. To add another player the user must tap "+ Add Player" again.

## Options

### Option A — "Save & Add Another" secondary button (recommended)
Keep the existing primary **Add Player** button (saves and closes — preserves current muscle memory). Add a secondary button **Save & Add Another** that:
- Calls `onAdd(name, num, position)`
- Resets the form fields (`name=""`, `number=""`, position stays on last choice for speed)
- Keeps the modal open and refocuses the name input
- Auto-suggests next jersey # (optional: smallest unused 0–99)

Pros: zero friction for the common "one player" case, explicit for bulk entry.
Cons: two buttons in the footer.

### Option B — Always stay open; close via X / backdrop
Make the primary **Add Player** button always reset the form and stay open. User dismisses with the X or by tapping the backdrop when done.
Pros: simplest UI (one button).
Cons: changes existing behavior — a user adding one player must take an extra tap to dismiss.

### Option C — "Keep open" toggle / checkbox
Add a small "Add another after saving" checkbox above the submit button. When checked, the modal stays open and resets after each save; when unchecked (default), behaves as today.
Pros: user-controlled, discoverable.
Cons: extra UI element, modal feels more cluttered.

### Option D — Inline roster list inside the modal
Convert the modal into a fuller "Roster Builder" sheet that shows the current roster at the top and a single inline form below; each save appends to the visible list. User taps Done to close.
Pros: best for adding many players, gives visible progress.
Cons: bigger refactor, duplicates the roster list already on the Setup screen behind the modal.

## Recommendation
**Option A**. Smallest change, keeps the one-player path identical, and makes bulk entry obvious. Implementation is a ~15-line edit confined to `AddPlayerModal` plus a new `onAddAnother` callback (or reuse `onAdd` and let the modal control its own close).

## Technical notes (for implementation step)
- Add `onAddAndContinue` prop OR change `onAdd` signature to return whether to close, and let parent decide. Cleanest: lift close decision into the modal — pass `onAdd` (no close) and `onClose`; modal calls `onClose` itself for the "Add Player" button and skips it for "Save & Add Another".
- After "Save & Add Another": clear name + number, keep position, autofocus name input via the existing ref pattern (add a `useRef<HTMLInputElement>`).
- No changes outside `src/routes/game.setup.tsx`.