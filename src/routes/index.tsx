import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Play, ArrowRight } from "lucide-react";
import { PhoneShell } from "@/components/common/PhoneShell";
import { BottomTabs } from "@/components/common/BottomTabs";
import { getSavedMode } from "@/components/common/ModeSelectPrompt";
import { useGameStore } from "@/store/gameStore";
import { useHistoryStore } from "@/store/historyStore";
import logo from "@/assets/courtsideview-logo.png";

const MODE_META: Record<string, { label: string; emoji: string }> = {
  parent: { label: "Parent Mode", emoji: "👨‍👩‍👦" },
  fan: { label: "Fan Mode", emoji: "📣" },
  player: { label: "Player Mode", emoji: "🏐" },
  coach: { label: "Coach Mode", emoji: "📋" },
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CourtsideView — Live Volleyball Stats" },
      { name: "description", content: "Track your player's volleyball stats live, court-side. Kills, digs, blocks, aces, and shot heat maps in real time." },
      { property: "og:title", content: "CourtsideView — Live Volleyball Stats" },
      { property: "og:description", content: "Track your player's volleyball stats live, court-side." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const session = useGameStore((s) => s.session);
  const sessions = useHistoryStore((s) => s.sessions);
  const activeLive = session && !session.isCompleted;
  const [mode, setMode] = useState<string | null>(null);

  useEffect(() => {
    setMode(getSavedMode());
    const onStorage = () => setMode(getSavedMode());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const modeMeta = mode ? MODE_META[mode] : null;

  return (
    <PhoneShell>
      <header className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <img
            src={logo}
            alt="CourtsideView logo"
            className="h-12 w-12 object-contain"
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-black tracking-tight text-foreground">CourtsideView</h1>
            {modeMeta && (
              <Link
                to="/modes"
                className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-primary active:scale-[0.97]"
              >
                <span aria-hidden>{modeMeta.emoji}</span>
                <span>{modeMeta.label}</span>
              </Link>
            )}
          </div>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">Your game day companion.</p>
      </header>

      <main className="flex-1 space-y-4 px-5 pb-6">
        {activeLive && (
          <Link
            to="/game/live"
            className="flex items-center justify-between rounded-2xl border border-primary/40 bg-primary/10 p-4"
          >
            <div className="flex items-center gap-3">
              <span className="vp-pulse-dot h-3 w-3 rounded-full bg-primary shadow-[0_0_12px] shadow-primary" />
              <div>
                <div className="text-[11px] font-black uppercase tracking-widest text-primary">Live Game</div>
                <div className="text-sm font-bold text-foreground">
                  {session.homeTeam} {session.homeScore}–{session.awayScore} {session.awayTeam}
                </div>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-primary" />
          </Link>
        )}

        <Link
          to="/game/setup"
          className="flex h-16 items-center justify-center gap-2 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 active:scale-[0.98] transition-transform"
        >
          <Play className="h-5 w-5 fill-current" strokeWidth={0} />
          <span className="text-base font-black uppercase tracking-widest">Start New Game</span>
        </Link>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Recent</h2>
            <Link to="/history" className="text-[11px] font-bold text-primary">
              View all
            </Link>
          </div>

          {sessions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center">
              <p className="text-sm text-muted-foreground">No games yet. Tap <strong className="text-foreground">Start New Game</strong> to begin.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {sessions.slice(0, 5).map((s) => {
                const tracked = s.roster.find((p) => p.isTracked);
                return (
                  <li key={s.id}>
                    <Link
                      to="/game/report/$sessionId"
                      params={{ sessionId: s.id }}
                      className="flex items-center justify-between rounded-2xl border border-border bg-card p-3"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-foreground">
                          {s.homeTeam} vs {s.awayTeam}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {new Date(s.date).toLocaleDateString()} · {s.completedSets.length} set{s.completedSets.length === 1 ? "" : "s"}
                        </div>
                      </div>
                      {tracked && (
                        <div className="text-right">
                          <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            {tracked.name.split(" ")[0]}
                          </div>
                          <div className="text-lg font-black tabular-nums text-primary">{tracked.stats.kills}K</div>
                        </div>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>

      <BottomTabs />
    </PhoneShell>
  );
}
