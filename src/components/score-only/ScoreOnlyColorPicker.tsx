import { cn } from "@/lib/utils";
import { SCORE_ONLY_SWATCHES } from "@/utils/scoreOnly";

interface Props {
  label: string;
  value: string;
  onChange: (v: string) => void;
}

export function ScoreOnlyColorPicker({ label, value, onChange }: Props) {
  return (
    <div className="rounded-2xl border border-border bg-card p-2.5">
      <div className="mb-2 flex items-center gap-2">
        <span
          className="inline-block h-5 w-5 rounded-full border border-border"
          style={{ backgroundColor: value }}
        />
        <span className="truncate text-[11px] font-black uppercase tracking-widest text-foreground">
          {label}
        </span>
        <label className="ml-auto inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-popover text-[10px] text-muted-foreground">
          +
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="sr-only"
          />
        </label>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {SCORE_ONLY_SWATCHES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            aria-label={`Pick ${c}`}
            className={cn(
              "h-7 w-full rounded-md border transition-transform active:scale-95",
              value.toLowerCase() === c.toLowerCase()
                ? "border-foreground ring-2 ring-foreground/40"
                : "border-border",
            )}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
    </div>
  );
}
