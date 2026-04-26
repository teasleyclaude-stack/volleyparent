## Problem

The Roster tab (`/roster`) still hardcodes the 8 sample players (Emma R., Sofia K., Ava M., etc.) from `src/data/sampleRoster.ts`. New users on the published site see these fake players even though Game Setup correctly starts blank. This is the leftover sample data we agreed to remove previously.

## Fix

**1. `src/routes/roster.tsx`** — Stop importing `SAMPLE_ROSTER`. Instead, derive the displayed roster from real user data:
- Read `lastRoster` from `historyStore` (the saved roster from the user's most recent game).
- Fall back to the most recent session's roster from `historyStore.pastSessions` if `lastRoster` is null.
- If both are empty, show an empty state: a friendly message like "No roster yet — set up your team from the Game Setup screen" with a `<Link to="/game/setup">` button.

**2. `src/data/sampleRoster.ts`** — Delete the file. It's no longer referenced anywhere after step 1.

## Result

- New users see an empty-state CTA on the Roster tab pointing them to Game Setup.
- Returning users see their actual most-recent roster (with stats reset to zero, matching how Game Setup auto-populates).
- No fake "Emma R. / Sofia K." players appear anywhere in the published app.
