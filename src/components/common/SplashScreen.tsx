import { useEffect, useState } from "react";
const logoVideo = "/courtsideview-logo-animation.mp4";

const SESSION_KEY = "courtsideview-splash-shown";
const MIN_DISPLAY_MS = 2000;
const MAX_DISPLAY_MS = 4000;
const EXIT_MS = 300;

interface SplashScreenProps {
  children: React.ReactNode;
}

/**
 * Two-phase brand splash (web adaptation of the native spec).
 * - Always dark (#0A0E1A) regardless of user theme.
 * - Runs parallel startup tasks during the hold phase.
 * - Min 2000ms / Max 4000ms display, then 300ms fade-out.
 * - Shows once per browser session.
 */
export function SplashScreen({ children }: SplashScreenProps) {
  const [show, setShow] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    let seen = false;
    try {
      seen = Boolean(window.sessionStorage.getItem(SESSION_KEY));
    } catch {
      /* noop */
    }
    if (seen) return;

    setShow(true);
    try {
      window.sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* noop */
    }

    const startedAt = performance.now();
    let exitTimer: ReturnType<typeof setTimeout>;
    let removeTimer: ReturnType<typeof setTimeout>;

    const beginExit = () => {
      setExiting(true);
      removeTimer = setTimeout(() => setShow(false), EXIT_MS);
    };

    // Run startup tasks in parallel; never block the UI on failure.
    const startupTasks = Promise.allSettled([
      // Theme is already booted via inline script in __root; this is a noop read.
      Promise.resolve().then(() => {
        try {
          window.localStorage.getItem("courtsideview_theme");
        } catch {
          /* noop */
        }
      }),
      // Touch persisted stores so they hydrate before nav appears.
      import("@/store/gameStore").catch(() => null),
      import("@/store/historyStore").catch(() => null),
    ]);

    // Hard cap at MAX_DISPLAY_MS regardless of task state.
    const failsafe = setTimeout(beginExit, MAX_DISPLAY_MS);

    startupTasks.then(() => {
      const elapsed = performance.now() - startedAt;
      const wait = Math.max(0, MIN_DISPLAY_MS - elapsed);
      exitTimer = setTimeout(() => {
        clearTimeout(failsafe);
        beginExit();
      }, wait);
    });

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
      clearTimeout(failsafe);
    };
  }, []);

  return (
    <>
      {children}
      {show && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-300"
          style={{
            backgroundColor: "#0A0E1A",
            opacity: exiting ? 0 : 1,
            pointerEvents: exiting ? "none" : "auto",
          }}
          aria-hidden={exiting}
        >
          {/* Logo mark — Phase 1 (animated) */}
          <video
            src={logoVideo}
            autoPlay
            muted
            playsInline
            preload="auto"
            aria-label="CourtsideView"
            className="cv-splash-logo h-40 w-40 object-contain sm:h-52 sm:w-52"
          />

          {/* Wordmark — Phase 2 */}
          <h1
            className="cv-splash-wordmark mt-4 text-[32px] font-bold leading-none"
            style={{ color: "#F0F4FF" }}
          >
            CourtsideView
          </h1>

          {/* Divider — Phase 3 */}
          <div
            className="cv-splash-divider mt-5 h-px w-48 origin-center"
            style={{ backgroundColor: "#39FF14" }}
          />

          {/* Tagline — Phase 3 */}
          <p
            className="cv-splash-tagline mt-3 text-[13px] font-medium uppercase"
            style={{ color: "#9BA3B8", letterSpacing: "0.15em" }}
          >
            Real-Time Volleyball Stat Tracking
          </p>

          {/* Three-dot loader */}
          <div className="absolute bottom-16 flex items-center gap-3">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="cv-splash-dot block h-2 w-2 rounded-full"
                style={{
                  backgroundColor: "#39FF14",
                  animationDelay: `${i * 200}ms`,
                }}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
