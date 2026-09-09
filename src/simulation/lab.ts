import { actorState } from "./actors";
import { vec, type Entity, type Kind, type State } from "./types";
import type { Config } from "../experiments/config";
export interface TerrainBox {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  name?: string;
}
export const TERRAIN: TerrainBox[] = [
  { x: -3.5, y: -0.5, z: 0, w: 23, h: 1, d: 28 },
  { x: 13.5, y: -0.5, z: 0, w: 5, h: 1, d: 28 },
  { x: 9.5, y: -0.5, z: -9, w: 3, h: 1, d: 10 },
  { x: 9.5, y: -0.5, z: 9, w: 3, h: 1, d: 10 },
  { x: -10, y: 0.6, z: -10, w: 6, h: 1.2, d: 5, name: "Elevation" },
  ...[0, 1, 2, 3].map((i) => ({
    x: -10,
    y: (i + 1) * 0.15 - 0.05,
    z: -6.2 - i * 0.55,
    w: 3,
    h: (i + 1) * 0.3,
    d: 0.6,
  })),
  { x: -15.3, y: 1, z: 0, w: 0.6, h: 3, d: 28 },
  { x: 16.3, y: 1, z: 0, w: 0.6, h: 3, d: 28 },
  { x: 0.5, y: 1, z: -14.3, w: 32, h: 3, d: 0.6 },
  { x: 0.5, y: 1, z: 14.3, w: 32, h: 3, d: 0.6 },
];
export const WATER = { x: -7, z: -1.5, radius: 2.4 };
export const PAD = { x: 5.7, z: -3, radius: 1.3 };
export function entity(
  id: string,
  kind: Kind,
  label: string,
  x: number,
  z: number,
  radius = 0.6,
  height = 1.2,
  mass = 5,
): Entity {
  const anchored = ["dummy", "wood", "brittle"].includes(kind);
  const hp =
    kind === "sentinel"
      ? 180
      : kind === "player"
        ? 100
        : kind === "dummy"
          ? 1000
          : kind === "wood"
            ? 90
            : 100;
  return {
    id,
    kind,
    label,
    pos: vec(x, height / 2 + 0.05, z),
    velocity: vec(),
    rotation: { x: 0, y: 0, z: 0, w: 1 },
    radius,
    height,
    mass,
    hp,
    maxHp: hp,
    material: {
      wettable: true,
      flammable: kind === "wood",
      structural: ["brittle", "sentinel", "heavy", "loose"].includes(kind),
      anchored,
    },
    heat: 0,
    wet: 0,
    cohesion: kind === "brittle" ? 0.35 : 0,
    burning: false,
    stagger: 0,
    staggerReady: 0,
    sources: {},
    hitAt: -10,
  };
}
export function createState(config: Config): State {
  const entities = [
    entity("mage-1", "player", "You", 0, 5, 0.38, 1.4, 2),
    entity("dummy", "dummy", "Practice dummy", 0, -4.5),
    entity("sentinel", "sentinel", "Sentinel", 5, -8, 0.7, 1.6, 6),
    entity("timber", "wood", "Dry timber", -5, -5.5, 0.6, 1.6),
    entity("column", "brittle", "Brittle column", -2.7, -7, 0.65, 2),
    entity("ballast", "heavy", "Heavy ballast", 5.7, 1, 0.8, 1.6, 18),
    entity("loose-1", "loose", "Loose stone", 2.4, 1, 0.38, 0.75, 1),
    entity("loose-2", "loose", "Loose stone", 3.4, 2, 0.42, 0.84, 1.4),
    entity("moving", "moving", "Moving target", -3, -10, 0.5, 1, 2),
  ];
  const player = entities.find((e) => e.id === "mage-1")!;
  if (config.scene === "combat") player.pos = vec(4, 0.75, -1);
  if (config.scene === "traversal") player.pos = vec(6, 0.75, -1.2);
  if (config.scene === "states") player.pos = vec(-4, 0.75, 0);
  return {
    actors: { "mage-1": actorState() },
    verticalSpeed: 0,
    reviveProgress: 0,
    time: 0,
    tick: 0,
    seed: config.seed,
    entities,
    activePrinciple: "Ember",
    aim: vec(0, 0, -4.5),
    primaryReady: 0,
    secondaryReady: 0,
    dodgeReady: 0,
    dodgeUntil: 0,
    invulnerableUntil: 0,
    dodgeDirection: vec(),
    castUntil: 0,
    fields: [],
    bolts: [],
    pending: [],
    events: [],
    serial: 0,
    sentinel: {
      enabled: config.scene === "combat" || config.scene === "free",
      phase: "idle",
      timer: 1.5,
      locked: vec(),
      started: 0,
    },
    mechanism: false,
    metrics: {
      damageRoutes: {},
      outcomes: {},
      casts: {},
      inputs: {},
      switches: 0,
      dodges: 0,
      stateApplications: 0,
      transformations: {},
      damage: {},
      playerDamage: 0,
      blockedBolts: 0,
      sentinelDefeatTime: null,
      combatStartedAt: null,
      falls: 0,
    },
  };
}
