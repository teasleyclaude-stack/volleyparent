import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Plus, Star, Trash2, Users, Volleyball, X } from "lucide-react";
import { useEffect, useState } from "react";
import { PhoneShell } from "@/components/common/PhoneShell";
import { useGameStore } from "@/store/gameStore";
import { useHistoryStore } from "@/store/historyStore";
import { defaultStats, type MatchFormat, type Player, type Position, type RotationState } from "@/types";
import { uid } from "@/utils/stats";
import { cn } from "@/lib/utils";

const POSITIONS: Position[] = ["S", "MB", "OH", "RS", "L", "DS"];
const MATCH_FORMAT_KEY = "courtsideview_match_format";

export const Route = createFileRoute("/game/setup")({
  head: () => ({
    meta: [
      { title: "New Game — CourtsideView" },
      { name: "description", content: "Set up a new volleyball match: teams, roster, and starting rotation." },
    ],
  }),
  component: SetupPage,
});

function SetupPage() {
  const navigate = useNavigate();
  const startSession = useGameStore((s) => s.startSession);
  const pastSessions = useHistoryStore((s) => s.sessions);
  const lastRoster = useHistoryStore((s) => s.lastRoster);

  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [homeColor, setHomeColor] = useState("#F4B400");
  const [awayColor, setAwayColor] = useState("#3B82F6");
  const isHomeTeam = true;
  const [isHomeServing, setIsHomeServing] = useState(true);
  const [matchFormat, setMatchFormat] = useState<MatchFormat>("club");

  // Hydrate last-used match format from localStorage.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = window.localStorage.getItem(MATCH_FORMAT_KEY);
      if (saved === "club" || saved === "highschool") setMatchFormat(saved);
    } catch {
      /* ignore */
    }
  }, []);

  const [roster, setRoster] = useState<Player[]>(() => {
    // Auto-populate from the most recent saved roster (stats reset).
    const source = lastRoster ?? pastSessions[0]?.roster ?? null;
    if (!source || source.length === 0) return [];
    const fresh = source.map((p) => ({ ...p, stats: defaultStats() }));
    if (!fresh.some((p) => p.isTracked)) {
      fresh[0] = { ...fresh[0], isTracked: true };
    }
    return fresh;
  });
  const [rotation, setRotation] = useState<(string | null)[]>(() => {
    const source = lastRoster ?? pastSessions[0]?.roster ?? null;
    if (!source || source.length === 0) return [null, null, null, null, null, null];
    const ids = source.slice(0, 6).map((p) => p.id);
    while (ids.length < 6) ids.push(null as unknown as string);
    return ids.slice(0, 6);
  });
  const [showAdd, setShowAdd] = useState(false);
  const [showLoad, setShowLoad] = useState(false);

  const trackedId = roster.find((p) => p.isTracked)?.id ?? null;
  const rotationFull = rotation.every((x) => x);
  // Libero may NOT start in front-row positions (indices 1, 2, 3).
  const liberoFrontRowIdx: number[] = [];
  for (const idx of [1, 2, 3]) {
    const id = rotation[idx];
    const p = roster.find((r) => r.id === id);
    if (p && p.position === "L") liberoFrontRowIdx.push(idx);
  }
  const liberoPlacementInvalid = liberoFrontRowIdx.length > 0;

  const setTracked = (id: string) => {
    setRoster((r) => r.map((p) => ({ ...p, isTracked: p.id === id })));
  };

  const setRotationAt = (idx: number, playerId: string | null) => {
    setRotation((r) => {
      const next = [...r];
      for (let i = 0; i < next.length; i++) {
        if (next[i] === playerId) next[i] = null;
      }
      next[idx] = playerId;
      return next;
    });
  };

  const clearRoster = () => {
    setRoster([]);
    setRotation([null, null, null, null, null, null]);
  };

  const addPlayer = (name: string, number: number, position: Position) => {
    const newPlayer: Player = {
      id: uid(),
      name: name.trim(),
      number,
      position,
      isTracked: roster.length === 0,
      stats: defaultStats(),
    };
    setRoster((r) => [...r, newPlayer]);
  };

  const removePlayer = (id: string) => {
    setRoster((r) => {
      const filtered = r.filter((p) => p.id !== id);
      // ensure one tracked
      if (!filtered.some((p) => p.isTracked) && filtered.length > 0) {
        filtered[0] = { ...filtered[0], isTracked: true };
      }
      return filtered;
    });
    setRotation((rot) => rot.map((x) => (x === id ? null : x)));
  };

  const loadFromSession = (sessionId: string) => {
    const s = pastSessions.find((x) => x.id === sessionId);
    if (!s) return;
    // Reset stats, keep player identities
    const fresh: Player[] = s.roster.map((p) => ({
      ...p,
      stats: defaultStats(),
    }));
    // ensure exactly one tracked
    if (!fresh.some((p) => p.isTracked) && fresh.length > 0) {
      fresh[0].isTracked = true;
    }
    setRoster(fresh);
    setRotation(fresh.slice(0, 6).map((p) => p.id).concat(Array(Math.max(0, 6 - fresh.length)).fill(null)).slice(0, 6));
    setShowLoad(false);
  };

  const handleStart = () => {
    if (!rotationFull || !trackedId) return;
    const ourRotation = rotation as RotationState;
    const placeholder: RotationState = ["opp-1", "opp-2", "opp-3", "opp-4", "opp-5", "opp-6"];
    try {
      window.localStorage.setItem(MATCH_FORMAT_KEY, matchFormat);
    } catch {
      /* ignore */
    }
    startSession({
      homeTeam: homeTeam.trim() || "My Team",
      awayTeam: awayTeam.trim() || "Opponent",
      homeColor,
      awayColor,
      isHomeTeam,
      matchFormat,
      roster,
      homeRotation: ourRotation,
      awayRotation: placeholder,
      isHomeServing,
    });
    navigate({ to: "/game/live" });
  };

  return (
    <PhoneShell>
      <header className="flex items-center gap-3 border-b border-border bg-popover px-4 py-3">
        <Link to="/" className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <div className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Setup</div>
          <h1 className="text-lg font-black text-foreground">New Game</h1>
        </div>
      </header>

      <main className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
        {/* Teams */}
        <section className="space-y-3">
          <h2 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Teams</h2>
          <div className="space-y-2">
            <input
              value={homeTeam}
              onChange={(e) => setHomeTeam(e.target.value)}
              placeholder="My team name"
              className="h-12 w-full rounded-2xl border border-border bg-card px-4 text-base font-medium text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
            />
            <input
              value={awayTeam}
              onChange={(e) => setAwayTeam(e.target.value)}
              placeholder="Opponent name"
              className="h-12 w-full rounded-2xl border border-border bg-card px-4 text-base font-medium text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Team colors
            </div>
            <div className="grid grid-cols-2 gap-2">
              <ColorPicker label={homeTeam.trim() || "My Team"} value={homeColor} onChange={setHomeColor} />
              <ColorPicker label={awayTeam.trim() || "Opponent"} value={awayColor} onChange={setAwayColor} />
            </div>
            <p className="mt-1.5 text-[10px] text-muted-foreground">
              These tint the FanView scoreboard, court, and feed for watchers.
            </p>
          </div>

          <div>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Starting serve
            </div>
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-card p-1">
              {([true, false] as const).map((isOurs) => {
                const active = isOurs === isHomeServing;
                return (
                  <button
                    key={String(isOurs)}
                    type="button"
                    onClick={() => setIsHomeServing(isOurs)}
                    className={cn(
                      "h-11 rounded-xl text-sm font-black uppercase tracking-widest transition-colors",
                      active ? "bg-[var(--gold)] text-background" : "text-muted-foreground",
                    )}
                  >
                    {isOurs
                      ? (homeTeam.split(" ")[0] || "My Team")
                      : (awayTeam.split(" ")[0] || "Opponent")}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Match format */}
        <section className="space-y-2">
          <h2 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
            Match Format
          </h2>
          <div className="grid grid-cols-2 gap-0 overflow-hidden rounded-[var(--border-radius-md,12px)] border border-border/50 h-12">
            {(["club", "highschool"] as const).map((fmt) => {
              const active = matchFormat === fmt;
              const isClub = fmt === "club";
              return (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setMatchFormat(fmt)}
                  className={cn(
                    "flex h-full w-full items-center justify-center gap-1.5 text-[11px] font-black uppercase tracking-widest transition-colors",
                    active
                      ? "bg-[#39FF14] text-[#0A0E1A]"
                      : "bg-transparent text-muted-foreground",
                  )}
                >
                  <span>{isClub ? "Best of 3" : "Best of 5"}</span>
                </button>
              );
            })}
          </div>
          <p className="text-center text-[12px] text-muted-foreground">
            {matchFormat === "club"
              ? "2 sets to win  ·  Set 3 to 15"
              : "3 sets to win  ·  Set 5 to 15"}
          </p>
        </section>

        {/* Roster + tracked player */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
              Roster · {roster.length}
            </h2>
            <span className="text-[11px] text-muted-foreground">Tap to mark your player</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-border bg-card text-[11px] font-black uppercase tracking-widest text-foreground active:scale-[0.98]"
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
            <button
              type="button"
              onClick={() => setShowLoad(true)}
              disabled={pastSessions.length === 0}
              className={cn(
                "flex h-11 items-center justify-center gap-1.5 rounded-xl border border-border text-[11px] font-black uppercase tracking-widest active:scale-[0.98]",
                pastSessions.length === 0 ? "bg-card/50 text-muted-foreground/50" : "bg-card text-foreground",
              )}
            >
              <Users className="h-3.5 w-3.5" /> Load
            </button>
            <button
              type="button"
              onClick={clearRoster}
              disabled={roster.length === 0}
              className={cn(
                "flex h-11 items-center justify-center gap-1.5 rounded-xl border text-[11px] font-black uppercase tracking-widest active:scale-[0.98]",
                roster.length === 0
                  ? "border-border bg-card/50 text-muted-foreground/50"
                  : "border-destructive/40 bg-card text-destructive",
              )}
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear
            </button>
          </div>

          {roster.length === 0 ? (
            <div className="space-y-3 rounded-2xl border border-dashed border-border bg-card p-6 text-center">
              <div className="text-sm font-bold text-foreground">
                Add your first player to get started
              </div>
              <p className="text-xs text-muted-foreground">
                You need at least 6 players assigned to court positions before you can start a game.
              </p>
              <button
                type="button"
                onClick={() => setShowAdd(true)}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-black uppercase tracking-widest text-primary-foreground active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" /> Add Player
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {roster.map((p) => (
                <div
                  key={p.id}
                  className={cn(
                    "relative flex items-center gap-2 rounded-2xl border bg-card p-3 transition-all",
                    p.isTracked ? "border-primary shadow-md shadow-primary/20" : "border-border",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setTracked(p.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-popover text-base font-black text-foreground tabular-nums">
                      {p.number}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-foreground">{p.name}</div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {p.position}
                      </div>
                    </div>
                    {p.isTracked && (
                      <Star className="h-4 w-4 fill-primary text-primary" strokeWidth={1.5} />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => removePlayer(p.id)}
                    aria-label={`Remove ${p.name}`}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-popover text-muted-foreground active:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Starting rotation */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
              Starting Rotation
            </h2>
            <span className="text-[11px] text-muted-foreground">
              {rotation.filter((x) => x).length}/6
            </span>
          </div>

          <div className="rounded-2xl border border-border bg-popover p-3">
            {/* NET bar — top of court */}
            <div
              className="relative mb-2 flex h-[14px] items-center justify-center"
              style={{
                backgroundColor: "#1A5C58",
                borderTop: "2px solid #FFFFFF",
                borderBottom: "2px solid #FFFFFF",
              }}
            >
              <span aria-hidden className="absolute left-0 top-1/2 h-3 w-1 -translate-y-1/2" style={{ backgroundColor: "#FF4D4D" }} />
              <span aria-hidden className="absolute right-0 top-1/2 h-3 w-1 -translate-y-1/2" style={{ backgroundColor: "#FF4D4D" }} />
              <span className="text-[9px] font-bold uppercase" style={{ letterSpacing: "2px", color: "rgba(255,255,255,0.5)" }}>
                NET
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[3, 2, 1, 4, 5, 0].map((rotIdx) => {
                const id = rotation[rotIdx];
                const player = roster.find((p) => p.id === id);
                const illegalLibero =
                  (rotIdx === 1 || rotIdx === 2 || rotIdx === 3) &&
                  player?.position === "L";
                return (
                  <RotationSlot
                    key={rotIdx}
                    label={`P${rotIdx + 1}`}
                    sub={rotIdx < 3 ? "Back" : "Front"}
                    player={player}
                    onClear={() => setRotationAt(rotIdx, null)}
                    onPick={(pid) => setRotationAt(rotIdx, pid)}
                    roster={roster}
                    rotation={rotation}
                    illegalLibero={Boolean(illegalLibero)}
                  />
                );
              })}
            </div>
            {liberoPlacementInvalid && (
              <p className="mt-2 text-center text-[11px] font-bold text-[#FF4D4D]">
                Libero must start in P1, P5, or P6 (back row only).
              </p>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-popover p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <button
          type="button"
          disabled={!rotationFull || !trackedId || roster.length < 6 || liberoPlacementInvalid}
          onClick={handleStart}
          className={cn(
            "flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-base font-black uppercase tracking-widest transition-all",
            rotationFull && trackedId && roster.length >= 6 && !liberoPlacementInvalid
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 active:scale-[0.98]"
              : "bg-card text-muted-foreground",
          )}
        >
          <Volleyball className="h-5 w-5" />
          Start Game
        </button>
        {(!rotationFull || !trackedId || roster.length < 6 || liberoPlacementInvalid) && (
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            {roster.length < 6 ? `Add at least ${6 - roster.length} more player${6 - roster.length === 1 ? "" : "s"}. ` : ""}
            {!trackedId ? "Pick your player. " : ""}
            {roster.length >= 6 && !rotationFull ? "Set all 6 court positions. " : ""}
            {liberoPlacementInvalid ? "Move Libero out of the front row." : ""}
          </p>
        )}
      </footer>

      {showAdd && (
        <AddPlayerModal
          existingNumbers={roster.map((p) => p.number)}
          onClose={() => setShowAdd(false)}
          onAdd={(name, num, pos) => {
            addPlayer(name, num, pos);
            setShowAdd(false);
          }}
        />
      )}

      {showLoad && (
        <LoadRosterModal
          sessions={pastSessions}
          onClose={() => setShowLoad(false)}
          onLoad={loadFromSession}
        />
      )}
    </PhoneShell>
  );
}

function RotationSlot({
  label,
  sub,
  player,
  onClear,
  onPick,
  roster,
  rotation,
  illegalLibero,
}: {
  label: string;
  sub: string;
  player: Player | undefined;
  onClear: () => void;
  onPick: (pid: string) => void;
  roster: Player[];
  rotation: (string | null)[];
  illegalLibero?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const available = roster.filter((p) => !rotation.includes(p.id) || p.id === player?.id);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex aspect-square w-full flex-col items-center justify-center rounded-xl border bg-card px-1 text-center",
          illegalLibero
            ? "border-2 border-[#FF4D4D]"
            : player
              ? "border-border"
              : "border-dashed border-border/60",
        )}
      >
        <span className="absolute left-1.5 top-1.5 text-[9px] font-black uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {player ? (
          <>
            <span className="text-[20px] font-black tabular-nums text-foreground">{player.number}</span>
            <span className="mt-0.5 max-w-full truncate text-[10px] font-medium text-muted-foreground">
              {player.name.split(" ")[0]}
            </span>
            <span className="text-[9px] font-bold uppercase text-muted-foreground/70">{sub}</span>
          </>
        ) : (
          <span className="text-xs font-bold text-muted-foreground/70">+ Add</span>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-[440px] rounded-t-3xl border border-border bg-popover p-4 sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2 text-sm font-black uppercase tracking-widest text-muted-foreground">
              Assign {label}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {available.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onPick(p.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border p-2.5 text-left",
                    p.id === player?.id ? "border-primary bg-primary/10" : "border-border bg-card",
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
            {player && (
              <button
                type="button"
                onClick={() => {
                  onClear();
                  setOpen(false);
                }}
                className="mt-3 h-11 w-full rounded-xl border border-border bg-card text-xs font-bold uppercase tracking-widest text-destructive"
              >
                Clear position
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AddPlayerModal({
  existingNumbers,
  onClose,
  onAdd,
}: {
  existingNumbers: number[];
  onClose: () => void;
  onAdd: (name: string, number: number, position: Position) => void;
}) {
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [position, setPosition] = useState<Position>("OH");

  const num = parseInt(number, 10);
  const numValid = !isNaN(num) && num >= 0 && num <= 99 && !existingNumbers.includes(num);
  const valid = name.trim().length > 0 && numValid;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[440px] space-y-4 rounded-t-3xl border border-border bg-popover p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Add Player</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-card text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Player name"
            autoFocus
            className="h-12 w-full rounded-2xl border border-border bg-card px-4 text-base font-medium text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
          />
          <input
            value={number}
            onChange={(e) => setNumber(e.target.value.replace(/\D/g, "").slice(0, 2))}
            inputMode="numeric"
            placeholder="Jersey #"
            className={cn(
              "h-12 w-full rounded-2xl border bg-card px-4 text-base font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none",
              number && !numValid ? "border-destructive" : "border-border focus:border-primary",
            )}
          />
          {number && !numValid && (
            <p className="text-[11px] text-destructive">
              {existingNumbers.includes(num) ? "Number already used" : "Enter 0–99"}
            </p>
          )}
        </div>

        <div>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Position
          </div>
          <div className="grid grid-cols-6 gap-1.5">
            {POSITIONS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPosition(p)}
                className={cn(
                  "h-11 rounded-xl text-[11px] font-black uppercase tracking-wider transition-colors",
                  position === p ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground",
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          disabled={!valid}
          onClick={() => onAdd(name, num, position)}
          className={cn(
            "h-13 flex h-13 w-full items-center justify-center rounded-2xl py-4 text-sm font-black uppercase tracking-widest transition-all",
            valid
              ? "bg-primary text-primary-foreground active:scale-[0.98]"
              : "bg-card text-muted-foreground",
          )}
        >
          Add Player
        </button>
      </div>
    </div>
  );
}

function LoadRosterModal({
  sessions,
  onClose,
  onLoad,
}: {
  sessions: import("@/types").GameSession[];
  onClose: () => void;
  onLoad: (id: string) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full max-w-[440px] space-y-3 overflow-y-auto rounded-t-3xl border border-border bg-popover p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-widest text-foreground">
            Load Roster
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-card text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Players carry over with fresh stats. Tracked player and rotation are preserved.
        </p>

        <div className="space-y-2">
          {sessions.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onLoad(s.id)}
              className="flex w-full items-center justify-between rounded-2xl border border-border bg-card p-3 text-left active:scale-[0.99]"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-foreground">
                  {s.homeTeam} vs {s.awayTeam}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {new Date(s.date).toLocaleDateString()} · {s.roster.length} players
                </div>
              </div>
              <Users className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const SWATCHES = [
  "#F4B400", "#3B82F6", "#EF4444", "#10B981", "#8B5CF6",
  "#EC4899", "#F97316", "#06B6D4", "#84CC16", "#FFFFFF",
];

function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-2.5">
      <div className="mb-2 flex items-center gap-2">
        <span
          className="inline-block h-5 w-5 rounded-full border border-border"
          style={{ backgroundColor: value }}
        />
        <span className="truncate text-[11px] font-black uppercase tracking-widest text-foreground">
          {label}
        </span>
        <label className="ml-auto inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-popover text-[10px] text-muted-foreground">
          +
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="sr-only"
          />
        </label>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {SWATCHES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            aria-label={`Pick ${c}`}
            className={cn(
              "h-7 w-full rounded-md border transition-transform active:scale-95",
              value.toLowerCase() === c.toLowerCase()
                ? "border-foreground ring-2 ring-foreground/40"
                : "border-border",
            )}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
    </div>
  );
}
