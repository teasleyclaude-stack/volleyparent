import confetti from "canvas-confetti";

/**
 * Fires a celebratory two-burst confetti animation in the winning team's color
 * mixed with white. Safe to call from useEffect — it uses a top-level full-screen
 * canvas so it sits above any modal.
 */
export function fireWinConfetti(teamColor: string) {
  const colors = ["#ffffff", "#ffffff", teamColor, teamColor, "#ffffff"];

  // First, big burst from top-center.
  confetti({
    particleCount: 200,
    spread: 90,
    startVelocity: 55,
    gravity: 0.9,
    ticks: 250,
    origin: { x: 0.5, y: 0.1 },
    colors,
    scalar: 1.1,
    zIndex: 9999,
  });

  // Second, lighter burst 400ms later for a "double-pop" feel.
  window.setTimeout(() => {
    confetti({
      particleCount: 90,
      spread: 70,
      startVelocity: 45,
      gravity: 1,
      ticks: 220,
      origin: { x: 0.5, y: 0.2 },
      colors: ["#ffffff", teamColor],
      scalar: 1,
      zIndex: 9999,
    });
  }, 400);
}
