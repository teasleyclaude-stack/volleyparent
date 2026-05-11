import { useState } from "react";
import { ArrowRight } from "lucide-react";

const STORAGE_KEY = "courtsideview_mode";

type Mode = "parent" | "player" | "coach" | "fan";

interface ModeOption {
  id: Mode;
  label: string;
  desc: string;
  emoji: string;
  available: boolean;
}

const OPTIONS: ModeOption[] = [
  { id: "parent", label: "Parent", desc: "Follow my kid everywhere", emoji: "👨‍👩‍👦", available: true },
  { id: "player", label: "Player", desc: "Track my game, build my profile", emoji: "🏐", available: false },
  { id: "coach", label: "Coach", desc: "Run the team, run the data", emoji: "📋", available: false },
  { id: "fan", label: "Fan", desc: "Just here to watch", emoji: "📣", available: false },
];

interface Props {
  open: boolean;
  onContinue: (mode: Mode) => void;
  beforeSave?: (mode: Mode) => Promise<boolean> | boolean;
}

export function ModeSelectPrompt({ open, onContinue, beforeSave }: Props) {
  const [selected, setSelected] = useState<Mode>("parent");

  if (!open) return null;

  const handleContinue = async () => {
    if (beforeSave) {
      const ok = await beforeSave(selected);
      if (!ok) return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, selected);
    } catch {
      /* noop */
    }
    onContinue(selected);
  };

  return (
    <div className="fixed inset-0 z-[140] flex flex-col overflow-y-auto bg-background px-6 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[calc(env(safe-area-inset-top)+2rem)]">
      <header className="mb-6">
        <h1 className="text-[34px] font-black leading-[1.05] text-foreground">Welcome,</h1>
        <h1 className="text-[34px] font-black italic leading-[1.05] text-primary">
          Volleyball fan!
        </h1>
        <p className="mt-4 text-[15px] leading-snug text-muted-foreground">
          Pick how you'll use CourtsideView. You can change this anytime in Settings.
        </p>
      </header>

      <div className="flex flex-col gap-3">
        {OPTIONS.map((opt) => {
          const isSelected = selected === opt.id;
          const disabled = !opt.available;
          return (
            <button
              key={opt.id}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && setSelected(opt.id)}
              className={`flex items-center gap-4 rounded-2xl border-2 bg-card p-4 text-left transition-all ${
                isSelected
                  ? "border-primary shadow-md"
                  : "border-border"
              } ${disabled ? "opacity-70" : "active:scale-[0.99]"}`}
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-muted text-3xl">
                <span aria-hidden>{opt.emoji}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="text-[20px] font-black text-foreground">{opt.label}</div>
                  {!opt.available && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Soon
                    </span>
                  )}
                </div>
                <div className="text-[14px] text-muted-foreground">{opt.desc}</div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-8">
        <button
          type="button"
          onClick={handleContinue}
          className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 active:scale-[0.98] transition-transform"
        >
          <ArrowRight className="h-5 w-5" />
          <span className="text-base font-black uppercase tracking-widest">Continue</span>
        </button>
        <p className="mt-3 text-center text-[12px] text-muted-foreground">
          You can change this anytime in Settings
        </p>
      </div>
    </div>
  );
}

export function getSavedMode(): Mode | null {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === "parent" || v === "player" || v === "coach" || v === "fan") return v;
  } catch {
    /* noop */
  }
  return null;
}
