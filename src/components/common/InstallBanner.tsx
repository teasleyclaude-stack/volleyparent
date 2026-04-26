import { useEffect, useState } from "react";
import { Download, Share, Plus, X } from "lucide-react";

const DISMISS_KEY = "courtsideview_install_dismissed";
const DISMISS_DAYS = 14;

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  // @ts-expect-error - non-standard iOS prop
  if (window.navigator.standalone === true) return true;
  return false;
}

function isIos(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !("MSStream" in window);
}

function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function wasRecentlyDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (!ts) return false;
    const ageDays = (Date.now() - ts) / (1000 * 60 * 60 * 24);
    return ageDays < DISMISS_DAYS;
  } catch {
    return false;
  }
}

export function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [iosHelp, setIosHelp] = useState(false);

  useEffect(() => {
    if (isInIframe() || isStandalone() || wasRecentlyDismissed()) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    };

    const onInstalled = () => {
      setShow(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    // iOS Safari has no install event — show the banner with manual instructions.
    let iosTimer: number | undefined;
    if (isIos()) {
      iosTimer = window.setTimeout(() => setShow(true), 1500);
    }

    return () => {
      if (iosTimer) window.clearTimeout(iosTimer);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setShow(false);
    setIosHelp(false);
  };

  const install = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      setShow(false);
      if (choice.outcome === "dismissed") dismiss();
      return;
    }
    setIosHelp(true);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] animate-fade-in">
      <div className="mx-auto max-w-[440px] rounded-2xl border border-border bg-popover/95 p-3 shadow-2xl shadow-black/40 backdrop-blur">
        {!iosHelp ? (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Download className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-black text-foreground">Install CourtsideView</div>
              <div className="truncate text-[11px] text-muted-foreground">
                {isIos()
                  ? "Add to your home screen for the best experience."
                  : "Get the app feel — no app store needed."}
              </div>
            </div>
            <button
              type="button"
              onClick={install}
              className="rounded-xl bg-primary px-3 py-2 text-[11px] font-black uppercase tracking-widest text-primary-foreground active:scale-95"
            >
              Install
            </button>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss install banner"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground active:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-black text-foreground">Add to Home Screen</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  iOS doesn't have a one-tap install. Two quick steps:
                </div>
              </div>
              <button
                type="button"
                onClick={dismiss}
                aria-label="Dismiss"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground active:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ol className="mt-3 space-y-2 text-[12px] text-foreground">
              <li className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-card text-[10px] font-black">
                  1
                </span>
                <span className="flex items-center gap-1.5">
                  Tap the <Share className="h-4 w-4 text-primary" /> Share button in Safari
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-card text-[10px] font-black">
                  2
                </span>
                <span className="flex items-center gap-1.5">
                  Choose <Plus className="h-4 w-4 text-primary" />{" "}
                  <span className="font-bold">Add to Home Screen</span>
                </span>
              </li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
