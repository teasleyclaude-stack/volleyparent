import { AlertTriangle, Wand2, XCircle } from "lucide-react";
import type { Player, RotationState } from "@/types";
import {
  repairRotation,
  rotationDiffers,
  type RotationIssue,
} from "@/utils/rotationValidation";

interface RotationWarningProps {
  issues: RotationIssue[];
  rotation: RotationState;
  roster: Player[];
  onRepair: (next: RotationState) => void;
}

export function RotationWarning({
  issues,
  rotation,
  roster,
  onRepair,
}: RotationWarningProps) {
  if (issues.length === 0) return null;

  const hasError = issues.some((i) => i.severity === "error");
  const Icon = hasError ? XCircle : AlertTriangle;
  const tone = hasError
    ? "border-destructive/40 bg-destructive/10 text-destructive"
    : "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400";

  const proposed = repairRotation(rotation, roster);
  const canRepair = proposed !== null && rotationDiffers(rotation, proposed);

  // Build a short preview of what the repair will change (slot → jersey #).
  const preview =
    proposed && canRepair
      ? proposed
          .map((id, idx) => ({ idx, id, prev: rotation[idx] }))
          .filter((c) => c.id !== c.prev)
          .map((c) => {
            const p = roster.find((r) => r.id === c.id);
            return `P${c.idx + 1}→#${p?.number ?? "?"}`;
          })
          .join(" · ")
      : "";

  return (
    <div className={`mx-4 mt-3 rounded-2xl border px-3 py-2.5 ${tone}`}>
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.25} />
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-black uppercase tracking-widest">
            {hasError ? "Rotation problem" : "Rotation warning"}
          </div>
          <ul className="mt-1 space-y-0.5 text-[11px] font-medium leading-snug">
            {issues.map((issue, idx) => (
              <li key={`${issue.code}-${idx}`}>• {issue.message}</li>
            ))}
          </ul>

          {canRepair && proposed && (
            <div className="mt-2 flex flex-col gap-1.5">
              <div className="text-[10px] font-medium opacity-80">
                Suggested fix: {preview}
              </div>
              <button
                type="button"
                onClick={() => onRepair(proposed)}
                className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-current/30 bg-current/10 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest active:scale-[0.97]"
              >
                <Wand2 className="h-3 w-3" strokeWidth={2.5} />
                Apply auto-repair
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
