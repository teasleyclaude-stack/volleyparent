import { createFileRoute } from "@tanstack/react-router";
import { PhoneShell } from "@/components/common/PhoneShell";
import { BottomTabs } from "@/components/common/BottomTabs";
import { useGameStore } from "@/store/gameStore";
import { useHistoryStore } from "@/store/historyStore";
import { useTheme } from "@/hooks/useTheme";
import { Trash2, Volleyball, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — CourtsideView" },
      { name: "description", content: "CourtsideView app settings." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const clear = useGameStore((s) => s.clearSession);
  const { theme, setTheme } = useTheme();
  const wipe = () => {
    if (!confirm("Clear all saved games? This cannot be undone.")) return;
    useHistoryStore.setState({ sessions: [] });
    clear();
  };

  return (
    <PhoneShell>
      <header className="px-5 pt-8 pb-3">
        <h1 className="text-2xl font-black tracking-tight text-foreground">Settings</h1>
      </header>

      <main className="flex-1 space-y-3 overflow-y-auto px-4 pb-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Volleyball className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-black text-foreground">CourtsideView</div>
              <div className="text-[11px] text-muted-foreground">v1.0 · Web</div>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Designed for parents and youth coaches. Data is stored on this device only.
          </p>
        </div>

        <section>
          <h2 className="mb-2 px-1 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
            Appearance
          </h2>
          <div className="rounded-2xl border border-border bg-card p-1">
            <div className="grid grid-cols-2 gap-1">
              {(
                [
                  { value: "dark" as const, label: "Dark", Icon: Moon },
                  { value: "light" as const, label: "Light", Icon: Sun },
                ]
              ).map(({ value, label, Icon }) => {
                const active = theme === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTheme(value)}
                    aria-pressed={active}
                    className={cn(
                      "flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-black uppercase tracking-widest transition-colors",
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          <p className="mt-2 px-1 text-[11px] text-muted-foreground">
            FanView pages always follow each watcher's own device preference.
          </p>
        </section>

        <button
          type="button"
          onClick={() => {
            if (confirm("End and discard the current live game?")) clear();
          }}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card text-sm font-bold uppercase tracking-widest text-muted-foreground"
        >
          Clear Active Game
        </button>

        <button
          type="button"
          onClick={wipe}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 text-sm font-bold uppercase tracking-widest text-destructive"
        >
          <Trash2 className="h-4 w-4" /> Wipe All Data
        </button>
      </main>

      <BottomTabs />
    </PhoneShell>
  );
}
