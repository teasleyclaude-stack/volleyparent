import { useGameStore } from "@/store/gameStore";
import { usePracticeStore } from "@/store/practiceStore";
import type { Player, RotationState } from "@/types";

const PRACTICE_ROSTER: Player[] = [
  { id: "p1", name: "Emma R.", number: 12, position: "OH", isTracked: true,  liberoPartnerId: null, stats: stats() },
  { id: "p2", name: "Sofia K.", number: 7,  position: "S",  isTracked: false, liberoPartnerId: null, stats: stats() },
  { id: "p3", name: "Ava M.",   number: 3,  position: "MB", isTracked: false, liberoPartnerId: null, stats: stats() },
  { id: "p4", name: "Lily T.",  number: 18, position: "RS", isTracked: false, liberoPartnerId: null, stats: stats() },
  { id: "p5", name: "Chloe W.", number: 5,  position: "L",  isTracked: false, liberoPartnerId: null, stats: stats() },
  { id: "p6", name: "Maya P.",  number: 21, position: "MB", isTracked: false, liberoPartnerId: null, stats: stats() },
  { id: "p7", name: "Jess B.",  number: 9,  position: "DS", isTracked: false, liberoPartnerId: null, stats: stats() },
  { id: "p8", name: "Nora H.",  number: 14, position: "OH", isTracked: false, liberoPartnerId: null, stats: stats() },
  { id: "p9", name: "Riley S.", number: 2,  position: "S",  isTracked: false, liberoPartnerId: null, stats: stats() },
  { id: "p10", name: "Zoe D.",  number: 11, position: "MB", isTracked: false, liberoPartnerId: null, stats: stats() },
];

function stats() {
  return { kills: 0, errors: 0, totalAttempts: 0, digs: 0, blocks: 0, aces: 0, assists: 0, dugAttempts: 0 };
}

const HOME_ROT: RotationState = ["p1", "p2", "p3", "p4", "p5", "p6"];
const AWAY_ROT: RotationState = ["opp-1", "opp-2", "opp-3", "opp-4", "opp-5", "opp-6"];

/**
 * Boots a fully isolated practice session and flips the practice flag on.
 * The session is NEVER saved to history — see saveSession in components
 * which short-circuits when isPractice is true.
 */
export function startPracticeMode() {
  usePracticeStore.getState().start();
  useGameStore.getState().startSession({
    homeTeam: "Your Team",
    awayTeam: "Opponent",
    homeColor: "#1E88E5",
    awayColor: "#E53935",
    isHomeTeam: true,
    matchFormat: "club",
    roster: PRACTICE_ROSTER.map((p) => ({ ...p, stats: stats() })),
    homeRotation: HOME_ROT,
    awayRotation: AWAY_ROT,
    isHomeServing: true,
  });
}
