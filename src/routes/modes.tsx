import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ModeSelectPrompt } from "@/components/common/ModeSelectPrompt";

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
  return <ModeSelectPrompt open onContinue={() => navigate({ to: "/" })} />;
}
