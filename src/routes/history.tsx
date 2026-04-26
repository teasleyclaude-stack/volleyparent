import { createFileRoute, Link } from "@tanstack/react-router";
import { PhoneShell } from "@/components/common/PhoneShell";
import { BottomTabs } from "@/components/common/BottomTabs";
import { useHistoryStore } from "@/store/historyStore";
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

function HistoryPage() {
  const sessions = useHistoryStore((s) => s.sessions);
  const remove = useHistoryStore((s) => s.removeSession);

  return (
    <PhoneShell>
      <header className="px-5 pt-8 pb-3">
        <h1 className="text-2xl font-black tracking-tight text-foreground">History</h1>
        <p className="mt-1 text-sm text-muted-foreground">{sessions.length} saved games</p>
      </header>

      <main className="flex-1 space-y-2 overflow-y-auto px-4 pb-4">
        {sessions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No games yet.
          </div>
        ) : (
          sessions.map((s) => {
            const tracked = s.roster.find((p) => p.isTracked);
            return (
              <div key={s.id} className="flex items-center gap-2">
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
                  onClick={() => remove(s.id)}
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
