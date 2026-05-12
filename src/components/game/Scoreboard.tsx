import { Plus, ArrowLeftRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { tapHaptic } from "@/utils/haptics";
import { readableTextColor } from "@/lib/colorContrast";
import { getSetLabel, maxSets, formatLabelShort, isDecidingSet } from "@/utils/setRules";
import type { MatchFormat } from "@/types";
import { Tip } from "@/components/common/Tip";
import { shouldShowTip, dismissTip } from "@/lib/tips";
import { usePracticeStore } from "@/store/practiceStore";

interface ScoreboardProps {
  homeTeam: string;
  awayTeam: string;
  homeColor: string;
  awayColor: string;
  homeScore: number;
  awayScore: number;
  setNumber: number;
  isHomeServing: boolean;
  isHomeOurs: boolean;
  homeSetsWon: number;
  awaySetsWon: number;
  pointTarget: number;
  matchFormat: MatchFormat;
  onScoreHome: () => void;
  onScoreAway: () => void;
  onCorrectHome: () => void;
  onCorrectAway: () => void;
}

function useBounce(value: number) {
  const [key, setKey] = useState(0);
  useEffect(() => {
    setKey((k) => k + 1);
  }, [value]);
  return key;
}

const HINT_KEY = "vp_doubletap_hint_seen";

export function Scoreboard(props: ScoreboardProps) {
  const {
    homeTeam,
    awayTeam,
    homeColor,
    awayColor,
    homeScore,
    awayScore,
    setNumber,
    isHomeServing,
    isHomeOurs,
    homeSetsWon,
    awaySetsWon,
    pointTarget,
    matchFormat,
    onScoreHome,
    onScoreAway,
    onCorrectHome,
    onCorrectAway,
  } = props;

  const homeKey = useBounce(homeScore);
  const awayKey = useBounce(awayScore);

  const [flashHome, setFlashHome] = useState(false);
  const [flashAway, setFlashAway] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showWinByTwoTip, setShowWinByTwoTip] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [iconSpin, setIconSpin] = useState(false);
  const [showFlipTip, setShowFlipTip] = useState(false);
  const isPractice = usePracticeStore((s) => s.isPractice);

  const lastTapHome = useRef<number>(0);
  const lastTapAway = useRef<number>(0);

  // Reset flip whenever a new set begins (teams may switch back).
  useEffect(() => {
    setFlipped(false);
  }, [setNumber]);

  // First-time tip: fires when set 2 or later starts.
  useEffect(() => {
    if (setNumber >= 2 && shouldShowTip("scoreboardFlip", isPractice)) {
      setShowFlipTip(true);
    }
  }, [setNumber, isPractice]);

  const toggleFlip = () => {
    tapHaptic("light");
    setFlipped((p) => !p);
    setIconSpin(true);
    window.setTimeout(() => setIconSpin(false), 220);
    if (showFlipTip) {
      setShowFlipTip(false);
      dismissTip("scoreboardFlip");
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("practice:flip-toggled"));
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.localStorage.getItem(HINT_KEY)) {
      setShowHint(true);
    }
  }, []);

  const dismissHint = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(HINT_KEY, "1");
    }
    setShowHint(false);
  };

  const triggerCorrection = (team: "home" | "away") => {
    const score = team === "home" ? homeScore : awayScore;
    if (score <= 0) return;
    tapHaptic("heavy");
    if (team === "home") {
      onCorrectHome();
      setFlashHome(true);
      setTimeout(() => setFlashHome(false), 200);
    } else {
      onCorrectAway();
      setFlashAway(true);
      setTimeout(() => setFlashAway(false), 200);
    }
    dismissHint();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("practice:score-corrected"));
    }
  };

  const handleTap = (team: "home" | "away") => {
    const now = Date.now();
    const ref = team === "home" ? lastTapHome : lastTapAway;
    if (now - ref.current < 300) {
      ref.current = 0;
      triggerCorrection(team);
    } else {
      ref.current = now;
    }
  };

  const homeLeading = homeScore > awayScore;
  const awayLeading = awayScore > homeScore;
  const tied = homeScore === awayScore;

  const homeText = useMemo(() => readableTextColor(homeColor), [homeColor]);
  const awayText = useMemo(() => readableTextColor(awayColor), [awayColor]);
  // "My Team" / "Opponent" fallbacks instead of generic "Home" / "Away".
  const homeLabel = homeTeam || (isHomeOurs ? "My Team" : "Opponent");
  const awayLabel = awayTeam || (isHomeOurs ? "Opponent" : "My Team");
  

  const scoreStyle = (leading: boolean, flash: boolean, color: string, textColor: string): React.CSSProperties => {
    if (flash) return {};
    if (tied) return {};
    if (leading) {
      return {
        color: textColor,
        // Glow can use the original team color — it's translucent and decorative.
        textShadow: `0 0 24px color-mix(in oklab, ${color} 55%, transparent)`,
      };
    }
    return {};
  };

  const scoreClass = (leading: boolean, flash: boolean) => {
    const size = tied ? "text-[64px]" : leading ? "text-[78px]" : "text-[64px]";
    const color = flash
      ? "text-[#FF4D4D] [text-shadow:0_0_24px_rgba(255,77,77,0.55)]"
      : tied
        ? "text-foreground"
        : leading
          ? ""
          : "text-muted-foreground";
    return cn(
      "vp-bounce font-display font-black leading-none tracking-tight tabular-nums transition-colors duration-200 select-none",
      size,
      color,
    );
  };

  const setLabel = getSetLabel(homeScore, awayScore, setNumber, matchFormat);
  const totalSets = maxSets(matchFormat);

  useEffect(() => {
    if (setLabel.text === "WIN BY 2" && shouldShowTip("winByTwo", isPractice)) {
      setShowWinByTwoTip(true);
    }
  }, [setLabel.text, isPractice]);

  // Build dot states: first homeSetsWon = home, then awaySetsWon = away, rest empty.
  const setDots: Array<"home" | "away" | "empty"> = [];
  for (let i = 0; i < homeSetsWon; i++) setDots.push("home");
  for (let i = 0; i < awaySetsWon; i++) setDots.push("away");
  while (setDots.length < totalSets) setDots.push("empty");

  return (
    <div className="border-b border-border bg-popover px-4 pt-4 pb-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          {isDecidingSet(setNumber, matchFormat) ? (
            <>
              <span className="font-black" style={{ color: "#F59E0B" }}>
                Set {setNumber} — Deciding
              </span>{" "}
              <span
                className="font-black"
                style={setLabel.color ? { color: setLabel.color } : undefined}
              >
                · {setLabel.text}
              </span>
            </>
          ) : (
            <>
              Set {setNumber} of {totalSets}{" "}
              <span
                className="font-black"
                style={setLabel.color ? { color: setLabel.color } : undefined}
              >
                · {setLabel.text}
              </span>
            </>
          )}
        </span>
        <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">
          ● Live
        </span>
      </div>

      {showWinByTwoTip && (
        <div className="mb-2 flex justify-center">
          <Tip
            show={showWinByTwoTip}
            message="Win by 2! No score cap — keep playing until someone leads by two."
            arrow="up"
            autoDismissMs={6000}
            onDismiss={() => {
              dismissTip("winByTwo");
              setShowWinByTwoTip(false);
            }}
          />
        </div>
      )}

      {/* Set wins tracker — dots reflect format max (3 or 5). */}
      <div className="mb-2 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        <span className={isHomeOurs ? "text-foreground" : ""}>
          <span style={{ color: homeText }}>{homeLabel}</span>{" "}
          <span className="tabular-nums" style={{ color: homeText }}>{homeSetsWon}</span>
        </span>
        <div className="flex items-center gap-1">
          {setDots.map((d, i) => (
            <span
              key={i}
              className="h-2 w-2 rounded-full"
              style={{
                backgroundColor:
                  d === "home"
                    ? homeColor
                    : d === "away"
                      ? awayColor
                      : "color-mix(in oklab, var(--muted-foreground) 30%, transparent)",
              }}
            />
          ))}
        </div>
        <span className={!isHomeOurs ? "text-foreground" : ""}>
          <span className="tabular-nums" style={{ color: awayText }}>{awaySetsWon}</span>{" "}
          <span style={{ color: awayText }}>{awayLabel}</span>
        </span>
        <span className="ml-1 rounded-full bg-card px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
          {formatLabelShort(matchFormat)}
        </span>
      </div>

      {(() => {
        const sides = {
          home: {
            label: homeLabel,
            color: homeColor,
            textColor: homeText,
            score: homeScore,
            scoreKey: homeKey,
            leading: homeLeading,
            flash: flashHome,
            isServing: isHomeServing,
            onScore: onScoreHome,
            onTap: () => handleTap("home"),
            ariaCorrect: "Double-tap to correct home score",
          },
          away: {
            label: awayLabel,
            color: awayColor,
            textColor: awayText,
            score: awayScore,
            scoreKey: awayKey,
            leading: awayLeading,
            flash: flashAway,
            isServing: !isHomeServing,
            onScore: onScoreAway,
            onTap: () => handleTap("away"),
            ariaCorrect: "Double-tap to correct away score",
          },
        } as const;
        const leftKey = flipped ? "away" : "home";
        const rightKey = flipped ? "home" : "away";
        const left = sides[leftKey];
        const right = sides[rightKey];

        return (
          <>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              {/* Left side */}
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-1.5">
                  <span
                    className="max-w-[110px] truncate text-[13px] font-semibold"
                    style={{ color: left.textColor }}
                  >
                    {left.label}
                  </span>
                  {left.isServing && (
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: left.color }}
                      aria-label="serving"
                    />
                  )}
                </div>
                <button
                  type="button"
                  onClick={left.onTap}
                  data-tutorial={leftKey === (isHomeOurs ? "home" : "away") ? "score-cell-ours" : "score-cell-opp"}
                  className="bg-transparent p-0 text-left"
                  aria-label={left.ariaCorrect}
                >
                  <span
                    key={left.scoreKey}
                    className={scoreClass(left.leading, left.flash)}
                    style={scoreStyle(left.leading, left.flash, left.color, left.textColor)}
                  >
                    {left.score}
                  </span>
                </button>
                <span className="mt-0.5 text-[9px] font-medium uppercase tracking-widest text-muted-foreground/60">
                  2× to correct
                </span>
              </div>

              {/* Center: swap button */}
              <div className="relative flex flex-col items-center">
                <button
                  type="button"
                  onClick={toggleFlip}
                  aria-label="Flip scoreboard sides"
                  data-tutorial="score-swap"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-transparent text-muted-foreground active:scale-90"
                >
                  <ArrowLeftRight
                    className={cn(
                      "h-[18px] w-[18px] transition-transform duration-200 ease-out",
                      iconSpin && "rotate-180",
                    )}
                  />
                </button>
                {showFlipTip && (
                  <div className="absolute left-1/2 top-full z-30 -translate-x-1/2 translate-y-1">
                    <Tip
                      show={showFlipTip}
                      message="Teams switching sides? Tap ⇄ to flip the scoreboard to match the court."
                      arrow="up"
                      autoDismissMs={4000}
                      onDismiss={() => {
                        setShowFlipTip(false);
                        dismissTip("scoreboardFlip");
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Right side */}
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-1.5">
                  {right.isServing && (
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: right.color }}
                      aria-label="serving"
                    />
                  )}
                  <span
                    className="max-w-[110px] truncate text-[13px] font-semibold"
                    style={{ color: right.textColor }}
                  >
                    {right.label}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={right.onTap}
                  data-tutorial={rightKey === (isHomeOurs ? "home" : "away") ? "score-cell-ours" : "score-cell-opp"}
                  className="bg-transparent p-0 text-right"
                  aria-label={right.ariaCorrect}
                >
                  <span
                    key={right.scoreKey}
                    className={scoreClass(right.leading, right.flash)}
                    style={scoreStyle(right.leading, right.flash, right.color, right.textColor)}
                  >
                    {right.score}
                  </span>
                </button>
                <span className="mt-0.5 text-[9px] font-medium uppercase tracking-widest text-muted-foreground/60">
                  2× to correct
                </span>
              </div>
            </div>

            {showHint && (
              <button
                type="button"
                onClick={dismissHint}
                className="mt-2 w-full rounded-xl border border-border bg-card px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground active:scale-[0.98]"
              >
                Tip: Double-tap a score to correct it · tap to dismiss
              </button>
            )}

            <div className="mt-3 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={left.onScore}
                data-tutorial={leftKey === (isHomeOurs ? "home" : "away") ? "score-ours" : "score-opp"}
                className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-card text-foreground active:scale-95 transition-transform border border-border"
              >
                <Plus className="h-5 w-5" /> <span className="text-sm font-bold">{left.label}</span>
              </button>
              <button
                type="button"
                onClick={right.onScore}
                data-tutorial={rightKey === (isHomeOurs ? "home" : "away") ? "score-ours" : "score-opp"}
                className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-card text-foreground active:scale-95 transition-transform border border-border"
              >
                <Plus className="h-5 w-5" /> <span className="text-sm font-bold">{right.label}</span>
              </button>
            </div>
          </>
        );
      })()}
    </div>
  );
}
