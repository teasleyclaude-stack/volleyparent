import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PhoneShell } from "@/components/common/PhoneShell";
import { BottomTabs } from "@/components/common/BottomTabs";
import { useGameStore } from "@/store/gameStore";
import { useHistoryStore } from "@/store/historyStore";
import { useTheme } from "@/hooks/useTheme";
import { Trash2, Moon, Sun, Star, ChevronRight, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import logo from "@/assets/courtsideview-logo.png";
import { startPracticeMode } from "@/utils/practice";
import { resetAllTips } from "@/lib/tips";
import { toast } from "sonner";

const THEME_OPTIONS = [
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "light", label: "Light", Icon: Sun },
] as const;

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
  const navigate = useNavigate();

  const wipe = () => {
    if (!confirm("Clear all saved games? This cannot be undone.")) return;
    useHistoryStore.setState({ sessions: [] });
    clear();
  };

  const launchPractice = () => {
    startPracticeMode();
    navigate({ to: "/game/live" });
  };

  const handleResetTips = () => {
    resetAllTips();
    toast("Tips reset — they'll show again the next time each feature is used.");
  };

  return (
    <PhoneShell>
      <header className="px-5 pt-8 pb-3">
        <h1 className="text-2xl font-black tracking-tight text-foreground">Settings</h1>
      </header>

      <main className="flex-1 space-y-3 overflow-y-auto px-4 pb-4">
        <section>
          <h2 className="mb-2 px-1 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
            Practice Mode
          </h2>
          <button
            type="button"
            onClick={launchPractice}
            className="flex w-full items-center justify-between rounded-2xl border border-border bg-card p-4 text-left active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <Star className="h-5 w-5 fill-[#39FF14] text-[#39FF14]" strokeWidth={1.5} />
              <div>
                <div className="text-sm font-black text-foreground">Launch Practice Game</div>
                <div className="text-[11px] text-muted-foreground">Learn the app before game day</div>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
          <button
            type="button"
            onClick={handleResetTips}
            className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card text-[12px] font-bold uppercase tracking-widest text-muted-foreground active:scale-[0.99]"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset all tips
          </button>
        </section>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl">
              <img src={logo} alt="CourtsideView logo" className="h-full w-full object-contain" />
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
              {THEME_OPTIONS.map(({ value, label, Icon }) => {
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
