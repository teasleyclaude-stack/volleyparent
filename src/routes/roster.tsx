import { createFileRoute, Link } from "@tanstack/react-router";
import { PhoneShell } from "@/components/common/PhoneShell";
import { BottomTabs } from "@/components/common/BottomTabs";
import { useHistoryStore } from "@/store/historyStore";
import { Star, Users } from "lucide-react";
import { defaultStats } from "@/types";
import type { Player } from "@/types";

export const Route = createFileRoute("/roster")({
  head: () => ({
    meta: [
      { title: "Roster — CourtsideView" },
      { name: "description", content: "Manage your team roster for live volleyball stat tracking." },
    ],
  }),
  component: RosterPage,
});

function RosterPage() {
  const lastRoster = useHistoryStore((s) => s.lastRoster);
  const sessions = useHistoryStore((s) => s.sessions);

  const source = lastRoster ?? sessions[0]?.roster ?? null;
  const roster: Player[] = source
    ? source.map((p: Player) => ({ ...p, stats: defaultStats() }))
    : [];

  return (
    <PhoneShell>
      <header className="px-5 pt-8 pb-3">
        <h1 className="text-2xl font-black tracking-tight text-foreground">Roster</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {roster.length > 0
            ? "Your most recent team. Edit players from the game setup screen."
            : "No roster yet."}
        </p>
      </header>

      <main className="flex-1 space-y-2 overflow-y-auto px-4 pb-4">
        {roster.length === 0 ? (
          <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-popover">
              <Users className="h-6 w-6 text-muted-foreground" strokeWidth={1.75} />
            </div>
            <h2 className="mt-4 text-base font-bold text-foreground">No roster yet</h2>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              Set up your team from the Game Setup screen to start tracking stats.
            </p>
            <Link
              to="/game/setup"
              className="mt-5 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
            >
              Go to Game Setup
            </Link>
          </div>
        ) : (
          roster.map((p) => {
            const lib = p.position === "L";
            return (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-popover text-base font-black tabular-nums text-foreground">
                  {p.number}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                    {p.name}
                    {p.isTracked && <Star className="h-3.5 w-3.5 fill-primary text-primary" strokeWidth={1.5} />}
                    {lib && (
                      <span
                        className="ml-1 rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-white"
                        style={{ backgroundColor: "#00ACC1" }}
                      >
                        LIB
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {p.position}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </main>

      <BottomTabs />
    </PhoneShell>
  );
}
