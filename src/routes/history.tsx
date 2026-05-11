import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { PhoneShell } from "@/components/common/PhoneShell";
import { BottomTabs } from "@/components/common/BottomTabs";
import { useHistoryStore } from "@/store/historyStore";
import { useScoreOnlyHistoryStore } from "@/store/scoreOnlyHistoryStore";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "History — CourtsideView" },
      { name: "description", content: "Past volleyball matches and game reports." },
    ],
  }),
  component: HistoryPage,
});

type Item =
  | {
      kind: "full";
      id: string;
      date: string;
      sortKey: number;
      data: ReturnType<typeof useHistoryStore.getState>["sessions"][number];
    }
  | {
      kind: "fan";
      id: string;
      date: string;
      sortKey: number;
      data: ReturnType<typeof useScoreOnlyHistoryStore.getState>["sessions"][number];
    };

function HistoryPage() {
  const fullSessions = useHistoryStore((s) => s.sessions);
  const removeFull = useHistoryStore((s) => s.removeSession);
  const fanSessions = useScoreOnlyHistoryStore((s) => s.sessions);
  const removeFan = useScoreOnlyHistoryStore((s) => s.removeSession);

  const items = useMemo<Item[]>(() => {
    const a: Item[] = fullSessions.map((s) => ({
      kind: "full",
      id: s.id,
      date: s.date,
      sortKey: new Date(s.date).getTime(),
      data: s,
    }));
    const b: Item[] = fanSessions.map((s) => ({
      kind: "fan",
      id: s.id,
      date: s.date,
      sortKey: new Date(s.date).getTime(),
      data: s,
    }));
    return [...a, ...b].sort((x, y) => y.sortKey - x.sortKey);
  }, [fullSessions, fanSessions]);

  return (
    <PhoneShell>
      <header className="px-5 pt-8 pb-3">
        <h1 className="text-2xl font-black tracking-tight text-foreground">History</h1>
        <p className="mt-1 text-sm text-muted-foreground">{items.length} saved games</p>
      </header>

      <main className="flex-1 space-y-2 overflow-y-auto px-4 pb-4">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No games yet.
          </div>
        ) : (
          items.map((it) => {
            if (it.kind === "full") {
              const s = it.data;
              const tracked = s.roster.find((p) => p.isTracked);
              return (
                <div key={`full-${it.id}`} className="flex items-center gap-2">
                  <Link
                    to="/game/report/$sessionId"
                    params={{ sessionId: s.id }}
                    className="flex flex-1 items-center justify-between rounded-2xl border border-border bg-card p-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-foreground">
                        {s.homeTeam} vs {s.awayTeam}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {new Date(s.date).toLocaleString()} · {s.completedSets.length} sets
                      </div>
                    </div>
                    {tracked && (
                      <div className="text-right">
                        <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          {tracked.name.split(" ")[0]}
                        </div>
                        <div className="text-base font-black tabular-nums text-primary">
                          {tracked.stats.kills}K · {tracked.stats.digs}D
                        </div>
                      </div>
                    )}
                  </Link>
                  <button
                    type="button"
                    onClick={() => removeFull(s.id)}
                    className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-card text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            }
            const s = it.data;
            return (
              <div key={`fan-${it.id}`} className="flex items-center gap-2">
                <div className="flex flex-1 items-center justify-between rounded-2xl border border-border bg-card p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest"
                        style={{
                          backgroundColor: "rgba(57,255,20,0.15)",
                          color: "#39FF14",
                        }}
                      >
                        Fan Mode
                      </span>
                      <span className="truncate text-sm font-bold text-foreground">
                        {s.myTeam} vs {s.opponent}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      {new Date(s.date).toLocaleString()} · {s.completedSets.length} sets ·{" "}
                      <span className="font-black tabular-nums text-foreground">
                        {s.myTeamSetsWon}–{s.opponentSetsWon}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeFan(s.id)}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-card text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })
        )}
      </main>

      <BottomTabs />
    </PhoneShell>
  );
}
