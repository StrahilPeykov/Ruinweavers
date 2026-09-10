import type { Principle } from "../experiments/config";
export interface Vec {
  x: number;
  y: number;
  z: number;
}
export const vec = (x = 0, y = 0, z = 0): Vec => ({ x, y, z });
export interface AimPoint extends Vec {
  body?: boolean;
  invalid?: boolean;
}
export type Kind =
  | "player"
  | "dummy"
  | "moving"
  | "sentinel"
  | "pursuer"
  | "wood"
  | "brittle"
  | "heavy"
  | "loose";
export interface Entity {
  ai?: EnemyAI;
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
export interface EnemyAI {
  targetId?: string;
  enabled: boolean;
  phase: "idle" | "telegraph" | "recover" | "defeated";
  timer: number;
  locked: Vec;
  started: number;
}
export interface TrialState {
  status: "ready" | "active" | "between" | "victory" | "defeat";
  encounter: number;
  isolated: boolean;
  scenario: string;
  elapsed: number;
  started: number;
  results: { encounter: number; seconds: number; health: number }[];
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
  primedBy?: string;
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
  originalSource?: string;
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
  damageRoutes: Record<
    string,
    { source: string; recipient: string; reason: string; amount: number }
  >;
  outcomes: Record<string, number>;
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
export interface ActorState {
  activePrinciple: Principle;
  aim: AimPoint;
  bufferedCast?: {
    principle: Principle;
    aim: AimPoint;
    expires: number;
    device: string;
  };
  primaryReady: number;
  secondaryReady: number;
  dodgeReady: number;
  dodgeUntil: number;
  invulnerableUntil: number;
  dodgeDirection: Vec;
  castUntil: number;
  verticalSpeed: number;
  reviveProgress: number;
}
export interface State extends ActorState {
  actors: Record<string, ActorState>;
  party?: { ready: string[]; epoch: number };
  trial?: TrialState;
  terrain?: import("./lab").TerrainBox[];
  time: number;
  tick: number;
  seed: number;
  entities: Entity[];
  fields: Field[];
  bolts: Bolt[];
  pending: Pending[];
  events: MagicEvent[];
  serial: number;
  sentinel: EnemyAI;
  mechanism: boolean;
  metrics: Metrics;
}
export interface FrameInput {
  moveX: number;
  moveZ: number;
  aim: AimPoint;
  primary: boolean;
  primaryAim?: AimPoint;
  primarySelect?: Principle;
  secondary: boolean;
  dodge: boolean;
  interact: boolean;
  revive?: boolean;
  select?: Principle;
  cycle?: number;
  primaryDevice?: string;
  secondaryDevice?: string;
  triggers?: string[];
}
export const idleInput = (aim: AimPoint = vec(0, 0, -5)): FrameInput => ({
  moveX: 0,
  moveZ: 0,
  aim,
  primary: false,
  secondary: false,
  dodge: false,
  interact: false,
});
