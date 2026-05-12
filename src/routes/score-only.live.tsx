import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, MoreVertical, Undo2, Radio, ArrowLeftRight } from "lucide-react";
import { PhoneShell } from "@/components/common/PhoneShell";
import { useScoreOnlyStore } from "@/store/scoreOnlyStore";
import { useScoreOnlyHistoryStore } from "@/store/scoreOnlyHistoryStore";
import { useScoreOnlyFanview } from "@/hooks/useScoreOnlyFanview";
import { isDecidingSet, setTarget } from "@/utils/setRules";
import { checkScoreOnlySetWon } from "@/utils/scoreOnly";
import { tapHaptic } from "@/utils/haptics";
import { readableTextColor } from "@/lib/colorContrast";
import { fireWinConfetti } from "@/utils/winConfetti";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/score-only/live")({
  head: () => ({
    meta: [{ title: "Fan Mode — CourtsideView" }],
  }),
  component: LivePage,
});

function LivePage() {
  const navigate = useNavigate();
  const session = useScoreOnlyStore((s) => s.session);
  const addPoint = useScoreOnlyStore((s) => s.addPoint);
  const removePoint = useScoreOnlyStore((s) => s.removePoint);
  const takeTimeout = useScoreOnlyStore((s) => s.takeTimeout);
  const endSetNow = useScoreOnlyStore((s) => s.endSetNow);
  const setDecidingFirstServer = useScoreOnlyStore((s) => s.setDecidingFirstServer);
  const undo = useScoreOnlyStore((s) => s.undo);
  const endGame = useScoreOnlyStore((s) => s.endGame);
  const clear = useScoreOnlyStore((s) => s.clear);
  const saveHistory = useScoreOnlyHistoryStore((s) => s.saveSession);

  const fv = useScoreOnlyFanview();

  const [setOver, setSetOver] = useState<null | "myTeam" | "opponent">(null);
  const [matchOver, setMatchOver] = useState<null | "myTeam" | "opponent">(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [flashTeam, setFlashTeam] = useState<null | "myTeam" | "opponent">(null);
  const [flipped, setFlipped] = useState(false);
  const [iconSpin, setIconSpin] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const confettiFired = useRef(false);

  // Auto set-over detection
  useEffect(() => {
    if (!session || setOver || matchOver) return;
    const w = checkScoreOnlySetWon(session);
    if (w) setSetOver(w);
  }, [session, setOver, matchOver]);

  // Match-over detection (after set-over confirm increments setsWon)
  useEffect(() => {
    if (!session) return;
    if (session.isCompleted && !matchOver) {
      const winner = session.myTeamSetsWon > session.opponentSetsWon ? "myTeam" : "opponent";
      setMatchOver(winner);
    }
  }, [session, matchOver]);

  useEffect(() => {
    if (matchOver && session && !confettiFired.current) {
      confettiFired.current = true;
      const color = matchOver === "myTeam" ? session.myTeamColor : session.opponentColor;
      fireWinConfetti(color);
      // Persist to history
      saveHistory(session);
      // Finalize fanview
      fv.finalize().catch(() => {});
    }
  }, [matchOver, session, fv, saveHistory]);

  // Allow free rotation while in Fan Mode. Best-effort — APIs vary across browsers.
  useEffect(() => {
    const scr = (typeof screen !== "undefined" ? screen : null) as
      | (Screen & { orientation?: { unlock?: () => void } })
      | null;
    try {
      scr?.orientation?.unlock?.();
    } catch {
      /* noop */
    }
  }, []);

  // Reset flip whenever a new set begins (teams may switch back).
  useEffect(() => {
    setFlipped(false);
  }, [session?.currentSet]);

  const toggleFlip = () => {
    tapHaptic("light");
    setFlipped((p) => !p);
    setIconSpin(true);
    window.setTimeout(() => setIconSpin(false), 220);
  };

  if (!session) {
    return (
      <PhoneShell>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-sm text-muted-foreground">No active Fan Mode session.</p>
          <Link
            to="/score-only/setup"
            className="rounded-2xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
          >
            Start one
          </Link>
        </div>
      </PhoneShell>
    );
  }

  const target = setTarget(session.currentSet, session.matchFormat);
  const totalSets = session.matchFormat === "club" ? 3 : 5;
  const deciding = isDecidingSet(session.currentSet, session.matchFormat);

  const handleAdd = (team: "myTeam" | "opponent") => {
    tapHaptic("heavy");
    addPoint(team);
  };
  const handleRemove = (team: "myTeam" | "opponent") => {
    const cur = team === "myTeam" ? session.myTeamScore : session.opponentScore;
    if (cur <= 0) return;
    tapHaptic("medium");
    setFlashTeam(team);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlashTeam(null), 200);
    removePoint(team);
  };
  const handleTimeout = (team: "myTeam" | "opponent") => {
    tapHaptic("medium");
    takeTimeout(team);
  };
  const handleConfirmSet = () => {
    endSetNow();
    setSetOver(null);
  };
  const handleUndo = () => {
    tapHaptic("light");
    undo();
  };
  const handleEndGameMenu = () => {
    setMenuOpen(false);
    endGame();
    saveHistory(useScoreOnlyStore.getState().session!);
    fv.finalize().catch(() => {});
    navigate({ to: "/" });
    clear();
  };
  const handleEndSetMenu = () => {
    setMenuOpen(false);
    const w =
      session.myTeamScore === session.opponentScore
        ? "myTeam"
        : session.myTeamScore > session.opponentScore
          ? "myTeam"
          : "opponent";
    setSetOver(w);
  };

  const handleFanviewToggle = async () => {
    if (fv.busy) return;
    if (fv.active) {
      await fv.stop();
    } else {
      const url = await fv.start();
      if (url) await fv.share(url);
    }
  };

  const isLeading =
    session.myTeamScore === session.opponentScore
      ? null
      : session.myTeamScore > session.opponentScore
        ? "myTeam"
        : "opponent";
  const myTeamTextColor = readableTextColor(session.myTeamColor);
  const opponentTextColor = readableTextColor(session.opponentColor);

  const myTimeoutsLeft = Math.max(0, 2 - session.myTeamTimeouts);
  const opponentTimeoutsLeft = Math.max(0, 2 - session.opponentTimeouts);

  return (
    <PhoneShell>
      <header className="flex items-center justify-between border-b border-border bg-popover px-3 py-2">
        <div className="flex items-center gap-2">
          <Link to="/score-only/setup" className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Fan Mode
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleFanviewToggle}
            disabled={fv.busy}
            className={cn(
              "flex h-9 items-center gap-1.5 rounded-full px-3 text-[10px] font-black uppercase tracking-widest",
              fv.active
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-foreground",
            )}
          >
            <Radio className="h-3.5 w-3.5" />
            FanView
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-foreground"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-11 z-30 w-44 overflow-hidden rounded-xl border border-border bg-popover shadow-xl">
                <button
                  type="button"
                  onClick={handleEndSetMenu}
                  className="block w-full px-4 py-3 text-left text-sm font-bold text-foreground hover:bg-card"
                >
                  End Set Early
                </button>
                <button
                  type="button"
                  onClick={handleEndGameMenu}
                  className="block w-full border-t border-border px-4 py-3 text-left text-sm font-bold text-destructive hover:bg-card"
                >
                  End Game
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <div className="text-center">
          <div
            className="text-[11px] font-black uppercase tracking-[0.2em]"
            style={{ color: deciding ? "#F59E0B" : undefined }}
          >
            {deciding
              ? `Set ${session.currentSet} — Deciding`
              : `Match · Set ${session.currentSet} of ${totalSets}`}
          </div>
          <div className="mt-1 text-[12px] text-muted-foreground">
            {session.myTeam} <span className="font-black tabular-nums text-foreground">{session.myTeamSetsWon}</span> —{" "}
            <span className="font-black tabular-nums text-foreground">{session.opponentSetsWon}</span> {session.opponent}
          </div>
        </div>

        {/* Scoreboard */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="grid grid-cols-2 items-center gap-3">
            <ScoreCell
              name={session.myTeam}
              score={session.myTeamScore}
              color={session.myTeamColor}
              textColor={myTeamTextColor}
              leading={isLeading === "myTeam"}
              flash={flashTeam === "myTeam"}
              onPress={() => handleAdd("myTeam")}
              onDoublePress={() => handleRemove("myTeam")}
            />
            <ScoreCell
              name={session.opponent}
              score={session.opponentScore}
              color={session.opponentColor}
              textColor={opponentTextColor}
              leading={isLeading === "opponent"}
              flash={flashTeam === "opponent"}
              onPress={() => handleAdd("opponent")}
              onDoublePress={() => handleRemove("opponent")}
            />
          </div>
          <div className="mt-3 text-center text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            To {target} · {session.myTeamServing ? session.myTeam : session.opponent} serving
          </div>
        </div>

        {/* +1 buttons */}
        <div className="grid grid-cols-2 gap-2">
          <ScoreActionButton
            label={`+ ${session.myTeam}`}
            onPress={() => handleAdd("myTeam")}
            onDoublePress={() => handleRemove("myTeam")}
            color={session.myTeamColor}
          />
          <ScoreActionButton
            label={`+ ${session.opponent}`}
            onPress={() => handleAdd("opponent")}
            onDoublePress={() => handleRemove("opponent")}
            color={session.opponentColor}
          />
        </div>

        <p className="text-center text-[10px] text-muted-foreground">
          Tap to add · Double-tap to remove
        </p>

        {/* Timeouts */}
        <div className="grid grid-cols-2 gap-2">
          <TimeoutButton
            label={`Timeout ${session.myTeam.split(" ")[0]}`}
            remaining={myTimeoutsLeft}
            onPress={() => handleTimeout("myTeam")}
          />
          <TimeoutButton
            label={`Timeout ${session.opponent.split(" ")[0]}`}
            remaining={opponentTimeoutsLeft}
            onPress={() => handleTimeout("opponent")}
          />
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleUndo}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-bold text-foreground active:scale-[0.98]"
          >
            <Undo2 className="h-4 w-4" />
            Undo
          </button>
          <button
            type="button"
            onClick={handleEndSetMenu}
            className="h-12 flex-1 rounded-xl bg-foreground text-sm font-black uppercase tracking-widest text-background active:scale-[0.98]"
          >
            End Set
          </button>
        </div>
      </main>

      {/* Deciding-set coin toss */}
      {session.pendingDecidingServePrompt && (
        <CoinToss
          myTeam={session.myTeam}
          opponent={session.opponent}
          myTeamColor={session.myTeamColor}
          opponentColor={session.opponentColor}
          setNumber={session.currentSet}
          onSelect={(team) => setDecidingFirstServer(team)}
        />
      )}

      {/* Set Over popup */}
      {setOver && !matchOver && (
        <SetOver
          setNumber={session.currentSet}
          totalSets={totalSets}
          winner={setOver}
          myTeam={session.myTeam}
          opponent={session.opponent}
          myTeamColor={session.myTeamColor}
          opponentColor={session.opponentColor}
          myTeamScore={session.myTeamScore}
          opponentScore={session.opponentScore}
          onConfirm={handleConfirmSet}
          onKeepPlaying={() => setSetOver(null)}
        />
      )}

      {/* Match Over popup */}
      {matchOver && (
        <MatchOver
          winner={matchOver}
          session={session}
          onClose={() => {
            navigate({ to: "/" });
            clear();
          }}
        />
      )}
    </PhoneShell>
  );
}

function ScoreCell({
  name,
  score,
  color,
  textColor,
  leading,
  flash,
  onPress,
  onDoublePress,
}: {
  name: string;
  score: number;
  color: string;
  textColor: string;
  leading: boolean | null;
  flash: boolean;
  onPress?: () => void;
  onDoublePress?: () => void;
}) {
  const fontSize = leading ? 96 : leading === false ? 72 : 84;
  const lastTapRef = useRef<number>(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = () => {
    if (!onPress && !onDoublePress) return;
    if (!onDoublePress) {
      onPress?.();
      return;
    }
    const now = Date.now();
    const dt = now - lastTapRef.current;
    if (dt < 300) {
      if (tapTimerRef.current) {
        clearTimeout(tapTimerRef.current);
        tapTimerRef.current = null;
      }
      lastTapRef.current = 0;
      tapHaptic("medium");
      onDoublePress();
      return;
    }
    lastTapRef.current = now;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    tapTimerRef.current = setTimeout(() => {
      tapHaptic("heavy");
      onPress?.();
      tapTimerRef.current = null;
    }, 220);
  };

  return (
    <button
      type="button"
      onClick={onPress || onDoublePress ? handleClick : undefined}
      className={cn(
        "flex flex-col items-center justify-center rounded-xl py-3 transition-colors active:scale-[0.98] select-none",
        flash && "ring-2 ring-destructive",
      )}
      style={{ backgroundColor: leading ? `${color}22` : "transparent" }}
    >
      <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        {name}
      </div>
      <div
        className="font-black leading-none tabular-nums"
        style={{
          color: leading ? textColor === "#FFFFFF" ? color : color : "var(--muted-foreground)",
          fontSize,
        }}
      >
        {score}
      </div>
    </button>
  );
}

function ScoreActionButton({
  label,
  onPress,
  onDoublePress,
  color,
}: {
  label: string;
  onPress: () => void;
  onDoublePress?: () => void;
  color: string;
}) {
  const lastTapRef = useRef<number>(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = () => {
    if (!onDoublePress) {
      onPress();
      return;
    }
    const now = Date.now();
    const dt = now - lastTapRef.current;
    if (dt < 300) {
      if (tapTimerRef.current) {
        clearTimeout(tapTimerRef.current);
        tapTimerRef.current = null;
      }
      lastTapRef.current = 0;
      onDoublePress();
      return;
    }
    lastTapRef.current = now;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    tapTimerRef.current = setTimeout(() => {
      onPress();
      tapTimerRef.current = null;
    }, 220);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex h-16 items-center justify-center rounded-2xl text-sm font-black uppercase tracking-widest active:scale-[0.98]"
      style={{
        backgroundColor: `${color}33`,
        color: readableTextColor(color),
        border: `2px solid ${color}`,
      }}
    >
      {label}
    </button>
  );
}

function TimeoutButton({
  label,
  remaining,
  onPress,
}: {
  label: string;
  remaining: number;
  onPress: () => void;
}) {
  const disabled = remaining <= 0;
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={disabled}
      className={cn(
        "flex h-12 flex-col items-center justify-center rounded-xl border border-border bg-card text-[11px] font-black uppercase tracking-widest text-foreground active:scale-[0.98]",
        disabled && "opacity-40",
      )}
    >
      <span>{label}</span>
      <span className="text-[9px] font-bold text-muted-foreground">{remaining} left</span>
    </button>
  );
}

function SetOver({
  setNumber,
  totalSets,
  winner,
  myTeam,
  opponent,
  myTeamColor,
  opponentColor,
  myTeamScore,
  opponentScore,
  onConfirm,
  onKeepPlaying,
}: {
  setNumber: number;
  totalSets: number;
  winner: "myTeam" | "opponent";
  myTeam: string;
  opponent: string;
  myTeamColor: string;
  opponentColor: string;
  myTeamScore: number;
  opponentScore: number;
  onConfirm: () => void;
  onKeepPlaying: () => void;
}) {
  const winningTeam = winner === "myTeam" ? myTeam : opponent;
  const winningColor = winner === "myTeam" ? myTeamColor : opponentColor;
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-[420px] rounded-2xl border border-border bg-card p-6 text-center shadow-2xl">
        <div className="text-[12px] font-black uppercase tracking-[0.2em] text-muted-foreground">
          Set {setNumber} of {totalSets} Complete
        </div>
        <div className="mt-3 text-2xl font-black" style={{ color: readableTextColor(winningColor) === "#0A0E1A" ? winningColor : winningColor }}>
          {winningTeam} wins Set {setNumber}
        </div>
        <div className="mt-3 text-5xl font-black tabular-nums">
          {myTeamScore} – {opponentScore}
        </div>
        <button
          type="button"
          onClick={onConfirm}
          className="mt-6 h-14 w-full rounded-2xl text-base font-black uppercase tracking-widest text-black active:scale-[0.98]"
          style={{ backgroundColor: "#39FF14" }}
        >
          Confirm End Set
        </button>
        <button
          type="button"
          onClick={onKeepPlaying}
          className="mt-3 h-10 w-full text-sm font-semibold text-muted-foreground"
        >
          Keep playing this set
        </button>
      </div>
    </div>
  );
}

function MatchOver({
  winner,
  session,
  onClose,
}: {
  winner: "myTeam" | "opponent";
  session: ReturnType<typeof useScoreOnlyStore.getState>["session"];
  onClose: () => void;
}) {
  if (!session) return null;
  const winningTeam = winner === "myTeam" ? session.myTeam : session.opponent;
  const winningColor = winner === "myTeam" ? session.myTeamColor : session.opponentColor;
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
      <div className="w-full max-w-[420px] rounded-2xl border border-border bg-card p-6 text-center shadow-2xl">
        <div className="text-[12px] font-black uppercase tracking-[0.2em] text-muted-foreground">
          Match Complete
        </div>
        <div className="mt-3 text-2xl font-black" style={{ color: winningColor }}>
          {winningTeam} wins!
        </div>
        <div className="mt-3 text-5xl font-black tabular-nums">
          {session.myTeamSetsWon} – {session.opponentSetsWon}
        </div>
        {session.completedSets.length > 0 && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {session.completedSets.map((s) => (
              <span
                key={s.setNumber}
                className="rounded-md bg-popover px-2 py-1 text-xs font-bold tabular-nums text-foreground"
              >
                S{s.setNumber}: {s.myTeamScore}–{s.opponentScore}
              </span>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={onClose}
          className="mt-6 h-14 w-full rounded-2xl bg-primary text-base font-black uppercase tracking-widest text-primary-foreground active:scale-[0.98]"
        >
          End Game
        </button>
      </div>
    </div>
  );
}

function CoinToss({
  setNumber,
  myTeam,
  opponent,
  myTeamColor,
  opponentColor,
  onSelect,
}: {
  setNumber: number;
  myTeam: string;
  opponent: string;
  myTeamColor: string;
  opponentColor: string;
  onSelect: (team: "myTeam" | "opponent") => void;
}) {
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
      <div className="w-full max-w-[420px] rounded-2xl border border-border bg-card p-6 text-center shadow-2xl">
        <div className="text-[28px]">🪙</div>
        <div className="mt-2 text-[12px] font-black uppercase tracking-[0.2em] text-muted-foreground">
          Coin Toss
        </div>
        <div className="mt-1 text-[16px] font-black" style={{ color: "#F59E0B" }}>
          Set {setNumber} — Deciding Set
        </div>
        <p className="mt-2 text-sm text-muted-foreground">Who serves first?</p>
        <button
          type="button"
          onClick={() => onSelect("myTeam")}
          className="mt-4 h-14 w-full rounded-2xl text-base font-black active:scale-[0.98]"
          style={{ backgroundColor: myTeamColor, color: readableTextColor(myTeamColor) }}
        >
          {myTeam}
        </button>
        <button
          type="button"
          onClick={() => onSelect("opponent")}
          className="mt-3 h-14 w-full rounded-2xl text-base font-black active:scale-[0.98]"
          style={{ backgroundColor: opponentColor, color: readableTextColor(opponentColor) }}
        >
          {opponent}
        </button>
      </div>
    </div>
  );
}
