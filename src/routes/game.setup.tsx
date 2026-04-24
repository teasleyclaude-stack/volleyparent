import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Plus, Star, Trash2, Users, Volleyball, X } from "lucide-react";
import { useState } from "react";
import { PhoneShell } from "@/components/common/PhoneShell";
import { useGameStore } from "@/store/gameStore";
import { useHistoryStore } from "@/store/historyStore";
import { SAMPLE_ROSTER } from "@/data/sampleRoster";
import { defaultStats, type Player, type Position, type RotationState } from "@/types";
import { uid } from "@/utils/stats";
import { cn } from "@/lib/utils";

const POSITIONS: Position[] = ["S", "MB", "OH", "RS", "L", "DS"];

export const Route = createFileRoute("/game/setup")({
  head: () => ({
    meta: [
      { title: "New Game — VolleyParent" },
      { name: "description", content: "Set up a new volleyball match: teams, roster, and starting rotation." },
    ],
  }),
  component: SetupPage,
});

function SetupPage() {
  const navigate = useNavigate();
  const startSession = useGameStore((s) => s.startSession);
  const pastSessions = useHistoryStore((s) => s.sessions);

  const [homeTeam, setHomeTeam] = useState("Horizon Thunder");
  const [awayTeam, setAwayTeam] = useState("Lake Ridge Storm");
  const [isHomeTeam, setIsHomeTeam] = useState(true);
  const [isHomeServing, setIsHomeServing] = useState(true);
  const [roster, setRoster] = useState<Player[]>(SAMPLE_ROSTER);
  const [rotation, setRotation] = useState<(string | null)[]>(
    SAMPLE_ROSTER.slice(0, 6).map((p) => p.id),
  );
  const [showAdd, setShowAdd] = useState(false);
  const [showLoad, setShowLoad] = useState(false);

  const trackedId = roster.find((p) => p.isTracked)?.id ?? null;
  const rotationFull = rotation.every((x) => x);

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
    startSession({
      homeTeam: homeTeam.trim() || "Home",
      awayTeam: awayTeam.trim() || "Away",
      isHomeTeam,
      roster,
      rotation: rotation as RotationState,
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
              placeholder="Home team"
              className="h-12 w-full rounded-2xl border border-border bg-card px-4 text-base font-medium text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
            />
            <input
              value={awayTeam}
              onChange={(e) => setAwayTeam(e.target.value)}
              placeholder="Away team"
              className="h-12 w-full rounded-2xl border border-border bg-card px-4 text-base font-medium text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              We are the
            </div>
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-card p-1">
              {(["home", "away"] as const).map((side) => {
                const active = (side === "home") === isHomeTeam;
                return (
                  <button
                    key={side}
                    type="button"
                    onClick={() => setIsHomeTeam(side === "home")}
                    className={cn(
                      "h-11 rounded-xl text-sm font-black uppercase tracking-widest transition-colors",
                      active ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                    )}
                  >
                    {side} team
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Starting serve
            </div>
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-card p-1">
              {(["home", "away"] as const).map((side) => {
                const active = (side === "home") === isHomeServing;
                return (
                  <button
                    key={side}
                    type="button"
                    onClick={() => setIsHomeServing(side === "home")}
                    className={cn(
                      "h-11 rounded-xl text-sm font-black uppercase tracking-widest transition-colors",
                      active ? "bg-[var(--gold)] text-background" : "text-muted-foreground",
                    )}
                  >
                    {side === "home" ? homeTeam.split(" ")[0] || "Home" : awayTeam.split(" ")[0] || "Away"}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Roster + tracked player */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">My Player</h2>
            <span className="text-[11px] text-muted-foreground">Tap to mark</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {roster.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setTracked(p.id)}
                className={cn(
                  "relative flex items-center gap-3 rounded-2xl border bg-card p-3 text-left transition-all",
                  p.isTracked ? "border-primary shadow-md shadow-primary/20" : "border-border",
                )}
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
            ))}
          </div>
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
            <div className="grid grid-cols-3 gap-2">
              {[3, 2, 1, 4, 5, 0].map((rotIdx) => {
                const id = rotation[rotIdx];
                const player = roster.find((p) => p.id === id);
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
                  />
                );
              })}
            </div>
            <div className="mt-2 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              NET
              <span className="h-px flex-1 bg-border" />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-popover p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <button
          type="button"
          disabled={!rotationFull || !trackedId}
          onClick={handleStart}
          className={cn(
            "flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-base font-black uppercase tracking-widest transition-all",
            rotationFull && trackedId
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 active:scale-[0.98]"
              : "bg-card text-muted-foreground",
          )}
        >
          <Volleyball className="h-5 w-5" />
          Start Game
        </button>
        {(!rotationFull || !trackedId) && (
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            {!trackedId ? "Pick your player. " : ""}
            {!rotationFull ? "Set all 6 court positions." : ""}
          </p>
        )}
      </footer>
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
}: {
  label: string;
  sub: string;
  player: Player | undefined;
  onClear: () => void;
  onPick: (pid: string) => void;
  roster: Player[];
  rotation: (string | null)[];
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
          player ? "border-border" : "border-dashed border-border/60",
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
