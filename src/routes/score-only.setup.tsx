import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { PhoneShell } from "@/components/common/PhoneShell";
import { ScoreOnlyColorPicker } from "@/components/score-only/ScoreOnlyColorPicker";
import {
  DEFAULT_SETUP,
  type ScoreOnlySetup,
} from "@/utils/scoreOnly";
import {
  useScoreOnlyStore,
  readSavedScoreOnlySetup,
  writeSavedScoreOnlySetup,
} from "@/store/scoreOnlyStore";
import type { MatchFormat } from "@/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/score-only/setup")({
  head: () => ({
    meta: [
      { title: "Fan Mode Setup — CourtsideView" },
      { name: "description", content: "Quick score-only volleyball tracking setup." },
    ],
  }),
  component: SetupPage,
});

function SetupPage() {
  const navigate = useNavigate();
  const start = useScoreOnlyStore((s) => s.start);
  const existing = useScoreOnlyStore((s) => s.session);

  const [setup, setSetup] = useState<ScoreOnlySetup>(DEFAULT_SETUP);

  useEffect(() => {
    const saved = readSavedScoreOnlySetup();
    if (saved) setSetup({ ...DEFAULT_SETUP, ...saved });
  }, []);

  const update = (patch: Partial<ScoreOnlySetup>) =>
    setSetup((prev) => ({ ...prev, ...patch }));

  const canStart = setup.myTeam.trim().length > 0 && setup.opponent.trim().length > 0;
  const hasActive = !!existing && !existing.isCompleted;

  const handleStart = () => {
    if (!canStart) return;
    writeSavedScoreOnlySetup(setup);
    start(setup);
    navigate({ to: "/score-only/live" });
  };

  return (
    <PhoneShell>
      <header className="flex items-center gap-3 border-b border-border bg-popover px-4 py-3">
        <Link
          to="/"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <div className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
            Fan Mode
          </div>
          <h1 className="text-lg font-black text-foreground">Score-Only Setup</h1>
        </div>
      </header>

      <main className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
        {hasActive && (
          <Link
            to="/score-only/live"
            className="flex items-center justify-between rounded-2xl border border-primary/40 bg-primary/10 p-3"
          >
            <div className="text-sm font-bold text-foreground">
              Resume — {existing!.myTeam} {existing!.myTeamScore}–{existing!.opponentScore}{" "}
              {existing!.opponent}
            </div>
            <span className="text-[11px] font-black uppercase tracking-widest text-primary">
              Open
            </span>
          </Link>
        )}

        <section className="space-y-3">
          <h2 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
            My Team
          </h2>
          <input
            value={setup.myTeam}
            onChange={(e) => update({ myTeam: e.target.value })}
            placeholder="My team name"
            className="h-12 w-full rounded-2xl border border-border bg-card px-4 text-base font-medium text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
          />
          <div>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Team color
            </div>
            <ScoreOnlyColorPicker
              label={setup.myTeam.trim() || "My Team"}
              value={setup.myTeamColor}
              onChange={(v) => update({ myTeamColor: v })}
            />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
            Opponent
          </h2>
          <input
            value={setup.opponent}
            onChange={(e) => update({ opponent: e.target.value })}
            placeholder="Opponent name"
            className="h-12 w-full rounded-2xl border border-border bg-card px-4 text-base font-medium text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
          />
          <div>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Opponent color
            </div>
            <ScoreOnlyColorPicker
              label={setup.opponent.trim() || "Opponent"}
              value={setup.opponentColor}
              onChange={(v) => update({ opponentColor: v })}
            />
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
            Match Format
          </h2>
          <div className="grid grid-cols-2 gap-0 overflow-hidden rounded-xl border border-border/50 h-12">
            {(["club", "highschool"] as MatchFormat[]).map((fmt) => {
              const active = setup.matchFormat === fmt;
              return (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => update({ matchFormat: fmt })}
                  className={cn(
                    "flex h-full w-full items-center justify-center text-[11px] font-black uppercase tracking-widest transition-colors",
                    active
                      ? "bg-[#39FF14] text-[#0A0E1A]"
                      : "bg-transparent text-muted-foreground",
                  )}
                >
                  {fmt === "club" ? "Club · Best of 3" : "HS · Best of 5"}
                </button>
              );
            })}
          </div>
        </section>

        <button
          type="button"
          disabled={!canStart}
          onClick={handleStart}
          className={cn(
            "h-14 w-full rounded-2xl text-base font-black uppercase tracking-widest transition-opacity active:scale-[0.98]",
            !canStart && "opacity-40",
          )}
          style={{ backgroundColor: "#39FF14", color: "#0A0E1A" }}
        >
          Start Scoring
        </button>
      </main>
    </PhoneShell>
  );
}
