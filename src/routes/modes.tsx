import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ModeSelectPrompt } from "@/components/common/ModeSelectPrompt";
import { useGameStore } from "@/store/gameStore";

export const Route = createFileRoute("/modes")({
  head: () => ({
    meta: [
      { title: "Choose Mode — CourtsideView" },
      { name: "description", content: "Switch between Parent, Player, Coach, or Fan mode." },
    ],
  }),
  component: ModesPage,
});

function ModesPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const session = useGameStore((s) => s.session);
  const hasActive = !!session && !session.isCompleted;
  const [pending, setPending] = useState<{ resolve: (ok: boolean) => void } | null>(null);

  // Warm up the Home route bundle so the post-Continue navigation feels instant.
  useEffect(() => {
    router.preloadRoute({ to: "/" }).catch(() => {});
  }, [router]);

  const beforeSave = () => {
    console.log("[modes] beforeSave called, hasActive=", hasActive, "session=", session);
    return new Promise<boolean>((resolve) => {
      if (!hasActive) {
        console.log("[modes] no active session, resolving true");
        return resolve(true);
      }
      console.log("[modes] active session, opening confirm dialog");
      setPending({ resolve });
    });
  };

  const handleConfirm = () => {
    pending?.resolve(true);
    setPending(null);
  };
  const handleCancel = () => {
    pending?.resolve(false);
    setPending(null);
  };

  return (
    <>
      <ModeSelectPrompt open beforeSave={beforeSave} onContinue={() => navigate({ to: "/" })} />
      {pending && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 px-6">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
            <h2 className="text-lg font-black text-foreground">Switch mode during live game?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              You have an active match in progress
              {session ? ` (${session.homeTeam} ${session.homeScore}–${session.awayScore} ${session.awayTeam})` : ""}.
              Switching mode will leave the live dashboard. Your match state stays saved and you can resume from Home.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm font-bold text-foreground active:scale-[0.98]"
              >
                Stay in game
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground active:scale-[0.98]"
              >
                Switch mode
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
