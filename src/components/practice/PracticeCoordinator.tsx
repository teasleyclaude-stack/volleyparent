import { useEffect, useMemo, useRef, useState } from "react";
import { useGameStore } from "@/store/gameStore";
import { usePracticeStore } from "@/store/practiceStore";
import { TutorialOverlay, StepFlashOverlay, type StepConfig } from "./TutorialOverlay";
import { PracticeCompletion } from "./PracticeCompletion";

const STEPS: Record<string, Omit<StepConfig, "totalSteps">> = {
  point: {
    step: "point",
    index: 1,
    title: "Adding a point",
    description: "Tap the + button for whichever team just scored. The app handles rotation automatically when the other team earns the serve.",
    target: "score-home",
  },
  sideout: {
    step: "sideout",
    index: 2,
    title: "Side out — earning the serve back",
    description: "When the opponent scores while you're serving, tap their + button. Your team rotates clockwise and earns the serve.",
    target: "score-away",
    target2: "court",
  },
  attempt: {
    step: "attempt",
    index: 3,
    title: "Recording an attack",
    description: "When your player attacks, tap ATTEMPT. You'll choose what happened — Kill, Dug, or Error.",
    target: "btn-attempt",
  },
  kill: {
    step: "kill",
    index: 4,
    title: "It's a kill!",
    description: "Tap KILL when your player's attack scores a point. You'll then mark where it landed on the opponent's court.",
    target: "attempt-kill",
    cardPosition: "top",
  },
  killZone: {
    step: "killZone",
    index: 5,
    title: "Where did it land?",
    description: "Tap the zone where the ball landed. Back row: 1·6·5 · Front row: 2·3·4. This builds your shot chart.",
    target: "kill-zones",
    cardPosition: "top",
  },
  defense: {
    step: "defense",
    index: 6,
    title: "Tracking defensive plays",
    description: "Use these for defensive plays. DIG for passing attacks, BLOCK for net blocks, ACE when your player's serve scores directly.",
    target: "defense-row",
  },
  longPressSub: {
    step: "longPressSub",
    index: 7,
    title: "Quick substitution",
    description: "Long press any player on the court for 1 second to substitute them. Fastest way to make a change during a live rally.",
    target: "court",
    pulseRing: true,
  },
  undo: {
    step: "undo",
    index: 8,
    title: "Made a mistake? No problem.",
    description: "Tap UNDO to reverse the last action. Fat fingers happen — this keeps your stats accurate without interrupting the game.",
    target: "btn-undo",
  },
};

const TOTAL = 8;

/**
 * Drives the Practice Mode tutorial: detects user actions via gameStore
 * subscriptions and advances the step accordingly.
 */
export function PracticeCoordinator() {
  const isPractice = usePracticeStore((s) => s.isPractice);
  const step = usePracticeStore((s) => s.step);
  const advance = usePracticeStore((s) => s.advance);
  const exit = usePracticeStore((s) => s.exit);
  const session = useGameStore((s) => s.session);
  const clearSession = useGameStore((s) => s.clearSession);

  const [flash, setFlash] = useState<string | null>(null);
  const lastEventCount = useRef<number>(0);
  const lastHomeScore = useRef<number>(0);
  const lastAwayScore = useRef<number>(0);

  // Reset trackers when entering practice
  useEffect(() => {
    if (isPractice && session) {
      lastEventCount.current = session.events.length;
      lastHomeScore.current = session.homeScore;
      lastAwayScore.current = session.awayScore;
    }
  }, [isPractice]); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for state changes and advance
  useEffect(() => {
    if (!isPractice || !session || step === "complete") return;

    const eventsLen = session.events.length;
    const newEvents = session.events.slice(lastEventCount.current);
    lastEventCount.current = eventsLen;

    if (newEvents.length === 0) return;

    const latest = newEvents[newEvents.length - 1];

    if (step === "point") {
      // Looking for home score increment
      if (session.homeScore > lastHomeScore.current) {
        lastHomeScore.current = session.homeScore;
        advance();
      }
      return;
    }

    if (step === "sideout") {
      if (session.awayScore > lastAwayScore.current) {
        lastAwayScore.current = session.awayScore;
        setFlash("Players rotated and the serve changed automatically!");
        advance();
      }
      return;
    }

    if (step === "killZone") {
      // Zone selection records a kill stat with killZone set
      const killWithZone = newEvents.find(
        (e) => e.type === "STAT" && e.statType === "kill" && e.killZone,
      );
      if (killWithZone) {
        setFlash(`Kill logged! Zone ${killWithZone.killZone}.`);
        advance();
      }
      return;
    }

    if (step === "defense") {
      const def = newEvents.find(
        (e) =>
          e.type === "STAT" &&
          (e.statType === "dig" || e.statType === "block" || e.statType === "ace"),
      );
      if (def) advance();
      return;
    }

    if (step === "longPressSub") {
      const sub = newEvents.find((e) => e.type === "SUB");
      if (sub) {
        setFlash("Substitution complete! Court map updated.");
        advance();
      }
      return;
    }

    if (step === "undo") {
      // Undo removes events — handled below in a separate effect
    }

    void latest;
  }, [session, step, isPractice, advance]);

  // Undo detection (event count drops)
  const prevLen = useRef<number>(0);
  useEffect(() => {
    if (!isPractice || !session) return;
    const cur = session.events.length;
    if (step === "undo" && cur < prevLen.current) {
      advance();
    }
    prevLen.current = cur;
  }, [session, step, isPractice, advance]);

  // Step "attempt" — detected when the attempt sub-menu opens. We expose
  // a window event from the live page when ATTEMPT is tapped.
  useEffect(() => {
    if (!isPractice) return;
    const onAttempt = () => {
      if (usePracticeStore.getState().step === "attempt") advance();
    };
    const onZone = () => {
      // Backup signal in case the kill event ordering misses it
      if (usePracticeStore.getState().step === "killZone") advance();
    };
    window.addEventListener("practice:attempt-open", onAttempt);
    window.addEventListener("practice:kill-zone-selected", onZone);
    return () => {
      window.removeEventListener("practice:attempt-open", onAttempt);
      window.removeEventListener("practice:kill-zone-selected", onZone);
    };
  }, [isPractice, advance]);

  const config = useMemo<StepConfig | null>(() => {
    if (!isPractice || step === "complete") return null;
    const base = STEPS[step];
    if (!base) return null;
    return { ...base, totalSteps: TOTAL };
  }, [isPractice, step]);

  if (!isPractice) return null;

  if (step === "complete") {
    return (
      <PracticeCompletion
        onReturnToSettings={() => {
          exit();
          clearSession();
        }}
      />
    );
  }

  const skip = () => {
    exit();
    clearSession();
    try {
      window.localStorage.setItem("courtsideview_practice_seen", "skipped");
    } catch {
      /* noop */
    }
    if (typeof window !== "undefined") window.location.assign("/");
  };

  return (
    <>
      {config && <TutorialOverlay config={config} onSkip={skip} />}
      <StepFlashOverlay
        message={flash ?? ""}
        show={flash !== null}
        onDone={() => setFlash(null)}
      />
    </>
  );
}
