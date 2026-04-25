import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Undo2, Pause, RefreshCw, AlertTriangle, Flag } from "lucide-react";
import { PhoneShell } from "@/components/common/PhoneShell";
import { Scoreboard } from "@/components/game/Scoreboard";
import { RotationCourt } from "@/components/game/RotationCourt";
import { StatButton } from "@/components/game/StatButton";
import { KillHeatMap } from "@/components/game/KillHeatMap";
import { SetLineupModal } from "@/components/game/SetLineupModal";
import { useGameStore } from "@/store/gameStore";
import { useHistoryStore } from "@/store/historyStore";
import { hittingPercentage } from "@/utils/stats";
import { tapHaptic } from "@/utils/haptics";
import type { KillZone, StatType } from "@/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/game/live")({
  head: () => ({
    meta: [
      { title: "Live Game — VolleyParent" },
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
  const recordTimeout = useGameStore((s) => s.recordTimeout);
  const undo = useGameStore((s) => s.undoLastAction);
  const endSet = useGameStore((s) => s.endSet);
  const endGame = useGameStore((s) => s.endGame);
  const makeSub = useGameStore((s) => s.makeSubstitution);
  const correctScore = useGameStore((s) => s.correctScore);
  const setRotationStore = useGameStore((s) => s.setRotation);
  const saveSession = useHistoryStore((s) => s.saveSession);

  const [killModalOpen, setKillModalOpen] = useState(false);
  const [attemptMenuOpen, setAttemptMenuOpen] = useState(false);
  const [errorMode, setErrorMode] = useState(false);
  const [subSheetOpen, setSubSheetOpen] = useState(false);
  const [endConfirmOpen, setEndConfirmOpen] = useState(false);
  const [matchWinPromptShown, setMatchWinPromptShown] = useState(false);
  const [lineupModalOpen, setLineupModalOpen] = useState(false);

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

  const currentSet = session?.currentSet ?? 1;
  const isDecidingSet = currentSet === 5;
  const pointTarget = isDecidingSet ? 15 : 25;
  const matchWinner =
    homeSetsWon >= 3
      ? session?.homeTeam || "Home"
      : awaySetsWon >= 3
        ? session?.awayTeam || "Away"
        : null;
  const isFinalSet = currentSet >= 5 || matchWinner !== null;

  // Auto-prompt when a team reaches 3 set wins
  useEffect(() => {
    if (matchWinner && !matchWinPromptShown && !endConfirmOpen) {
      setMatchWinPromptShown(true);
      setEndConfirmOpen(true);
    }
  }, [matchWinner, matchWinPromptShown, endConfirmOpen]);

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

  const handleStat = (stat: StatType) => {
    if (stat === "kill") {
      setAttemptMenuOpen((v) => !v);
      return;
    }
    recordStat(tracked.id, stat);
  };

  const handleAttemptOutcome = (outcome: "kill" | "dug" | "error") => {
    setAttemptMenuOpen(false);
    if (outcome === "kill") {
      setKillModalOpen(true);
      return;
    }
    recordStat(tracked.id, outcome);
  };

  const handleKillZone = (zone: KillZone | null) => {
    setKillModalOpen(false);
    recordStat(tracked.id, "kill", zone);
  };

  const handleEndGame = () => {
    endGame();
    saveSession({ ...useGameStore.getState().session! });
    navigate({ to: "/game/report/$sessionId", params: { sessionId: session.id } });
  };

  return (
    <PhoneShell>
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-popover px-3 py-2">
        <Link to="/" className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="text-center">
          <div className="text-[10px] font-black uppercase tracking-widest text-primary">● Live</div>
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
          homeScore={session.homeScore}
          awayScore={session.awayScore}
          setNumber={session.currentSet}
          isHomeServing={session.isHomeServing}
          isHomeOurs={session.isHomeTeam}
          homeSetsWon={homeSetsWon}
          awaySetsWon={awaySetsWon}
          pointTarget={pointTarget}
          onScoreHome={() => {
            tapHaptic("light");
            addPoint("home");
          }}
          onScoreAway={() => {
            tapHaptic("light");
            addPoint("away");
          }}
        />

        <RotationCourt
          rotation={session.rotationState}
          roster={session.roster}
          isHomeServing={session.isHomeServing}
          isHomeOurs={session.isHomeTeam}
        />

        {/* Tracked player + stat buttons */}
        <section className="px-4 pt-3">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Tracking
              </div>
              <div className="flex items-center gap-2">
                <span className="truncate text-base font-black text-foreground">{tracked.name}</span>
                <span className="text-sm font-bold text-muted-foreground">#{tracked.number}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Hit %</div>
              <div className="text-2xl font-black tabular-nums text-primary">
                {hittingPercentage(tracked.stats)}
              </div>
            </div>
          </div>

          <div className="mt-2 grid grid-cols-4 gap-2 text-center">
            {[
              { l: "K", v: tracked.stats.kills, c: "text-[var(--kill)]" },
              { l: "D", v: tracked.stats.digs, c: "text-[var(--dig)]" },
              { l: "B", v: tracked.stats.blocks, c: "text-[var(--block)]" },
              { l: "A", v: tracked.stats.aces, c: "text-[var(--ace)]" },
            ].map((s) => (
              <div key={s.l} className="rounded-xl bg-card py-1.5">
                <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                  {s.l}
                </div>
                <div className={cn("text-lg font-black tabular-nums", s.c)}>{s.v}</div>
              </div>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <StatButton stat="kill" label="Attempt" onPress={() => handleStat("kill")} />
            <StatButton stat="dig" label="Dig" onPress={() => handleStat("dig")} />
            <StatButton stat="block" label="Block" onPress={() => handleStat("block")} />
            <StatButton stat="ace" label="Ace" onPress={() => handleStat("ace")} />
          </div>

          {attemptMenuOpen && (
            <div className="mt-2.5 rounded-2xl border border-border bg-popover p-2.5">
              <div className="mb-1.5 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Attempt outcome
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleAttemptOutcome("kill")}
                  className="vp-press-anim flex h-[70px] flex-col items-center justify-center rounded-xl bg-[var(--kill)] text-[var(--kill-foreground)] shadow-lg shadow-black/30"
                >
                  <span className="text-[13px] font-black uppercase tracking-widest">Kill</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAttemptOutcome("dug")}
                  className="vp-press-anim flex h-[70px] flex-col items-center justify-center rounded-xl bg-[var(--timeout)] text-black shadow-lg shadow-black/30"
                >
                  <span className="text-[13px] font-black uppercase tracking-widest">Dug</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAttemptOutcome("error")}
                  className="vp-press-anim flex h-[70px] flex-col items-center justify-center rounded-xl bg-[var(--error)] text-[var(--error-foreground)] shadow-lg shadow-black/30"
                >
                  <span className="text-[13px] font-black uppercase tracking-widest">Error</span>
                </button>
              </div>
            </div>
          )}

          {errorMode && (
            <div className="mt-2.5">
              <StatButton
                stat="error"
                label="Hitting Error"
                onPress={() => {
                  handleStat("error");
                  setErrorMode(false);
                }}
              />
            </div>
          )}
        </section>

        {/* Game controls */}
        <section className="mt-3 grid grid-cols-3 gap-2 px-4">
          <ControlBtn
            icon={<Pause className="h-4 w-4" />}
            label={`TO ${session.isHomeTeam ? session.homeTimeoutsThisSet : session.awayTimeoutsThisSet}/2`}
            onClick={() => recordTimeout(session.isHomeTeam ? "home" : "away")}
          />
          <ControlBtn
            icon={<RefreshCw className="h-4 w-4" />}
            label="Sub"
            onClick={() => setSubSheetOpen(true)}
          />
          <ControlBtn
            icon={<AlertTriangle className="h-4 w-4" />}
            label="Error"
            onClick={() => setErrorMode((v) => !v)}
            active={errorMode}
          />
        </section>

        <section className="mt-2 grid grid-cols-2 gap-2 px-4 pb-4">
          <button
            type="button"
            onClick={() => {
              tapHaptic("light");
              undo();
            }}
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
              onClick={() => endSet()}
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

      {subSheetOpen && (
        <SubSheet
          onClose={() => setSubSheetOpen(false)}
          onSub={(benchId, courtIdx) => {
            makeSub(benchId, courtIdx);
            setSubSheetOpen(false);
          }}
        />
      )}

      {endConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
          onClick={() => setEndConfirmOpen(false)}
        >
          <div
            className="w-full max-w-[440px] rounded-t-3xl border border-border bg-popover p-5 sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-black text-foreground">
              {matchWinner ? `Match over — ${matchWinner} wins!` : "End the game?"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {matchWinner
                ? `Final: ${session.homeTeam} ${homeSetsWon} — ${awaySetsWon} ${session.awayTeam}. End match and view the report?`
                : "The match will be saved to history and you'll see the post-game report."}
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
  const onCourt = new Set(session.rotationState);
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
        <h3 className="text-base font-black uppercase tracking-widest text-foreground">Substitution</h3>

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
                const out = session.roster.find((p) => p.id === session.rotationState[idx]);
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
