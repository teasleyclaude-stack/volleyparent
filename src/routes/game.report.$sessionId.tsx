import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Share2, Download, Plus } from "lucide-react";
import { PhoneShell } from "@/components/common/PhoneShell";
import { useHistoryStore } from "@/store/historyStore";
import { useGameStore } from "@/store/gameStore";
import { StatSummaryCard } from "@/components/report/StatSummaryCard";
import { ShotChart } from "@/components/report/ShotChart";
import { MomentumGraph } from "@/components/report/MomentumGraph";
import { useMemo } from "react";

export const Route = createFileRoute("/game/report/$sessionId")({
  head: () => ({
    meta: [
      { title: "Game Report — VolleyParent" },
      { name: "description", content: "Post-game volleyball stat report with shot chart and momentum analysis." },
    ],
  }),
  component: ReportPage,
});

function ReportPage() {
  const { sessionId } = useParams({ from: "/game/report/$sessionId" });
  const fromHistory = useHistoryStore((s) => s.getSession(sessionId));
  const live = useGameStore((s) => s.session);
  const session = fromHistory ?? (live?.id === sessionId ? live : null);

  const tracked = useMemo(() => session?.roster.find((p) => p.isTracked) ?? session?.roster[0], [session]);

  const killZones = useMemo(
    () =>
      session?.events
        .filter((e) => e.type === "STAT" && e.statType === "kill" && e.playerId === tracked?.id && e.killZone)
        .map((e) => e.killZone as number) ?? [],
    [session, tracked],
  );

  const csvBlobUrl = useMemo(() => {
    if (!session) return null;
    const rows: string[][] = [
      ["Player", "Number", "Position", "Kills", "Errors", "Att", "Hit%", "Digs", "Blocks", "Aces"],
      ...session.roster.map((p) => {
        const hp =
          p.stats.totalAttempts === 0
            ? ".000"
            : ((p.stats.kills - p.stats.errors) / p.stats.totalAttempts).toFixed(3);
        return [
          p.name,
          String(p.number),
          p.position,
          String(p.stats.kills),
          String(p.stats.errors),
          String(p.stats.totalAttempts),
          hp,
          String(p.stats.digs),
          String(p.stats.blocks),
          String(p.stats.aces),
        ];
      }),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    return URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  }, [session]);

  if (!session || !tracked) {
    return (
      <PhoneShell>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-muted-foreground">Game not found.</p>
          <Link to="/" className="rounded-2xl bg-primary px-5 py-3 text-sm font-black uppercase tracking-widest text-primary-foreground">
            Go home
          </Link>
        </div>
      </PhoneShell>
    );
  }

  const handleShare = async () => {
    const txt = `${tracked.name} #${tracked.number} — ${session.homeTeam} vs ${session.awayTeam}\nKills: ${tracked.stats.kills}, Digs: ${tracked.stats.digs}, Blocks: ${tracked.stats.blocks}, Aces: ${tracked.stats.aces}`;
    type NavShare = Navigator & { share?: (data: ShareData) => Promise<void> };
    const nav = navigator as NavShare;
    if (nav.share) {
      try {
        await nav.share({ title: "VolleyParent Game Report", text: txt });
      } catch { /* user cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(txt);
        alert("Report copied to clipboard");
      } catch { alert(txt); }
    }
  };

  return (
    <PhoneShell>
      <header className="flex items-center justify-between border-b border-border bg-popover px-3 py-2">
        <Link to="/" className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="text-center">
          <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Final</div>
          <div className="text-sm font-bold text-foreground">
            {session.homeTeam} vs {session.awayTeam}
          </div>
        </div>
        <button
          type="button"
          onClick={handleShare}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-foreground"
        >
          <Share2 className="h-4 w-4" />
        </button>
      </header>

      <main className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {/* Final match result */}
        {(() => {
          const homeSetsWon = session.completedSets.filter((s) => s.homeScore > s.awayScore).length;
          const awaySetsWon = session.completedSets.filter((s) => s.awayScore > s.homeScore).length;
          const homeWon = homeSetsWon > awaySetsWon;
          const winner = homeWon ? session.homeTeam : session.awayTeam;
          const ourWin = homeWon === session.isHomeTeam;
          return (
            <div
              className={`rounded-2xl border p-4 text-center ${ourWin ? "border-primary/50 bg-primary/10" : "border-border bg-card"}`}
            >
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Final · Best of 5
              </div>
              <div className="mt-1 text-xl font-black text-foreground">{winner || "—"} wins</div>
              <div className="mt-2 flex items-center justify-center gap-3 text-3xl font-black tabular-nums">
                <span className={homeWon ? "text-[var(--gold)]" : "text-muted-foreground"}>
                  {homeSetsWon}
                </span>
                <span className="text-muted-foreground/40">—</span>
                <span className={!homeWon ? "text-[var(--gold)]" : "text-muted-foreground"}>
                  {awaySetsWon}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-center gap-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <span>{session.homeTeam || "Home"}</span>
                <span>·</span>
                <span>{session.awayTeam || "Away"}</span>
              </div>
            </div>
          );
        })()}

        <StatSummaryCard player={tracked} />

        {/* Set scores */}
        {session.completedSets.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-3">
            <h3 className="mb-2 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
              Sets
            </h3>
            <div className="flex flex-wrap gap-2">
              {session.completedSets.map((s) => {
                const ourWin = (s.homeScore > s.awayScore) === session.isHomeTeam;
                return (
                  <div
                    key={s.setNumber}
                    className={`rounded-xl border px-3 py-2 text-center ${ourWin ? "border-primary/40 bg-primary/10" : "border-border bg-popover"}`}
                  >
                    <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                      Set {s.setNumber}
                    </div>
                    <div className="text-base font-black tabular-nums text-foreground">
                      {s.homeScore}–{s.awayScore}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <ShotChart killZones={killZones} />

        <MomentumGraph
          events={session.events}
          homeTeam={session.homeTeam}
          awayTeam={session.awayTeam}
          isHomeOurs={session.isHomeTeam}
        />

        <div className="grid grid-cols-2 gap-2">
          {csvBlobUrl && (
            <a
              href={csvBlobUrl}
              download={`volleyparent-${session.id}.csv`}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-card text-sm font-black uppercase tracking-widest text-foreground active:scale-95"
            >
              <Download className="h-4 w-4" /> CSV
            </a>
          )}
          <button
            type="button"
            onClick={handleShare}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-card text-sm font-black uppercase tracking-widest text-foreground active:scale-95"
          >
            <Share2 className="h-4 w-4" /> Share
          </button>
        </div>

        <Link
          to="/game/setup"
          className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-primary text-base font-black uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/30 active:scale-[0.98]"
        >
          <Plus className="h-5 w-5" /> New Game
        </Link>
      </main>
    </PhoneShell>
  );
}
