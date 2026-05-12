## Add Home & Settings buttons to Live Fan Mode

Add a small bottom bar with **Home** and **Settings** icons to the Live Fan Mode screen (`/score-only/live`). The existing top-left back arrow stays as-is.

### Changes

**`src/routes/score-only.live.tsx`**
- After the `<main>` block (still inside `<PhoneShell>`), add a sticky bottom nav with two tabs: Home (→ `/`) and Settings (→ `/settings`), using the same `Home` and `Settings` icons from `lucide-react` already used in `BottomTabs`.
- Match the visual style of `src/components/common/BottomTabs.tsx`: `sticky bottom-0`, `border-t border-border bg-popover/95`, `pb-[env(safe-area-inset-bottom)] backdrop-blur`, two-column grid, muted-foreground text with primary highlight when active.

### Notes
- Doesn't reuse `BottomTabs` directly because that renders all four tabs (Home/History/Roster/Settings); user asked for only Home + Settings here.
- No changes to scoring logic, fanview, or any other behavior.
