## Fix double-tap subtracting 2 points

**Cause:** The score buttons have both `onClick` (with a manual 300ms two-tap detector) and `onDoubleClick`. On a real double-tap, the browser fires `click` twice — the second `click` triggers `triggerCorrection` via the manual detector, AND `onDoubleClick` fires a third trigger. Net result: 2 corrections per double-tap.

**Fix:** In `src/components/game/Scoreboard.tsx`, remove the `onDoubleClick` handler from both the home and away score buttons (lines 163 and 196). The manual `handleTap` detector already handles both mouse double-clicks and touch double-taps via the 300ms timestamp diff, so it's the single source of truth.

After removal, each score button will only have:
```tsx
onClick={() => handleTap("home")}  // (and "away")
```

That's the entire change — two lines deleted.
