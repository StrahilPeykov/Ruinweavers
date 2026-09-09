import type { Principle } from "../experiments/config";
export interface Vec {
  x: number;
  y: number;
  z: number;
}
export const vec = (x = 0, y = 0, z = 0): Vec => ({ x, y, z });
export type Kind =
  | "player"
  | "dummy"
  | "moving"
  | "sentinel"
  | "wood"
  | "brittle"
  | "heavy"
  | "loose";
export interface Entity {
  id: string;
  kind: Kind;
  label: string;
  pos: Vec;
  velocity: Vec;
  rotation: { x: number; y: number; z: number; w: number };
  radius: number;
  height: number;
  mass: number;
  hp: number;
  maxHp: number;
  material: {
    wettable: boolean;
    flammable: boolean;
    structural: boolean;
    anchored: boolean;
  };
  heat: number;
  wet: number;
  cohesion: number;
  burning: boolean;
  stagger: number;
  staggerReady: number;
  sources: Record<string, string>;
  hitAt: number;
}
export interface Operation {
  heat?: number;
  water?: number;
  cohesion?: number;
  force?: Vec;
  damage?: number;
}
export interface MagicEvent {
  id: number;
  time: number;
  type: string;
  source: string;
  target?: string;
  principle?: Principle;
  pos: Vec;
  end?: Vec;
  value?: number;
  duration: number;
}
export interface Field {
  id: string;
  source: string;
  principle: Principle;
  pos: Vec;
  end: Vec;
  radius: number;
  life: number;
  nextPulse: number;
}
export interface Bolt {
  id: string;
  source: string;
  principle: Principle | "hostile";
  pos: Vec;
  velocity: Vec;
  life: number;
  radius: number;
}
export interface Pending {
  source: string;
  pos: Vec;
  at: number;
  principle: Principle;
}
export interface Metrics {
  casts: Record<string, number>;
  inputs: Record<string, number>;
  switches: number;
  dodges: number;
  stateApplications: number;
  transformations: Record<string, number>;
  damage: Record<string, number>;
  playerDamage: number;
  blockedBolts: number;
  sentinelDefeatTime: number | null;
  combatStartedAt: number | null;
  falls: number;
}
export interface State {
  time: number;
  tick: number;
  seed: number;
  entities: Entity[];
  activePrinciple: Principle;
  aim: Vec;
  primaryReady: number;
  secondaryReady: number;
  dodgeReady: number;
  dodgeUntil: number;
  invulnerableUntil: number;
  dodgeDirection: Vec;
  castUntil: number;
  fields: Field[];
  bolts: Bolt[];
  pending: Pending[];
  events: MagicEvent[];
  serial: number;
  sentinel: {
    enabled: boolean;
    phase: "idle" | "telegraph" | "recover" | "defeated";
    timer: number;
    locked: Vec;
    started: number;
  };
  mechanism: boolean;
  metrics: Metrics;
}
export interface FrameInput {
  moveX: number;
  moveZ: number;
  aim: Vec;
  primary: boolean;
  secondary: boolean;
  dodge: boolean;
  interact: boolean;
  select?: Principle;
  cycle?: number;
  primaryDevice?: string;
  secondaryDevice?: string;
  triggers?: string[];
}
export const idleInput = (aim = vec(0, 0, -5)): FrameInput => ({
  moveX: 0,
  moveZ: 0,
  aim,
  primary: false,
  secondary: false,
  dodge: false,
  interact: false,
});
