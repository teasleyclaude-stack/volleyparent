import { useEffect, useState } from "react";
import logo from "@/assets/courtsideview-logo.png";

const SESSION_KEY = "courtsideview-splash-shown";

interface SplashScreenProps {
  children: React.ReactNode;
}

/** Full-screen branded splash shown once per browser session before the app renders. */
export function SplashScreen({ children }: SplashScreenProps) {
  // Default to NOT showing on the server to avoid hydration mismatch.
  const [show, setShow] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const seen = window.sessionStorage.getItem(SESSION_KEY);
      if (!seen) {
        setShow(true);
        window.sessionStorage.setItem(SESSION_KEY, "1");
        const t = setTimeout(() => setShow(false), 2100);
        return () => clearTimeout(t);
      }
    } catch {
      /* noop */
    }
  }, []);

  return (
    <>
      {children}
      {mounted && show && (
        <div className="cv-splash-fade fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background">
          <img
            src={logo}
            alt="CourtsideView"
            className="cv-splash-logo h-40 w-40 object-contain sm:h-56 sm:w-56"
          />
          <p className="mt-6 text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">
            Your game day companion
          </p>
        </div>
      )}
    </>
  );
}
