import { useNavigate } from "@tanstack/react-router";
import { Settings as SettingsIcon } from "lucide-react";
import { startPracticeMode } from "@/utils/practice";

interface WelcomePromptProps {
  open: boolean;
  onSkip: () => void;
}

/**
 * First-launch full-screen welcome modal that invites the user to run
 * Practice Mode before their first real game.
 */
export function WelcomePrompt({ open, onSkip }: WelcomePromptProps) {
  const navigate = useNavigate();

  if (!open) return null;

  const start = () => {
    try {
      window.localStorage.setItem("courtsideview_practice_seen", "started");
    } catch {
      /* noop */
    }
    startPracticeMode();
    navigate({ to: "/game/live" });
  };

  const skip = () => {
    try {
      window.localStorage.setItem("courtsideview_practice_seen", "skipped");
    } catch {
      /* noop */
    }
    onSkip();
  };

  return (
    <div className="fixed inset-0 z-[130] flex flex-col bg-background px-6 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-12">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="text-[14px] font-black uppercase tracking-widest text-muted-foreground">
          Welcome to
        </div>
        <h1 className="mt-1 text-[32px] font-black leading-none text-foreground">
          CourtsideView
        </h1>

        <p className="mt-6 max-w-[320px] text-[15px] leading-snug text-muted-foreground">
          Before your first game, take 2 minutes to practice the key gestures
          so you're ready when it matters.
        </p>

        <button
          type="button"
          onClick={start}
          className="mt-8 h-14 w-full max-w-[420px] rounded-2xl text-base font-black uppercase tracking-widest active:scale-[0.98]"
          style={{ backgroundColor: "#39FF14", color: "#0A0E1A" }}
        >
          Start Guided Tour
        </button>

        <button
          type="button"
          onClick={skip}
          className="mt-4 text-[13px] font-semibold text-muted-foreground"
        >
          Skip for now — go to app
        </button>
      </div>

      <div className="mx-auto mb-2 h-px w-3/5 bg-border opacity-60" />
      <div className="flex items-center justify-center gap-1.5 px-4 pb-2">
        <SettingsIcon className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-center text-[12px] text-muted-foreground">
          You can always find the Guided Tour in Settings whenever you're ready.
        </p>
      </div>
    </div>
  );
}
