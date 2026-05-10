import { Plus } from "lucide-react";
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
  const isPractice = usePracticeStore((s) => s.isPractice);

  const lastTapHome = useRef<number>(0);
  const lastTapAway = useRef<number>(0);

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
  const oursLabel = isHomeOurs ? homeLabel : awayLabel;
  const oppLabel = isHomeOurs ? awayLabel : homeLabel;

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
          Set {setNumber} of {totalSets}{" "}
          <span
            className="font-black"
            style={setLabel.color ? { color: setLabel.color } : undefined}
          >
            · {setLabel.text}
          </span>
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

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        {/* Home */}
        <div className="flex flex-col items-start">
          <div className="flex items-center gap-1.5">
            <span
              className="max-w-[110px] truncate text-[13px] font-semibold"
              style={{ color: homeText }}
            >
              {homeLabel}
            </span>
            {isHomeServing && (
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: homeColor }}
                aria-label="serving"
              />
            )}
          </div>
          <button
            type="button"
            onClick={() => handleTap("home")}
            className="bg-transparent p-0 text-left"
            aria-label="Double-tap to correct home score"
          >
            <span
              key={homeKey}
              className={scoreClass(homeLeading, flashHome)}
              style={scoreStyle(homeLeading, flashHome, homeColor, homeText)}
            >
              {homeScore}
            </span>
          </button>
          <span className="mt-0.5 text-[9px] font-medium uppercase tracking-widest text-muted-foreground/60">
            2× to correct
          </span>
        </div>

        <span className="self-center text-3xl font-black text-muted-foreground/40">:</span>

        {/* Away */}
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-1.5">
            {!isHomeServing && (
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: awayColor }}
                aria-label="serving"
              />
            )}
            <span
              className="max-w-[110px] truncate text-[13px] font-semibold"
              style={{ color: awayText }}
            >
              {awayLabel}
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleTap("away")}
            className="bg-transparent p-0 text-right"
            aria-label="Double-tap to correct away score"
          >
            <span
              key={awayKey}
              className={scoreClass(awayLeading, flashAway)}
              style={scoreStyle(awayLeading, flashAway, awayColor, awayText)}
            >
              {awayScore}
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
          onClick={isHomeOurs ? onScoreHome : onScoreAway}
          data-tutorial="score-ours"
          className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-card text-foreground active:scale-95 transition-transform border border-border"
        >
          <Plus className="h-5 w-5" /> <span className="text-sm font-bold">{oursLabel}</span>
        </button>
        <button
          type="button"
          onClick={isHomeOurs ? onScoreAway : onScoreHome}
          data-tutorial="score-opp"
          className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-card text-foreground active:scale-95 transition-transform border border-border"
        >
          <Plus className="h-5 w-5" /> <span className="text-sm font-bold">{oppLabel}</span>
        </button>
      </div>
    </div>
  );
}
