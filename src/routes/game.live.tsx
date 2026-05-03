import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Undo2, Pause, RefreshCw, AlertTriangle, Flag, MoreVertical, UserCheck } from "lucide-react";
import { TrackedPlayerPicker } from "@/components/game/TrackedPlayerPicker";
import { ErrorTypeModal } from "@/components/game/ErrorTypeModal";
import { PhoneShell } from "@/components/common/PhoneShell";
import { Scoreboard } from "@/components/game/Scoreboard";
import { RotationCourt } from "@/components/game/RotationCourt";
import { RotationWarning } from "@/components/game/RotationWarning";
import { validateRotation } from "@/utils/rotationValidation";
import { StatButton } from "@/components/game/StatButton";
import { KillHeatMap } from "@/components/game/KillHeatMap";
import { SetLineupModal } from "@/components/game/SetLineupModal";
import { SetOverPopup } from "@/components/game/SetOverPopup";
import { LiberoSubPopup } from "@/components/game/LiberoSubPopup";
import { LastActionLine } from "@/components/game/LastActionLine";
import { QuickSubSheet } from "@/components/game/QuickSubSheet";
import { MatchOverPopup } from "@/components/game/MatchOverPopup";
import { FanviewButton } from "@/components/game/FanviewButton";
import { useFanview } from "@/hooks/useFanview";
import { useGameStore } from "@/store/gameStore";
import { useHistoryStore } from "@/store/historyStore";
import { usePracticeStore } from "@/store/practiceStore";
import { hittingPercentage } from "@/utils/stats";
import { checkSetWon, checkMatchWon, setTarget, maxSets, decidingSet } from "@/utils/setRules";
import { tapHaptic } from "@/utils/haptics";
import { fireWinConfetti } from "@/utils/winConfetti";
import { Tip } from "@/components/common/Tip";
import { shouldShowTip, dismissTip } from "@/lib/tips";
import type { ErrorType, KillZone, PassGrade, Player as PlayerType, StatType } from "@/types";
import { getPositionGroup, passAverage } from "@/types";
import { SetActionModal, type SetOutcome } from "@/components/game/SetActionModal";
import { PassGradeSheet } from "@/components/game/PassGradeSheet";
import { AssistKillerPrompt } from "@/components/game/AssistKillerPrompt";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/game/live")({
  head: () => ({
    meta: [
      { title: "Live Game — CourtsideView" },
      { name: "description", content: "Live volleyball stat tracking dashboard." },
    ],
  }),
  component: LivePage,
});

function LivePage() {
  const navigate = useNavigate();
  const session = useGameStore((s) => s.session);
  const addPoint = useGameStore((s) => s.addPoint);
  const recordStat = useGameStore((s) => s.recordStat);
  const recordError = useGameStore((s) => s.recordError);
  const recordTimeout = useGameStore((s) => s.recordTimeout);
  const undo = useGameStore((s) => s.undoLastAction);
  const endSet = useGameStore((s) => s.endSet);
  const endGame = useGameStore((s) => s.endGame);
  const makeSub = useGameStore((s) => s.makeSubstitution);
  const correctScore = useGameStore((s) => s.correctScore);
  const setRotationStore = useGameStore((s) => s.setRotation);
  const confirmLiberoSub = useGameStore((s) => s.confirmLiberoSub);
  const changeTrackedPlayer = useGameStore((s) => s.changeTrackedPlayer);
  const recordDumpKill = useGameStore((s) => s.recordDumpKill);
  const recordDumpError = useGameStore((s) => s.recordDumpError);
  const recordSettingError = useGameStore((s) => s.recordSettingError);
  const recordAssist = useGameStore((s) => s.recordAssist);
  const recordPass = useGameStore((s) => s.recordPass);
  const saveSession = useHistoryStore((s) => s.saveSession);
  const fanview = useFanview();
  const isPractice = usePracticeStore((s) => s.isPractice);

  const [killModalOpen, setKillModalOpen] = useState(false);
  const [attemptMenuOpen, setAttemptMenuOpen] = useState(false);
  const [errorModal, setErrorModal] = useState<null | "attempt" | "standalone">(null);
  const [subSheetOpen, setSubSheetOpen] = useState(false);
  const [quickSubIdx, setQuickSubIdx] = useState<number | null>(null);
  const [flashIdx, setFlashIdx] = useState<number | null>(null);
  const [showLongPressTip, setShowLongPressTip] = useState(false);
  const [showFanviewTip, setShowFanviewTip] = useState(false);
  const [showAttemptFlowTip, setShowAttemptFlowTip] = useState(false);
  const [showSetterFlowTip, setShowSetterFlowTip] = useState(false);
  const [showPassingFlowTip, setShowPassingFlowTip] = useState(false);
  const [showAssistFlowTip, setShowAssistFlowTip] = useState(false);
  const [endConfirmOpen, setEndConfirmOpen] = useState(false);
  const [lineupModalOpen, setLineupModalOpen] = useState(false);
  const [setOverPopup, setSetOverPopup] = useState<{
    winner: "home" | "away";
    setNumber: number;
    homeScore: number;
    awayScore: number;
  } | null>(null);
  const [matchOverPopup, setMatchOverPopup] = useState<{ winner: "home" | "away" } | null>(null);
  // Position-aware modals
  const [setActionOpen, setSetActionOpen] = useState(false);
  const [passSheetOpen, setPassSheetOpen] = useState(false);
  const [assistPromptOpen, setAssistPromptOpen] = useState(false);
  const [dumpKillZoneOpen, setDumpKillZoneOpen] = useState(false);
  const [settingErrorTypeOpen, setSettingErrorTypeOpen] = useState(false);
  const [dumpErrorTypeOpen, setDumpErrorTypeOpen] = useState(false);
  /** Set numbers we've already prompted for, so re-entering the same score (e.g. after undo + redo) won't re-trigger. */
  const [dismissedSetWins, setDismissedSetWins] = useState<Set<number>>(new Set());

  const previousByZone = useMemo(() => {
    const m: Record<number, number> = {};
    session?.events.forEach((e) => {
      if (e.type === "STAT" && e.statType === "kill" && e.killZone) {
        m[e.killZone] = (m[e.killZone] ?? 0) + 1;
      }
    });
    return m;
  }, [session?.events]);

  // Set wins
  const homeSetsWon = useMemo(
    () => session?.completedSets.filter((s) => s.homeScore > s.awayScore).length ?? 0,
    [session?.completedSets],
  );
  const awaySetsWon = useMemo(
    () => session?.completedSets.filter((s) => s.awayScore > s.homeScore).length ?? 0,
    [session?.completedSets],
  );

  const matchFormat = session?.matchFormat ?? "highschool";
  const currentSet = session?.currentSet ?? 1;
  const pointTarget = setTarget(currentSet, matchFormat);
  const totalSets = maxSets(matchFormat);
  const winsNeeded = matchFormat === "club" ? 2 : 3;
  const isFinalSet =
    currentSet >= totalSets || homeSetsWon >= winsNeeded || awaySetsWon >= winsNeeded;

  // Auto-detect set win after every score change.
  useEffect(() => {
    if (!session) return;
    if (setOverPopup || matchOverPopup || lineupModalOpen) return;
    const winner = checkSetWon(
      session.homeScore,
      session.awayScore,
      session.currentSet,
      session.matchFormat,
    );
    if (!winner) return;
    if (dismissedSetWins.has(session.currentSet)) return;
    setSetOverPopup({
      winner,
      setNumber: session.currentSet,
      homeScore: session.homeScore,
      awayScore: session.awayScore,
    });
  }, [
    session?.homeScore,
    session?.awayScore,
    session?.currentSet,
    setOverPopup,
    matchOverPopup,
    lineupModalOpen,
    dismissedSetWins,
    session,
  ]);

  // Fire confetti ONLY when the match is fully completed.
  useEffect(() => {
    if (!matchOverPopup || !session) return;

    const homeSets = session.completedSets.filter((s) => s.homeScore > s.awayScore).length;
    const awaySets = session.completedSets.filter((s) => s.awayScore > s.homeScore).length;
    const matchActuallyWon = checkMatchWon(homeSets, awaySets, session.matchFormat);
    if (!matchActuallyWon) return;
    if (matchActuallyWon !== matchOverPopup.winner) return;

    const winnerColor = matchOverPopup.winner === "home" ? session.homeColor : session.awayColor;
    fireWinConfetti(winnerColor || "#F4B400");
    tapHaptic("heavy");
  }, [matchOverPopup, session]);
  void decidingSet;

  // Long-press contextual tip — uses the new tips system (skipped during practice).
  useEffect(() => {
    if (shouldShowTip("longPressSub", isPractice)) {
      setShowLongPressTip(true);
      const t = window.setTimeout(() => {
        setShowLongPressTip(false);
        dismissTip("longPressSub");
      }, 4000);
      return () => window.clearTimeout(t);
    }
  }, [isPractice]);

  // FanView tip — fires 8s after dashboard loads on first real game.
  useEffect(() => {
    if (!shouldShowTip("fanView", isPractice)) return;
    const t = window.setTimeout(() => {
      setShowFanviewTip(true);
      window.setTimeout(() => {
        setShowFanviewTip(false);
        dismissTip("fanView");
      }, 4000);
    }, 8000);
    return () => window.clearTimeout(t);
  }, [isPractice]);

  const dismissLongPressTip = () => {
    if (!showLongPressTip) return;
    setShowLongPressTip(false);
    dismissTip("longPressSub");
  };

  if (!session) {
    return (
      <PhoneShell>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-muted-foreground">No active game.</p>
          <Link
            to="/game/setup"
            className="rounded-2xl bg-primary px-5 py-3 text-sm font-black uppercase tracking-widest text-primary-foreground"
          >
            Start a game
          </Link>
        </div>
      </PhoneShell>
    );
  }

  const tracked = session.roster.find((p) => p.isTracked) ?? session.roster[0];
  const ourTeamKey: "home" | "away" = session.isHomeTeam ? "home" : "away";
  const ourRotation = session.isHomeTeam ? session.homeRotationState : session.awayRotationState;
  const weServe = session.isHomeServing === session.isHomeTeam;
  const isMyPlayerServing = weServe && ourRotation[0] === tracked.id;

  const handleStat = (stat: StatType) => {
    if (stat === "kill") {
      setAttemptMenuOpen((v) => {
        const next = !v;
        if (next) {
          // Notify practice coordinator
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("practice:attempt-open"));
          }
          // Contextual tip — first time the attempt sub-menu opens
          if (shouldShowTip("attemptFlow", isPractice)) {
            setShowAttemptFlowTip(true);
            window.setTimeout(() => {
              setShowAttemptFlowTip(false);
              dismissTip("attemptFlow");
            }, 4000);
          }
        }
        return next;
      });
      return;
    }
    recordStat(tracked.id, stat);
  };

  const handleAttemptOutcome = (outcome: "kill" | "dug" | "error") => {
    setAttemptMenuOpen(false);
    if (outcome === "kill") {
      setKillModalOpen(true);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("practice:kill-tapped"));
      }
      return;
    }
    if (outcome === "error") {
      setErrorModal("attempt");
      return;
    }
    recordStat(tracked.id, outcome);
  };

  const handleErrorTypeSelected = (type: ErrorType) => {
    const source = errorModal ?? "standalone";
    setErrorModal(null);
    recordError(tracked.id, type, source);
  };

  const handleKillZone = (zone: KillZone | null) => {
    setKillModalOpen(false);
    recordStat(tracked.id, "kill", zone);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("practice:kill-zone-selected"));
    }
  };

  const handleEndGame = async () => {
    endGame();
    const finalSession = useGameStore.getState().session!;
    // Practice sessions are never persisted to history.
    if (!isPractice) {
      saveSession({ ...finalSession });
      try {
        await fanview.finalize();
      } catch (e) {
        console.error("fanview finalize failed", e);
      }
      navigate({ to: "/game/report/$sessionId", params: { sessionId: session.id } });
    } else {
      navigate({ to: "/" });
    }
  };

  const confirmEndSet = () => {
    if (!setOverPopup) return;
    const winner = setOverPopup.winner;
    // Persist completed set + advance currentSet (resets scores, swaps serve to loser).
    endSet();
    setSetOverPopup(null);

    const after = useGameStore.getState().session;
    if (!after) return;

    // Recompute set wins from the now-updated completedSets list.
    const newHomeSets = after.completedSets.filter((s) => s.homeScore > s.awayScore).length;
    const newAwaySets = after.completedSets.filter((s) => s.awayScore > s.homeScore).length;
    const matchW = checkMatchWon(newHomeSets, newAwaySets, after.matchFormat);

    if (matchW) {
      setMatchOverPopup({ winner: matchW });
      return;
    }

    // Match continues — open the lineup editor for the new set.
    if (after.currentSet <= maxSets(after.matchFormat)) {
      setLineupModalOpen(true);
    }
    void winner;
  };

  const keepPlayingSet = () => {
    if (!setOverPopup) return;
    setDismissedSetWins((prev) => {
      const next = new Set(prev);
      next.add(setOverPopup.setNumber);
      return next;
    });
    setSetOverPopup(null);
  };

  return (
    <PhoneShell>
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-popover px-3 py-2">
        <Link
          to="/"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="relative flex items-center gap-2" data-tutorial="fanview-btn">
          <div className="text-[10px] font-black uppercase tracking-widest text-primary">
            ● Live
          </div>
          <FanviewButton />
          {showFanviewTip && (
            <div className="absolute -bottom-2 right-0 z-30 translate-y-full">
              <Tip
                show={showFanviewTip}
                message="Share a live link so family can follow the game from anywhere."
                arrow="up"
                autoDismissMs={4000}
                onDismiss={() => {
                  setShowFanviewTip(false);
                  dismissTip("fanView");
                }}
              />
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setEndConfirmOpen(true)}
          className="flex h-9 items-center gap-1 rounded-full bg-card px-3 text-[11px] font-black uppercase tracking-widest text-destructive"
        >
          <Flag className="h-3.5 w-3.5" /> End
        </button>
      </header>

      <main className="flex-1 overflow-y-auto pb-2">
        <Scoreboard
          homeTeam={session.homeTeam}
          awayTeam={session.awayTeam}
          homeColor={session.homeColor}
          awayColor={session.awayColor}
          homeScore={session.homeScore}
          awayScore={session.awayScore}
          setNumber={session.currentSet}
          isHomeServing={session.isHomeServing}
          isHomeOurs={session.isHomeTeam}
          homeSetsWon={homeSetsWon}
          awaySetsWon={awaySetsWon}
          pointTarget={pointTarget}
          matchFormat={matchFormat}
          onScoreHome={() => {
            tapHaptic("light");
            addPoint("home");
          }}
          onScoreAway={() => {
            tapHaptic("light");
            addPoint("away");
          }}
          onCorrectHome={() => correctScore("home")}
          onCorrectAway={() => correctScore("away")}
        />

        <RotationWarning
          issues={
            validateRotation(ourRotation, session.roster, {
              oursServing: session.isHomeServing === session.isHomeTeam,
              requireTracked: true,
            }).issues
          }
          rotation={ourRotation}
          roster={session.roster}
          onRepair={(next) => {
            tapHaptic("light");
            setRotationStore(ourTeamKey, next);
          }}
        />

        <div className="relative" data-tutorial="court" onClick={dismissLongPressTip}>
          <RotationCourt
            rotation={ourRotation}
            roster={session.roster}
            isHomeServing={session.isHomeServing}
            isHomeOurs={session.isHomeTeam}
            ourColor={session.isHomeTeam ? session.homeColor : session.awayColor}
            onLongPressCell={(idx) => {
              dismissLongPressTip();
              setQuickSubIdx(idx);
            }}
            flashIndex={flashIdx}
          />
          {showLongPressTip && (
            <div className="pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2">
              <Tip
                show={showLongPressTip}
                message="Long press any player on the court to substitute them quickly."
                arrow="up"
                autoDismissMs={4000}
                onDismiss={dismissLongPressTip}
              />
            </div>
          )}
        </div>

        <LastActionLine session={session} />

        {/* Tracked player + stat buttons */}
        <PositionAwareStatPanel
          tracked={tracked}
          isMyPlayerServing={isMyPlayerServing}
          attemptMenuOpen={attemptMenuOpen}
          onAttempt={() => handleStat("kill")}
          onAttemptOutcome={handleAttemptOutcome}
          onDig={() => handleStat("dig")}
          onBlock={() => handleStat("block")}
          onAce={() => handleStat("ace")}
          onAssistTap={() => {
            if (shouldShowTip("assistFlow", isPractice)) {
              setShowAssistFlowTip(true);
              window.setTimeout(() => {
                setShowAssistFlowTip(false);
                dismissTip("assistFlow");
              }, 4000);
            }
            recordAssist(tracked.id);
            setAssistPromptOpen(true);
          }}
          onErrorTap={() => setErrorModal("standalone")}
          onSetTap={() => {
            if (shouldShowTip("setterFlow", isPractice)) {
              setShowSetterFlowTip(true);
              window.setTimeout(() => {
                setShowSetterFlowTip(false);
                dismissTip("setterFlow");
              }, 4500);
            }
            setSetActionOpen(true);
          }}
          onPassTap={() => {
            if (shouldShowTip("passingFlow", isPractice)) {
              setShowPassingFlowTip(true);
              window.setTimeout(() => {
                setShowPassingFlowTip(false);
                dismissTip("passingFlow");
              }, 4500);
            }
            setPassSheetOpen((v) => !v);
          }}
          passSheetOpen={passSheetOpen}
          onPassGrade={(g: PassGrade) => {
            recordPass(tracked.id, g);
            setPassSheetOpen(false);
          }}
          onPassCancel={() => setPassSheetOpen(false)}
          showAttemptFlowTip={showAttemptFlowTip}
          onDismissAttemptFlowTip={() => {
            setShowAttemptFlowTip(false);
            dismissTip("attemptFlow");
          }}
          showSetterFlowTip={showSetterFlowTip}
          onDismissSetterFlowTip={() => {
            setShowSetterFlowTip(false);
            dismissTip("setterFlow");
          }}
          showPassingFlowTip={showPassingFlowTip}
          onDismissPassingFlowTip={() => {
            setShowPassingFlowTip(false);
            dismissTip("passingFlow");
          }}
          showAssistFlowTip={showAssistFlowTip}
          onDismissAssistFlowTip={() => {
            setShowAssistFlowTip(false);
            dismissTip("assistFlow");
          }}
        />

        {/* Game controls */}
        <section className="mt-3 grid grid-cols-3 gap-2 px-4">
          <ControlBtn
            icon={<Pause className="h-4 w-4" />}
            label={`TO ${session.isHomeTeam ? session.homeTimeoutsThisSet : session.awayTimeoutsThisSet}/2`}
            onClick={() => recordTimeout(session.isHomeTeam ? "home" : "away")}
          />
          <button
            type="button"
            onClick={() => setSubSheetOpen(true)}
            className="flex h-12 flex-col items-center justify-center gap-0 rounded-2xl border border-border bg-card px-1 text-[11px] font-black uppercase tracking-widest text-foreground active:scale-95"
          >
            <span className="flex items-center gap-1.5">
              <RefreshCw className="h-4 w-4" /> Sub
            </span>
            <span className="text-[8px] font-medium normal-case tracking-normal text-muted-foreground">
              or long press court
            </span>
          </button>
          <ControlBtn
            icon={<AlertTriangle className="h-4 w-4" />}
            label="Error"
            onClick={() => setErrorModal("standalone")}
            active={errorModal !== null}
          />
        </section>

        <section className="mt-2 grid grid-cols-2 gap-2 px-4 pb-4">
          <button
            type="button"
            onClick={() => {
              tapHaptic("light");
              undo();
            }}
            data-tutorial="btn-undo"
            className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-card text-sm font-black uppercase tracking-widest text-muted-foreground active:scale-95"
          >
            <Undo2 className="h-4 w-4" /> Undo
          </button>
          {isFinalSet ? (
            <button
              type="button"
              onClick={() => setEndConfirmOpen(true)}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-destructive text-sm font-black uppercase tracking-widest text-destructive-foreground active:scale-95"
            >
              End Match
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                endSet();
                // Open lineup modal for the upcoming set if match isn't over.
                const after = useGameStore.getState().session;
                if (after && after.currentSet <= maxSets(after.matchFormat)) {
                  setLineupModalOpen(true);
                }
              }}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-card text-sm font-black uppercase tracking-widest text-foreground active:scale-95"
            >
              End Set {session.currentSet}
            </button>
          )}
        </section>
      </main>

      <KillHeatMap
        open={killModalOpen}
        onSelect={handleKillZone}
        onCancel={() => setKillModalOpen(false)}
        previousByZone={previousByZone}
      />

      <ErrorTypeModal
        open={errorModal !== null}
        onSelect={handleErrorTypeSelected}
        onCancel={() => setErrorModal(null)}
        isServing={isMyPlayerServing}
      />

      {/* Setter SET sub-menu */}
      <SetActionModal
        open={setActionOpen}
        onCancel={() => setSetActionOpen(false)}
        onSelect={(outcome: SetOutcome) => {
          setSetActionOpen(false);
          if (outcome === "assist") {
            recordAssist(tracked.id);
            setAssistPromptOpen(true);
          } else if (outcome === "dump_kill") {
            setDumpKillZoneOpen(true);
          } else if (outcome === "setting_error") {
            recordSettingError(tracked.id, "other");
          }
        }}
      />

      {/* Dump Kill zone picker — reuses KillHeatMap */}
      <KillHeatMap
        open={dumpKillZoneOpen}
        onSelect={(zone) => {
          setDumpKillZoneOpen(false);
          recordDumpKill(tracked.id, zone);
        }}
        onCancel={() => setDumpKillZoneOpen(false)}
        previousByZone={previousByZone}
      />

      {/* Setting Error type picker */}
      <ErrorTypeModal
        open={settingErrorTypeOpen}
        onSelect={(t) => {
          setSettingErrorTypeOpen(false);
          recordSettingError(tracked.id, t);
        }}
        onCancel={() => setSettingErrorTypeOpen(false)}
      />

      {/* Dump Error type picker */}
      <ErrorTypeModal
        open={dumpErrorTypeOpen}
        onSelect={(t) => {
          setDumpErrorTypeOpen(false);
          recordDumpError(tracked.id, t);
        }}
        onCancel={() => setDumpErrorTypeOpen(false)}
      />

      {/* Assist "who got the kill?" prompt */}
      <AssistKillerPrompt
        open={assistPromptOpen}
        rotation={ourRotation}
        roster={session.roster}
        setterId={tracked.id}
        onResolve={() => setAssistPromptOpen(false)}
      />

      {subSheetOpen && (
        <SubSheet
          onClose={() => setSubSheetOpen(false)}
          onSub={(benchId, courtIdx) => {
            makeSub(benchId, courtIdx);
            setSubSheetOpen(false);
          }}
        />
      )}

      <QuickSubSheet
        open={quickSubIdx !== null}
        rotationIndex={quickSubIdx ?? 0}
        rotation={ourRotation}
        roster={session.roster}
        onClose={() => setQuickSubIdx(null)}
        onConfirm={(benchId) => {
          const idx = quickSubIdx;
          if (idx === null) return;
          makeSub(benchId, idx);
          setQuickSubIdx(null);
          tapHaptic("medium");
          setFlashIdx(idx);
          window.setTimeout(() => setFlashIdx(null), 320);
        }}
      />

      {endConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
          onClick={() => setEndConfirmOpen(false)}
        >
          <div
            className="w-full max-w-[440px] rounded-t-3xl border border-border bg-popover p-5 sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-black text-foreground">End the game?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              The match will be saved to history and you'll see the post-game report.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEndConfirmOpen(false)}
                className="h-12 rounded-2xl border border-border bg-card text-sm font-black uppercase tracking-widest text-muted-foreground"
              >
                Keep Playing
              </button>
              <button
                type="button"
                onClick={handleEndGame}
                className="h-12 rounded-2xl bg-destructive text-sm font-black uppercase tracking-widest text-destructive-foreground"
              >
                End Game
              </button>
            </div>
          </div>
        </div>
      )}

      <SetOverPopup
        open={setOverPopup !== null}
        setNumber={setOverPopup?.setNumber ?? session.currentSet}
        winner={setOverPopup?.winner ?? "home"}
        homeTeam={session.homeTeam}
        awayTeam={session.awayTeam}
        homeColor={session.homeColor}
        awayColor={session.awayColor}
        homeScore={setOverPopup?.homeScore ?? session.homeScore}
        awayScore={setOverPopup?.awayScore ?? session.awayScore}
        homeSetsWon={(setOverPopup?.winner === "home" ? 1 : 0) + homeSetsWon}
        awaySetsWon={(setOverPopup?.winner === "away" ? 1 : 0) + awaySetsWon}
        onConfirm={confirmEndSet}
        onKeepPlaying={keepPlayingSet}
        matchFormat={matchFormat}
      />

      <MatchOverPopup
        open={matchOverPopup !== null}
        winner={matchOverPopup?.winner ?? "home"}
        homeTeam={session.homeTeam}
        awayTeam={session.awayTeam}
        homeColor={session.homeColor}
        awayColor={session.awayColor}
        homeSetsWon={homeSetsWon}
        awaySetsWon={awaySetsWon}
        completedSets={session.completedSets}
        matchFormat={matchFormat}
        onEndGame={() => {
          setMatchOverPopup(null);
          handleEndGame();
        }}
      />

      <SetLineupModal
        open={lineupModalOpen}
        setNumber={session.currentSet}
        rotation={ourRotation}
        roster={session.roster}
        onKeep={() => setLineupModalOpen(false)}
        onConfirm={(newRot) => {
          setRotationStore(ourTeamKey, newRot);
          setLineupModalOpen(false);
        }}
      />

      {session.pendingLiberoViolation && session.pendingLiberoViolation.team === ourTeamKey && (
        <LiberoSubPopup
          open
          liberoId={session.pendingLiberoViolation.liberoId}
          rotationIndex={session.pendingLiberoViolation.rotationIndex}
          rotation={ourRotation}
          roster={session.roster}
          onConfirm={(subOutId) => confirmLiberoSub(subOutId)}
        />
      )}
    </PhoneShell>
  );
}

function ControlBtn({
  icon,
  label,
  onClick,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-12 items-center justify-center gap-1.5 rounded-2xl border text-[11px] font-black uppercase tracking-widest active:scale-95",
        active
          ? "border-[var(--error)] bg-[var(--error)]/15 text-[var(--error)]"
          : "border-border bg-card text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function SubSheet({
  onClose,
  onSub,
}: {
  onClose: () => void;
  onSub: (benchId: string, courtIdx: number) => void;
}) {
  const session = useGameStore((s) => s.session)!;
  const [benchId, setBenchId] = useState<string | null>(null);
  const ourRotation = session.isHomeTeam ? session.homeRotationState : session.awayRotationState;
  const onCourt = new Set(ourRotation);
  const bench = session.roster.filter((p) => !onCourt.has(p.id));

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[440px] rounded-t-3xl border border-border bg-popover p-5 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-black uppercase tracking-widest text-foreground">
          Substitution
        </h3>

        <div className="mt-3">
          <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            1. Pick from bench
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {bench.length === 0 && (
              <div className="col-span-2 rounded-xl border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                No bench players.
              </div>
            )}
            {bench.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setBenchId(p.id)}
                className={cn(
                  "flex items-center gap-2 rounded-xl border p-2.5 text-left",
                  benchId === p.id ? "border-primary bg-primary/10" : "border-border bg-card",
                )}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-popover text-sm font-black tabular-nums">
                  {p.number}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-xs font-bold">{p.name}</div>
                  <div className="text-[9px] uppercase text-muted-foreground">{p.position}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {benchId && (
          <div className="mt-4">
            <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              2. Replace which court position?
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {[3, 2, 1, 4, 5, 0].map((idx) => {
                const out = session.roster.find((p) => p.id === ourRotation[idx]);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onSub(benchId, idx)}
                    className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-2 text-center active:scale-95"
                  >
                    <span className="text-[9px] font-bold uppercase text-muted-foreground">
                      P{idx + 1}
                    </span>
                    <span className="text-base font-black tabular-nums">#{out?.number ?? "—"}</span>
                    <span className="max-w-full truncate text-[10px] text-muted-foreground">
                      {out?.name.split(" ")[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-4 h-12 w-full rounded-2xl border border-border bg-card text-sm font-black uppercase tracking-widest text-muted-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Position-aware stat panel
   ────────────────────────────────────────────── */

interface PositionPanelProps {
  tracked: PlayerType;
  isMyPlayerServing: boolean;
  attemptMenuOpen: boolean;
  onAttempt: () => void;
  onAttemptOutcome: (o: "kill" | "dug" | "error") => void;
  onDig: () => void;
  onBlock: () => void;
  onAce: () => void;
  onAssistTap: () => void;
  onErrorTap: () => void;
  onSetTap: () => void;
  onPassTap: () => void;
  passSheetOpen: boolean;
  onPassGrade: (g: PassGrade) => void;
  onPassCancel: () => void;
  showAttemptFlowTip: boolean;
  onDismissAttemptFlowTip: () => void;
  showSetterFlowTip: boolean;
  onDismissSetterFlowTip: () => void;
  showPassingFlowTip: boolean;
  onDismissPassingFlowTip: () => void;
  showAssistFlowTip: boolean;
  onDismissAssistFlowTip: () => void;
}

function PositionAwareStatPanel(props: PositionPanelProps) {
  const { tracked } = props;
  const group = getPositionGroup(tracked.position);
  const badge = positionBadge(group, tracked.position);

  return (
    <section className="px-4 pt-3">
      {/* Header: name + position badge + primary stat */}
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Tracking
            <span
              className="rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase"
              style={{ backgroundColor: badge.bg, color: badge.fg, letterSpacing: "1px" }}
            >
              {badge.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="truncate text-base font-black text-foreground">{tracked.name}</span>
            <span className="text-sm font-bold text-muted-foreground">#{tracked.number}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            {group === "setter" ? "Assists" : group === "defensive" ? "Pass Avg" : "Hit %"}
          </div>
          <div className="text-2xl font-black tabular-nums text-primary">
            {group === "setter"
              ? tracked.stats.assists
              : group === "defensive"
                ? passAverage(tracked.stats)
                : hittingPercentage(tracked.stats)}
          </div>
        </div>
      </div>

      {/* Stat strip */}
      <div className="mt-2 grid grid-cols-4 gap-2 text-center">
        {statStripFor(group, tracked).map((s) => (
          <div key={s.l} className="rounded-xl bg-card py-1.5">
            <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
              {s.l}
            </div>
            <div className={cn("text-lg font-black tabular-nums", s.c)}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Action buttons by position */}
      {group === "attacker" && <AttackerButtons {...props} />}
      {group === "setter" && <SetterButtons {...props} />}
      {group === "defensive" && <DefensiveButtons {...props} />}
    </section>
  );
}

function positionBadge(group: ReturnType<typeof getPositionGroup>, pos: PlayerType["position"]) {
  if (group === "attacker")
    return { label: "⚡ Attacker", bg: "rgba(57,255,20,0.18)", fg: "#39FF14" };
  if (group === "setter") return { label: "★ Setter", bg: "rgba(57,255,20,0.18)", fg: "#39FF14" };
  return { label: pos === "L" ? "🛡 Libero" : "🛡 DS", bg: "rgba(0,172,193,0.18)", fg: "#22D3EE" };
}

function statStripFor(group: ReturnType<typeof getPositionGroup>, tracked: PlayerType) {
  const s = tracked.stats;
  if (group === "setter") {
    return [
      { l: "Ast", v: s.assists, c: "text-[#A78BFA]" },
      { l: "DmpK", v: s.dumpKills ?? 0, c: "text-[var(--kill)]" },
      { l: "SetE", v: s.settingErrors ?? 0, c: "text-[var(--error)]" },
      { l: "D", v: s.digs, c: "text-[var(--dig)]" },
    ];
  }
  if (group === "defensive") {
    return [
      { l: "Pass", v: s.passAttempts ?? 0, c: "text-[#22D3EE]" },
      { l: "D", v: s.digs, c: "text-[var(--dig)]" },
      { l: "A", v: s.aces, c: "text-[var(--ace)]" },
      { l: "Ast", v: s.assists, c: "text-[#A78BFA]" },
    ];
  }
  return [
    { l: "K", v: s.kills, c: "text-[var(--kill)]" },
    { l: "D", v: s.digs, c: "text-[var(--dig)]" },
    { l: "B", v: s.blocks, c: "text-[var(--block)]" },
    { l: "A", v: s.aces, c: "text-[var(--ace)]" },
  ];
}

function AttackerButtons(props: PositionPanelProps) {
  return (
    <>
      <div className="mt-3 space-y-2.5">
        <div data-tutorial="btn-attempt">
          <StatButton stat="kill" label="Attempt" onPress={props.onAttempt} />
        </div>
        <div data-tutorial="defense-row" className="grid grid-cols-3 gap-2.5">
          <StatButton stat="dig" label="Dig" onPress={props.onDig} />
          <StatButton stat="block" label="Block" onPress={props.onBlock} />
          <div key={props.isMyPlayerServing ? "ace" : "assist"} className="animate-in fade-in duration-150">
            {props.isMyPlayerServing ? (
              <StatButton stat="ace" label="Ace" onPress={props.onAce} />
            ) : (
              <AssistButton onPress={props.onAssistTap} compact />
            )}
          </div>
        </div>
        {/* Tertiary row — only show extra Assist when ACE occupies the secondary slot */}
        {props.isMyPlayerServing && (
          <div className="grid grid-cols-2 gap-2.5">
            <AssistButton onPress={props.onAssistTap} />
            <div />
          </div>
        )}
      </div>

      {props.attemptMenuOpen && (
        <div className="relative mt-2.5 rounded-2xl border border-border bg-popover p-2.5">
          <div className="mb-1.5 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Attempt outcome
          </div>
          {props.showAttemptFlowTip && (
            <div className="absolute -top-2 left-1/2 z-20 -translate-x-1/2 -translate-y-full">
              <Tip
                show={props.showAttemptFlowTip}
                message="Choose what happened — Kill scores, Dug means they passed it, Error gives them a point."
                arrow="down"
                autoDismissMs={4000}
                onDismiss={props.onDismissAttemptFlowTip}
              />
            </div>
          )}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => props.onAttemptOutcome("kill")}
              data-tutorial="attempt-kill"
              className="vp-press-anim flex h-[70px] flex-col items-center justify-center rounded-xl bg-[var(--kill)] text-[var(--kill-foreground)] shadow-lg shadow-black/30"
            >
              <span className="text-[13px] font-black uppercase tracking-widest">Kill</span>
            </button>
            <button
              type="button"
              onClick={() => props.onAttemptOutcome("dug")}
              className="vp-press-anim flex h-[70px] flex-col items-center justify-center rounded-xl bg-[var(--timeout)] text-black shadow-lg shadow-black/30"
            >
              <span className="text-[13px] font-black uppercase tracking-widest">Dug</span>
            </button>
            <button
              type="button"
              onClick={() => props.onAttemptOutcome("error")}
              className="vp-press-anim flex h-[70px] flex-col items-center justify-center rounded-xl bg-[var(--error)] text-[var(--error-foreground)] shadow-lg shadow-black/30"
            >
              <span className="text-[13px] font-black uppercase tracking-widest">Error</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function SetterButtons(props: PositionPanelProps) {
  return (
    <div className="mt-3 space-y-2.5">
      {/* Primary SET button */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            tapHaptic("medium");
            props.onSetTap();
          }}
          className="vp-press-anim flex h-[88px] w-full flex-col items-center justify-center gap-1 rounded-2xl shadow-lg shadow-black/30"
          style={{ backgroundColor: "#39FF14", color: "#0A2200" }}
        >
          <span className="text-[12px] font-black uppercase" style={{ letterSpacing: "3px" }}>
            Setting ▾
          </span>
        </button>
        {props.showSetterFlowTip && (
          <div className="absolute -top-2 left-1/2 z-20 -translate-x-1/2 -translate-y-full">
            <Tip
              show={props.showSetterFlowTip}
              message="Tap SETTING after every set — log Assist, Dump Kill, or Setting Error."
              arrow="down"
              autoDismissMs={4500}
              onDismiss={props.onDismissSetterFlowTip}
            />
          </div>
        )}
      </div>
      {/* Secondary row */}
      <div className="grid grid-cols-3 gap-2.5">
        <StatButton stat="dig" label="Dig" onPress={props.onDig} />
        <AceOrAlt
          isServing={props.isMyPlayerServing}
          onAce={props.onAce}
          altLabel="Block"
          altOnPress={props.onBlock}
          altStat="block"
        />
        <StatButton stat="error" label="Error" onPress={props.onErrorTap} />
      </div>
    </div>
  );
}

function DefensiveButtons(props: PositionPanelProps) {
  const isLib = props.tracked.position === "L";
  return (
    <div className="mt-3 space-y-2.5">
      {/* Primary PASS button */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            tapHaptic("medium");
            props.onPassTap();
          }}
          className="vp-press-anim flex h-[88px] w-full flex-col items-center justify-center gap-1 rounded-2xl shadow-lg shadow-black/30"
          style={{ backgroundColor: "#39FF14", color: "#0A2200" }}
        >
          <span className="text-[12px] font-black uppercase" style={{ letterSpacing: "3px" }}>
            Passing ▾
          </span>
        </button>
        {props.showPassingFlowTip && (
          <div className="absolute -top-2 left-1/2 z-20 -translate-x-1/2 -translate-y-full">
            <Tip
              show={props.showPassingFlowTip}
              message="Grade every pass: 3 Perfect, 2 Good, 1 Poor, 0 Error. Tracks your average."
              arrow="down"
              autoDismissMs={4500}
              onDismiss={props.onDismissPassingFlowTip}
            />
          </div>
        )}
      </div>
      {/* Inline grade picker */}
      <PassGradeSheet
        open={props.passSheetOpen}
        onSelect={props.onPassGrade}
        onCancel={props.onPassCancel}
      />
      {/* Secondary row — Liberos cannot block, so omit the block slot entirely. */}
      {isLib ? (
        props.isMyPlayerServing ? (
          <div className="grid grid-cols-3 gap-2.5">
            <StatButton stat="dig" label="Dig" onPress={props.onDig} />
            <StatButton stat="ace" label="Ace" onPress={props.onAce} />
            <div className="relative">
              <AssistButton onPress={props.onAssistTap} compact />
              {props.showAssistFlowTip && (
                <div className="absolute -top-2 left-1/2 z-20 -translate-x-1/2 -translate-y-full">
                  <Tip
                    show={props.showAssistFlowTip}
                    message="Assist auto-scores +1 — then tag the teammate who got the kill."
                    arrow="down"
                    autoDismissMs={4000}
                    onDismiss={props.onDismissAssistFlowTip}
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            <StatButton stat="dig" label="Dig" onPress={props.onDig} />
            <div className="relative">
              <AssistButton onPress={props.onAssistTap} compact />
              {props.showAssistFlowTip && (
                <div className="absolute -top-2 left-1/2 z-20 -translate-x-1/2 -translate-y-full">
                  <Tip
                    show={props.showAssistFlowTip}
                    message="Assist auto-scores +1 — then tag the teammate who got the kill."
                    arrow="down"
                    autoDismissMs={4000}
                    onDismiss={props.onDismissAssistFlowTip}
                  />
                </div>
              )}
            </div>
          </div>
        )
      ) : (
        <div className="grid grid-cols-3 gap-2.5">
          <StatButton stat="dig" label="Dig" onPress={props.onDig} />
          <AceOrAlt
            isServing={props.isMyPlayerServing}
            onAce={props.onAce}
            altLabel="Block"
            altOnPress={props.onBlock}
            altStat="block"
          />
          <div className="relative">
            <AssistButton onPress={props.onAssistTap} compact />
            {props.showAssistFlowTip && (
              <div className="absolute -top-2 left-1/2 z-20 -translate-x-1/2 -translate-y-full">
                <Tip
                  show={props.showAssistFlowTip}
                  message="Assist auto-scores +1 — then tag the teammate who got the kill."
                  arrow="down"
                  autoDismissMs={4000}
                  onDismiss={props.onDismissAssistFlowTip}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AceOrAlt({
  isServing,
  onAce,
  altLabel,
  altOnPress,
  altStat,
}: {
  isServing: boolean;
  onAce: () => void;
  altLabel: string;
  altOnPress: () => void;
  altStat: StatType;
}) {
  return (
    <div key={isServing ? "ace" : "alt"} className="animate-in fade-in duration-150">
      {isServing ? (
        <StatButton stat="ace" label="Ace" onPress={onAce} />
      ) : (
        <StatButton stat={altStat} label={altLabel} onPress={altOnPress} />
      )}
    </div>
  );
}

function AssistButton({ onPress, compact = false }: { onPress: () => void; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => {
        tapHaptic("medium");
        onPress();
      }}
      className={cn(
        "vp-press-anim flex w-full flex-col items-center justify-center gap-1 rounded-2xl border shadow-lg shadow-black/30",
        compact ? "h-[88px]" : "h-[64px]",
      )}
      style={{
        backgroundColor: "rgba(139,92,246,0.12)",
        borderColor: "#8B5CF6",
        color: "#A78BFA",
      }}
    >
      <span className="text-2xl leading-none">★</span>
      <span className="text-[11px] font-black uppercase" style={{ letterSpacing: "2px" }}>
        Assist
      </span>
    </button>
  );
}
