# Refactor: My Team / Opponent (us-vs-them model)

## Goal

Stop treating "Home" as a synonym for "the user's team." Today the data model already stores `isHomeTeam: boolean`, but a lot of code and labels assume **ours == home**. We'll keep home/away in storage (volleyball needs it for serve/court side and reports), and add a clean **us/them** layer on top so logic stops breaking when the tracked team is Away.

## What changes for the user

- Scoreboard, stat buttons, reports, fanview, PDF, and history will say **"My Team" / "Opponent"** (or the team's actual name) instead of "Home" / "Away".
- "Home" / "Away" wording survives only in the **setup screen** (where the user picks which side they are) and in any place where the literal court side actually matters.
- Stats, momentum, and per-team displays will be correct regardless of which side the user picked.

## What stays the same

- Storage shape: `homeScore`, `awayScore`, `homeRotationState`, `awayRotationState`, `isHomeServing`, `isHomeTeam` are unchanged. No migration needed for existing saved games.
- Volleyball rules engine in `gameStore.ts` (rotation, libero, serving) — already correct.

---

## Plan

### 1. New selector module: `src/lib/teamPerspective.ts`

Single source of truth for "us vs them." Pure functions over `GameSession`:

```ts
type Side = "home" | "away";
export const ourSide      = (s) => s.isHomeTeam ? "home" : "away";
export const oppSide      = (s) => s.isHomeTeam ? "away" : "home";
export const ourScore     = (s) => s.isHomeTeam ? s.homeScore : s.awayScore;
export const oppScore     = (s) => s.isHomeTeam ? s.awayScore : s.homeScore;
export const ourRotation  = (s) => s.isHomeTeam ? s.homeRotationState : s.awayRotationState;
export const oppRotation  = (s) => ...
export const weServe      = (s) => s.isHomeServing === s.isHomeTeam;
export const ourTeamName  = (s) => s.isHomeTeam ? s.homeTeam : s.awayTeam;
export const oppTeamName  = (s) => s.isHomeTeam ? s.awayTeam : s.homeTeam;
export const ourColor     = (s) => s.isHomeTeam ? s.homeColor : s.awayColor;
export const oppColor     = (s) => ...
export const ourSetsWon   = (s) => s.completedSets.filter(x => (x.homeScore > x.awayScore) === s.isHomeTeam).length;
export const oppSetsWon   = (s) => ...
export const ourTimeouts  = (s) => s.isHomeTeam ? s.homeTimeoutsThisSet : s.awayTimeoutsThisSet;
export const sideToOurs   = (s, side: Side) => side === ourSide(s) ? "ours" : "opp";
```

A tiny hook `useTeamPerspective(session)` returns the bundle for components.

### 2. Audit every usage

Sweep these files and replace ad-hoc ternaries with the selectors above:

- `src/store/gameStore.ts` — internal logic stays, but `addPoint` callers and `ourTeamKey` derivations route through the selector for consistency.
- `src/routes/game.live.tsx` — `weServe`, `ourRotation`, `ourTeamKey`, set-wins counters, timeout label, MatchOver winner color.
- `src/routes/game.report.$sessionId.tsx` — `ourWin = (homeWon === isHomeTeam)` and the set chips.
- `src/lib/fanview.ts` — already partially uses ours/opp; finish the conversion.
- `src/utils/pdfReport.ts` — momentum + "+ X leads" line.
- `src/components/report/MomentumGraph.tsx` — keep `isHomeOurs` as the existing prop name OR rename to `weAreHome`; either way values come from selector.
- `src/components/game/Scoreboard.tsx`, `RotationCourt.tsx` — rename internal `isHomeOurs` to `weAreHome` for clarity (UI prop only).
- `src/store/historyStore.ts` — `isHome` derivations.

### 3. Rename UI labels (presentation only)

Replace literal `"Home"` / `"Away"` strings with team name OR fallback "My Team" / "Opponent":

- Scoreboard fallbacks: `homeTeam || (isHomeTeam ? "My Team" : "Opponent")` and same for away.
- Stat buttons / +Home / +Away → `+My Team` / `+Opponent` (or just team names when set).
- MatchOver / SetOver popups → use `ourTeamName`/`oppTeamName` with "My Team"/"Opponent" fallback.
- `game.setup.tsx` keeps the literal "Home / Away" toggle since that's where the user explicitly chooses court side.
- Tutorials, tips, and toasts that say "Home" / "Away" → switch to "My Team" / "Opponent".

### 4. Lint guard (lightweight)

Add an ESLint `no-restricted-syntax` rule (or a simple grep check in CI) that flags new code references to `isHomeTeam ? "home" : "away"` outside `src/lib/teamPerspective.ts` and `src/store/gameStore.ts`. Prevents regressions.

### 5. Verification

Manual:
- Setup → pick **Away**, play a kill → **our score** goes up; momentum graph trends positive; PDF says "+ {our team} leads".
- Setup → Away, opponent serves an ace → opponent score goes up; rotation does NOT advance for our team.
- Reports for an existing **Home** session render identically to before the refactor (regression check).
- Fanview shows our team on the left/highlighted regardless of side.

Automated (optional): a small unit test on `teamPerspective.ts` with two fixture sessions (Home and Away) producing mirror-image outputs.

---

## Out of scope

- Schema migration of `fanview_sessions` JSON.
- Storing rosters for the opponent.
- Renaming `isHomeTeam` itself (touches saved sessions).

## Risk

Low–medium. All runtime logic in `gameStore.ts` already branches on `isHomeTeam`; the bugs are concentrated in display and report code, which is exactly what the selector layer fixes. Existing saved games remain readable because storage shape is unchanged.
