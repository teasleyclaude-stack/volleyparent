import { AlertTriangle, XCircle } from "lucide-react";
import type { RotationIssue } from "@/utils/rotationValidation";

interface RotationWarningProps {
  issues: RotationIssue[];
}

export function RotationWarning({ issues }: RotationWarningProps) {
  if (issues.length === 0) return null;

  const hasError = issues.some((i) => i.severity === "error");
  const Icon = hasError ? XCircle : AlertTriangle;
  const tone = hasError
    ? "border-destructive/40 bg-destructive/10 text-destructive"
    : "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400";

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
        </div>
      </div>
    </div>
  );
}
