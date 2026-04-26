import { createFileRoute } from "@tanstack/react-router";
import { PhoneShell } from "@/components/common/PhoneShell";
import { BottomTabs } from "@/components/common/BottomTabs";
import { SAMPLE_ROSTER } from "@/data/sampleRoster";
import { Star } from "lucide-react";

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
  return (
    <PhoneShell>
      <header className="px-5 pt-8 pb-3">
        <h1 className="text-2xl font-black tracking-tight text-foreground">Roster</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sample team. Set up new players from the game setup screen.
        </p>
      </header>

      <main className="flex-1 space-y-2 overflow-y-auto px-4 pb-4">
        {SAMPLE_ROSTER.map((p) => (
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
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {p.position}
              </div>
            </div>
          </div>
        ))}
      </main>

      <BottomTabs />
    </PhoneShell>
  );
}
