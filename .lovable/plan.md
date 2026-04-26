# PWA install banner + standalone polish

Add an in-app prompt that invites users to install CourtsideView to their home screen, and tighten how the app looks when launched in standalone (PWA) mode.

## What you'll see

- A small banner slides up at the bottom of the app the first time someone visits on a phone/desktop browser:
  - **Android / Chrome / Edge / desktop**: shows an **Install** button that triggers the browser's native install dialog.
  - **iPhone Safari**: shows a friendly "Add to Home Screen" card with the two-step instructions (since iOS has no one-tap install).
  - A close (×) button dismisses it; dismissals are remembered for 14 days.
- The banner never shows when the app is already installed (running standalone) or inside the Lovable preview iframe.
- When launched from the home screen, the app fills the whole screen with no browser chrome and properly respects the iOS notch / Android status bar.

## What gets added / changed

1. **`src/components/common/InstallBanner.tsx`** (new)
   - Listens for the `beforeinstallprompt` event on Android/Chromium and stores it.
   - Detects iOS Safari via UA and shows manual instructions instead.
   - Hides itself if `display-mode: standalone` matches, if `navigator.standalone` is true, if running in an iframe, or if recently dismissed (`localStorage`).
   - Hides itself on the `appinstalled` event.

2. **`src/components/common/PhoneShell.tsx`** (edit)
   - Add `pt-[env(safe-area-inset-top)]` so the header clears the iOS notch / Android status bar in standalone mode. Bottom safe-area is already handled.

3. **`src/routes/__root.tsx`** (edit)
   - Update viewport meta to include `viewport-fit=cover` so `env(safe-area-inset-*)` actually returns non-zero values.
   - Mount `<InstallBanner />` once inside `RootComponent` so it shows on every page.

## Technical details

```text
src/components/common/
  InstallBanner.tsx   New — handles beforeinstallprompt + iOS fallback UI
  PhoneShell.tsx      +pt-[env(safe-area-inset-top)]

src/routes/__root.tsx
  viewport: "width=device-width, initial-scale=1, viewport-fit=cover"
  <RootComponent>: render <InstallBanner /> alongside <Outlet />
```

No service worker, no `vite-plugin-pwa` (per Lovable docs guidance — the existing manifest is enough for installability and avoids preview-iframe cache issues). The banner uses only browser APIs already available in modern Chromium and iOS Safari.

## Verification

- Open the published site on Android Chrome → banner appears with **Install** → tapping it opens the native install sheet → after install, the banner stops appearing and the app opens fullscreen.
- Open the published site on iPhone Safari → banner appears with the two-step "Add to Home Screen" instructions → after adding, the banner stops appearing and the app opens fullscreen with the status bar styled to match the dark theme.
- Tap × → banner stays dismissed for 14 days.
- Inside the Lovable editor preview iframe → banner does not appear (so it never gets in your way while building).
