import { useEffect, useRef, useState } from "react";
const logoVideo = "/courtsideview-logo-animation.mp4";
const logoFallback = "/courtsideview-logo.png";

const SESSION_KEY = "courtsideview-splash-shown";
// Animation is 8s; keep min ≥ animation length so it never cuts off.
const VIDEO_DURATION_MS = 8000;
const MIN_DISPLAY_MS = VIDEO_DURATION_MS; // 8000
// Failsafe must exceed video + a small buffer in case `ended` never fires.
const MAX_DISPLAY_MS = 10000;
const EXIT_MS = 300;
// If the video hasn't started playing within this window, show the static logo.
const FALLBACK_GRACE_MS = 800;

interface SplashScreenProps {
  children: React.ReactNode;
}

/**
 * Brand splash with animated logo video.
 * - Always dark (#0A0E1A) regardless of user theme.
 * - Runs parallel startup tasks during the hold phase.
 * - Waits for BOTH the video `ended` event AND the min display before exiting,
 *   so the animation always completes. Failsafe at MAX_DISPLAY_MS.
 * - Shows once per browser session.
 */
export function SplashScreen({ children }: SplashScreenProps) {
  const [show, setShow] = useState(false);
  const [exiting, setExiting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

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
    let exitTimer: ReturnType<typeof setTimeout> | undefined;
    let removeTimer: ReturnType<typeof setTimeout> | undefined;
    let exited = false;

    const beginExit = () => {
      if (exited) return;
      exited = true;
      setExiting(true);
      removeTimer = setTimeout(() => setShow(false), EXIT_MS);
    };

    // Schedule exit only after BOTH startup tasks settle AND video has played
    // for at least MIN_DISPLAY_MS. Falls back to failsafe if video stalls.
    const scheduleExitAfterMin = () => {
      const elapsed = performance.now() - startedAt;
      const wait = Math.max(0, MIN_DISPLAY_MS - elapsed);
      exitTimer = setTimeout(beginExit, wait);
    };

    // Run startup tasks in parallel; never block the UI on failure.
    const startupTasks = Promise.allSettled([
      Promise.resolve().then(() => {
        try {
          window.localStorage.getItem("courtsideview_theme");
        } catch {
          /* noop */
        }
      }),
      import("@/store/gameStore").catch(() => null),
      import("@/store/historyStore").catch(() => null),
    ]);

    // Hard cap — guarantees the splash dismisses even if the video stalls.
    const failsafe = setTimeout(beginExit, MAX_DISPLAY_MS);

    // iOS Safari is strict about inline autoplay. Detect iOS-family UAs and
    // force a manual play() on mount with the required muted+playsInline flags.
    // Also covers other browsers that block autoplay (returns a rejected promise).
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const isIOS =
      /iPad|iPhone|iPod/.test(ua) ||
      (/Macintosh/.test(ua) && typeof document !== "undefined" && "ontouchend" in document);

    const video = videoRef.current;
    if (video) {
      // Ensure required attributes are set imperatively too (some iOS versions
      // only honor these when set as properties, not just JSX attrs).
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      video.setAttribute("playsinline", "");
      video.setAttribute("webkit-playsinline", "");

      const tryPlay = () => {
        const p = video.play();
        if (p && typeof p.catch === "function") {
          p.catch(() => {
            // Autoplay blocked — fall back to time-based dismissal so the
            // splash never gets stuck waiting on a video that won't play.
            startupTasks.then(scheduleExitAfterMin);
          });
        }
      };

      if (isIOS) {
        // On iOS, trigger play() after mount rather than relying on autoplay.
        if (video.readyState >= 2) {
          tryPlay();
        } else {
          video.addEventListener("loadedmetadata", tryPlay, { once: true });
        }
      } else {
        tryPlay();
      }
    }

    // When the video finishes, ensure the min hold is satisfied before exit.
    const handleEnded = () => {
      startupTasks.then(scheduleExitAfterMin);
    };
    video?.addEventListener("ended", handleEnded);

    // If the video errors/can't play, fall back to time-based dismissal.
    const handleError = () => {
      startupTasks.then(scheduleExitAfterMin);
    };
    video?.addEventListener("error", handleError);

    return () => {
      if (exitTimer) clearTimeout(exitTimer);
      if (removeTimer) clearTimeout(removeTimer);
      clearTimeout(failsafe);
      video?.removeEventListener("ended", handleEnded);
      video?.removeEventListener("error", handleError);
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
          {/* Logo mark — animated */}
          <video
            ref={videoRef}
            src={logoVideo}
            autoPlay
            muted
            playsInline
            preload="auto"
            aria-label="CourtsideView"
            className="cv-splash-logo h-40 w-40 object-contain sm:h-52 sm:w-52"
          />

          {/* Wordmark */}
          <h1
            className="cv-splash-wordmark mt-4 text-[32px] font-bold leading-none"
            style={{ color: "#F0F4FF" }}
          >
            CourtsideView
          </h1>

          {/* Divider */}
          <div
            className="cv-splash-divider mt-5 h-px w-48 origin-center"
            style={{ backgroundColor: "#39FF14" }}
          />

          {/* Tagline */}
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
