## Goal
Remove the "HS" / "CLUB" abbreviation shown next to the team names on the live Scoreboard and replace it with "Best of 3" or "Best of 5" in a smaller text, matching the wording used in the Game Setup screen.

## Changes

### 1. `src/utils/setRules.ts`
Update `formatLabelShort` to return the new wording:
- `club` → `"Best of 3"`
- `highschool` → `"Best of 5"`

(Keeping the function name avoids touching other callers. `formatLabel` stays as-is in case it's used elsewhere; if unused we leave it to avoid scope creep.)

### 2. `src/components/game/Scoreboard.tsx`
The pill currently rendered next to the team set counts:
```tsx
<span className="ml-1 rounded-full bg-card px-1.5 py-0.5 text-[9px] font-black tracking-widest text-muted-foreground">
  {formatLabelShort(matchFormat)}
</span>
```
- Keep the pill but with the new label text ("Best of 3" / "Best of 5").
- Drop `tracking-widest` and uppercase styling so the longer label reads naturally; keep `text-[9px]` for the "smaller text" requirement, switch to `font-semibold` for legibility.

## Out of Scope
- `SetOverPopup`, `MatchOverPopup`, and the report badge already use the longer "Set X of N" / format wording per the previous request — no changes needed unless the user reports the same issue there.
