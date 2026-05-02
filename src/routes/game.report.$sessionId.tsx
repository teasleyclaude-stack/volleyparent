import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Share2, Download, Plus, FileText } from "lucide-react";
import { PhoneShell } from "@/components/common/PhoneShell";
import { useHistoryStore } from "@/store/historyStore";
import { useGameStore } from "@/store/gameStore";
import { StatSummaryCard } from "@/components/report/StatSummaryCard";
import { ShotChart } from "@/components/report/ShotChart";
import { MomentumGraph } from "@/components/report/MomentumGraph";
import { useMemo } from "react";
import { readableTextColor } from "@/lib/colorContrast";
import { formatLabelShort } from "@/utils/setRules";
import { exportSessionPDF } from "@/utils/pdfReport";
import { ERROR_TYPE_LABELS, type ErrorType, getPositionGroup, passAverage, dumpHittingPct } from "@/types";

export const Route = createFileRoute("/game/report/$sessionId")({
  head: () => ({
    meta: [
      { title: "Game Report — CourtsideView" },
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

  const errorBreakdown = useMemo(() => {
    const counts: Partial<Record<ErrorType, number>> = {};
    session?.events.forEach((e) => {
      if (e.type === "STAT" && e.statType === "error" && e.errorType) {
        counts[e.errorType] = (counts[e.errorType] ?? 0) + 1;
      }
    });
    return Object.entries(counts)
      .filter(([, c]) => (c ?? 0) > 0)
      .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0)) as [ErrorType, number][];
  }, [session]);

  const csvBlobUrl = useMemo(() => {
    if (!session) return null;
    const rows: string[][] = [
      [
        "Player",
        "Number",
        "Position",
        "Kills",
        "Errors",
        "Att",
        "Hit%",
        "Digs",
        "Blocks",
        "Aces",
        "Assists",
        "DumpKills",
        "DumpErrors",
        "DumpAtt",
        "SettingErrors",
        "PassAtt",
        "PassAvg",
      ],
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
          String(p.stats.assists),
          String(p.stats.dumpKills ?? 0),
          String(p.stats.dumpErrors ?? 0),
          String(p.stats.dumpAttempts ?? 0),
          String(p.stats.settingErrors ?? 0),
          String(p.stats.passAttempts ?? 0),
          passAverage(p.stats),
        ];
      }),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    return URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  }, [session]);

  const trackedGroup = tracked ? getPositionGroup(tracked.position) : "attacker";

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
        await nav.share({ title: "CourtsideView Game Report", text: txt });
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
          const homeText = readableTextColor(session.homeColor);
          const awayText = readableTextColor(session.awayColor);
          return (
            <div
              className={`rounded-2xl border p-4 text-center ${ourWin ? "border-primary/50 bg-primary/10" : "border-border bg-card"}`}
            >
              <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                <span>Final</span>
                <span className="rounded-full bg-popover px-2 py-0.5 text-[11px] font-black uppercase tracking-widest text-foreground">
                  {formatLabelShort(session.matchFormat ?? "highschool")}
                </span>
              </div>
              <div
                className="mt-1 text-xl font-black"
                style={{ color: homeWon ? homeText : awayText }}
              >
                {winner || "—"} wins
              </div>
              <div className="mt-2 flex items-center justify-center gap-3 text-3xl font-black tabular-nums">
                <span style={{ color: homeWon ? homeText : "var(--muted-foreground)" }}>
                  {homeSetsWon}
                </span>
                <span className="text-muted-foreground/40">—</span>
                <span style={{ color: !homeWon ? awayText : "var(--muted-foreground)" }}>
                  {awaySetsWon}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-center gap-3 text-[10px] font-bold uppercase tracking-widest">
                <span style={{ color: homeText }}>{session.homeTeam || "Home"}</span>
                <span className="text-muted-foreground">·</span>
                <span style={{ color: awayText }}>{session.awayTeam || "Away"}</span>
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

        {errorBreakdown.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-3">
            <h3 className="mb-2 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
              Error Breakdown
            </h3>
            <div className="divide-y divide-border">
              {errorBreakdown.map(([type, count]) => (
                <div key={type} className="flex items-center justify-between py-1.5">
                  <span className="text-sm font-bold text-foreground">{ERROR_TYPE_LABELS[type]}</span>
                  <span className="text-sm font-black tabular-nums text-[#FF4D4D]">{count}</span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                <span>Total Errors</span>
                <span className="tabular-nums">
                  {errorBreakdown.reduce((sum, [, c]) => sum + c, 0)}
                </span>
              </div>
            </div>
          </div>
        )}

        {trackedGroup === "attacker" && <ShotChart killZones={killZones} />}

        {trackedGroup === "setter" && (
          <div className="rounded-2xl border border-border bg-card p-3">
            <h3 className="mb-2 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
              Setter Summary
            </h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <ReportStat label="Assists" value={tracked.stats.assists} color="#A78BFA" />
              <ReportStat label="Dump Kills" value={tracked.stats.dumpKills ?? 0} color="var(--kill)" />
              <ReportStat label="Setting Err" value={tracked.stats.settingErrors ?? 0} color="var(--error)" />
              <ReportStat label="Dump Att" value={tracked.stats.dumpAttempts ?? 0} color="var(--foreground)" />
              <ReportStat label="Dump Err" value={tracked.stats.dumpErrors ?? 0} color="var(--error)" />
              <ReportStat label="Dump %" value={dumpHittingPct(tracked.stats)} color="var(--primary)" />
            </div>
          </div>
        )}

        {trackedGroup === "defensive" && (
          <div className="rounded-2xl border border-border bg-card p-3">
            <h3 className="mb-2 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
              Passing Report
            </h3>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Pass Average
                </div>
                <div className="text-4xl font-black tabular-nums text-[#22D3EE]">
                  {passAverage(tracked.stats)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Total Passes
                </div>
                <div className="text-2xl font-black tabular-nums text-foreground">
                  {tracked.stats.passAttempts ?? 0}
                </div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2 text-center">
              <PassPill grade="3" value={tracked.stats.passGrade3 ?? 0} color="#39FF14" />
              <PassPill grade="2" value={tracked.stats.passGrade2 ?? 0} color="#22D3EE" />
              <PassPill grade="1" value={tracked.stats.passGrade1 ?? 0} color="#F4B400" />
              <PassPill grade="0" value={tracked.stats.passGrade0 ?? 0} color="#FF4D4D" />
            </div>
          </div>
        )}

        <MomentumGraph
          events={session.events}
          homeTeam={session.homeTeam}
          awayTeam={session.awayTeam}
          isHomeOurs={session.isHomeTeam}
        />

        <div className="grid grid-cols-3 gap-2">
          {csvBlobUrl && (
            <a
              href={csvBlobUrl}
              download={`volleyparent-${session.id}.csv`}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-card text-xs font-black uppercase tracking-widest text-foreground active:scale-95"
            >
              <Download className="h-4 w-4" /> CSV
            </a>
          )}
          <button
            type="button"
            onClick={() => exportSessionPDF(session)}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-card text-xs font-black uppercase tracking-widest text-foreground active:scale-95"
          >
            <FileText className="h-4 w-4" /> PDF
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-card text-xs font-black uppercase tracking-widest text-foreground active:scale-95"
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

function ReportStat({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="rounded-xl bg-popover py-2">
      <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="text-xl font-black tabular-nums" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

function PassPill({ grade, value, color }: { grade: string; value: number; color: string }) {
  return (
    <div className="rounded-xl bg-popover py-2">
      <div className="text-2xl font-black tabular-nums" style={{ color }}>
        {value}
      </div>
      <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
        Grade {grade}
      </div>
    </div>
  );
}
