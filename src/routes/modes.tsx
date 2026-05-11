import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ModeSelectPrompt } from "@/components/common/ModeSelectPrompt";
import { useGameStore } from "@/store/gameStore";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

  const beforeSave = () =>
    new Promise<boolean>((resolve) => {
      if (!hasActive) return resolve(true);
      setPending({ resolve });
    });

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
      <AlertDialog open={!!pending} onOpenChange={(o) => !o && handleCancel()}>
        <AlertDialogContent className="z-[200]">
          <AlertDialogHeader>
            <AlertDialogTitle>Switch mode during live game?</AlertDialogTitle>
            <AlertDialogDescription>
              You have an active match in progress
              {session ? ` (${session.homeTeam} ${session.homeScore}–${session.awayScore} ${session.awayTeam})` : ""}.
              Switching mode will leave the live dashboard. Your match state stays saved and you can resume from Home.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>Stay in game</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>Switch mode</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
