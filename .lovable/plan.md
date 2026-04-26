# Make the logo the home-screen app icon

When users tap "Add to Home Screen" on iOS or Android (or install as a PWA on desktop), the CourtsideView logo will appear as the app icon — instead of a generic browser screenshot.

## What you'll see

- iPhone home screen: rounded square with the logo on the dark app background.
- Android home screen: same icon, plus a proper "CourtsideView" app name underneath.
- Installable as a standalone web app (no browser chrome) on supported devices.

## What gets added

1. **Square icon files** generated from the existing logo, centered on the app's dark background (`#0A0E1A`):
   - `public/apple-touch-icon.png` — 180x180, used by iOS Safari.
   - `public/icon-192.png` — 192x192, used by Android.
   - `public/icon-512.png` — 512x512, used for splash screens & PWA install.
   - (Already generated and verified — logo renders cleanly.)

2. **`public/site.webmanifest`** — declares the app name, icons, theme color, and `display: standalone` so Android treats it as a real installable app.

3. **`src/routes/__root.tsx` head updates** — three new `<link>` tags:
   - `apple-touch-icon` → `/apple-touch-icon.png`
   - `manifest` → `/site.webmanifest`
   - `theme-color` meta → `#0A0E1A` (matches the app's status bar on install)

## Technical details

```text
public/
  apple-touch-icon.png   180x180  iOS home screen
  icon-192.png           192x192  Android / Chrome
  icon-512.png           512x512  PWA install + splash
  site.webmanifest                Web App Manifest
```

Manifest sets `display: standalone`, `background_color` and `theme_color` to `#0A0E1A`, `start_url: /`, and registers the 192/512 icons (including a `maskable` variant so Android can crop it into adaptive shapes).

No favicon change — the existing `favicon.ico` stays for browser tabs.

## Verification

- Visit the site on iPhone Safari → Share → Add to Home Screen → logo appears as the icon.
- Visit on Android Chrome → menu → Install app / Add to Home Screen → logo appears, app launches in standalone mode without browser UI.
