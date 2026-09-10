import { RUN_BEATS } from "../simulation/run";
import type { State } from "../simulation/types";

// Presentation roles keyed by authored room identity, never by an art-test index.
export const COURT_ROOMS = {
  "The threshold": {
    role: "entrance",
    pigment: 0x7f9c8d,
    landmark: [12.84, 1.2, -2],
    scale: 0.55,
    columns: [-8, 8],
    copy: "The road ends at a court that still remembers its makers.",
  },
  "Footsteps in the court": {
    role: "gallery",
    pigment: 0x79969b,
    landmark: [-12.84, 1.5, -5],
    scale: 0.65,
    columns: [-9, -5, 5, 9],
    copy: "Footsteps stir beneath the painted colonnade.",
  },
  "The divided hall": {
    role: "hall",
    pigment: 0x8f7890,
    landmark: [-12.84, 1.5, -3],
    scale: 0.65,
    columns: [-8, 8],
    copy: "The old hall is divided. Its magic is not.",
  },
  "The closing circle": {
    role: "approach",
    pigment: 0x967c70,
    landmark: [12.84, 1.2, -3],
    scale: 0.85,
    columns: [-9, -6, 6, 9],
    copy: "Beyond the fractured pillars, the last ward strains against its bindings.",
  },
  "The last ward": {
    role: "ward",
    pigment: 0x527986,
    landmark: [-12.84, 1.5, -3],
    scale: 0.85,
    columns: [-8, -4, 4, 8],
    copy: "The Bound Warden wakes. Break its purpose, and let the court settle.",
  },
} as const;
export function roomPresentation(s: State) {
  if (!s.run) return undefined;
  return COURT_ROOMS[
    RUN_BEATS[s.trial?.encounter ?? 0]?.name as keyof typeof COURT_ROOMS
  ];
}
