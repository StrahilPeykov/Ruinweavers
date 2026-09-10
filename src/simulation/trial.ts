import { RUN_BEATS } from "./run";
import { entity, type TerrainBox } from "./lab";
import { vec, type State } from "./types";
import type { Config } from "../experiments/config";

export const ENCOUNTERS = [
  "Ranged pressure",
  "Pursuit pressure",
  "Mixed pressure",
];
// Fixed, transparent scenario variations; no generated level system.
export const SCENARIOS = {
  "open-near": {
    split: "development",
    distance: 0.7,
    spread: 0.8,
    angle: 0,
    cover: 0,
    startX: 0,
  },
  "split-far": {
    split: "development",
    distance: 1,
    spread: 1.35,
    angle: 0,
    cover: 0,
    startX: -2,
  },
  "cross-cover": {
    split: "development",
    distance: 1,
    spread: 1,
    angle: 0,
    cover: 1,
    startX: 0,
  },
  "side-cover": {
    split: "development",
    distance: 0.85,
    spread: 1.1,
    angle: Math.PI / 2,
    cover: 2,
    startX: 1,
  },
  "held-diagonal": {
    split: "held-out",
    distance: 0.8,
    spread: 1.2,
    angle: Math.PI / 4,
    cover: 1,
    startX: -1.5,
  },
  "held-offset": {
    split: "held-out",
    distance: 1.1,
    spread: 0.85,
    angle: -Math.PI / 3,
    cover: 2,
    startX: 2,
  },
} as const;
export type ScenarioName = keyof typeof SCENARIOS;
export const TRIAL_TUNING = {
  baseline: {
    pursuitSpeed: 4.8,
    windupAdvance: 0,
    meleeWindup: 0.65,
    meleeLock: 0.3,
    meleeRadius: 1.45,
    meleeRecovery: 1.1,
    rangedRecovery: 1.1,
    rangedLock: 0.45,
  },
  candidate: {
    pursuitSpeed: 6,
    windupAdvance: 0.7,
    meleeWindup: 0.65,
    meleeLock: 0.3,
    meleeRadius: 1.45,
    meleeRecovery: 1.1,
    rangedRecovery: 1.1,
    rangedLock: 0.45,
  },
};
export function arenaTerrain(name: string): TerrainBox[] {
  const scenario = SCENARIOS[name as ScenarioName] ?? SCENARIOS["cross-cover"];
  const floor: TerrainBox[] = [
    { x: 0, y: -0.5, z: 0, w: 24, h: 1, d: 22 },
    { x: -12.3, y: 0.8, z: 0, w: 0.6, h: 2.6, d: 22 },
    { x: 12.3, y: 0.8, z: 0, w: 0.6, h: 2.6, d: 22 },
    { x: 0, y: 0.8, z: -11.3, w: 24, h: 2.6, d: 0.6 },
    { x: 0, y: 0.8, z: 11.3, w: 24, h: 2.6, d: 0.6 },
  ];
  if (scenario.cover)
    floor.push(
      {
        x: scenario.cover === 1 ? -3 : -4,
        y: 0.85,
        z: 0,
        w: 1.8,
        h: 1.7,
        d: 2.2,
        name: "Cover",
      },
      {
        x: scenario.cover === 1 ? 3 : 4,
        y: 0.85,
        z: scenario.cover === 1 ? -1 : 2,
        w: 1.8,
        h: 1.7,
        d: 2.2,
        name: "Cover",
      },
    );
  return floor;
}
export function prepareEncounter(s: State, config: Config) {
  if (s.run) s.trial!.scenario = RUN_BEATS[s.trial!.encounter].scenario;
  const trial = s.trial!,
    layout =
      SCENARIOS[trial.scenario as ScenarioName] ?? SCENARIOS["cross-cover"],
    player = s.entities.find((e) => e.id === "mage-1")!;
  const players = s.entities.filter((e) => !!s.actors[e.id]);
  player.pos = vec(layout.startX, 0.75, 6);
  player.velocity = vec();
  player.heat = 0;
  player.wet = 0;
  player.stagger = 0;
  for (const [i, p] of players.entries()) {
    p.pos = vec(
      layout.startX + (players.length === 2 ? (i ? 1.2 : -1.2) : 0),
      0.75,
      6,
    );
    p.velocity = vec();
    p.heat = 0;
    p.wet = 0;
    p.stagger = 0;
    const a = s.actors[p.id];
    a.bufferedCast = undefined;
    a.verticalSpeed = 0;
    a.reviveProgress = 0;
    a.primaryReady =
      a.secondaryReady =
      a.dodgeReady =
      a.dodgeUntil =
      a.invulnerableUntil =
      a.castUntil =
        s.time;
  }
  s.entities = [
    ...players,
    entity("timber", "wood", "Dry timber", -7, 1, 0.6, 1.6),
    entity("ballast", "heavy", "Heavy ballast", 7, 1, 0.8, 1.6, 18),
    entity("loose-1", "loose", "Loose stone", -1, 3, 0.38, 0.75, 1),
  ];
  const lineup = s.run
    ? RUN_BEATS[trial.encounter].enemies
    : trial.encounter === 0
      ? [
          ["sentinel", -5, -5],
          ["sentinel", 5, -6],
        ]
      : trial.encounter === 1
        ? [
            ["pursuer", -6, -5],
            ["pursuer", 6, -5],
            ["pursuer", 0, -8],
          ]
        : [
            ["sentinel", -6, -6],
            ["sentinel", 6, -6],
            ["pursuer", -5, 2],
            ["pursuer", 5, 3],
          ];
  lineup.forEach(([kind, x, z], i) => {
    const a = layout.angle,
      px = Number(x) * layout.spread,
      pz = Number(z) * layout.distance;
    const pos = vec(
      px * Math.cos(a) - pz * Math.sin(a),
      0,
      px * Math.sin(a) + pz * Math.cos(a),
    );
    const melee = kind === "pursuer";
    const e = entity(
      `encounter-${trial.encounter}-${kind}-${i}`,
      melee ? "pursuer" : "sentinel",
      melee ? "Pursuer" : "Sentinel",
      Math.max(-10, Math.min(10, pos.x)),
      Math.max(-9, Math.min(8, pos.z)),
      melee ? 0.5 : 0.7,
      melee ? 1.1 : 1.6,
      melee ? 4 : 6,
    );
    e.hp = e.maxHp = melee ? 90 : 180;
    e.material.structural = true;
    e.ai = {
      enabled: true,
      phase: "idle",
      timer: 0.6 + i * 0.38,
      locked: { ...player.pos },
      started: s.time,
    };
    s.entities.push(e);
  });
  s.terrain = arenaTerrain(trial.scenario);
  s.fields = [];
  s.bolts = [];
  s.pending = [];
  s.events = [];
  s.bufferedCast = undefined;
  s.primaryReady =
    s.secondaryReady =
    s.dodgeReady =
    s.dodgeUntil =
    s.invulnerableUntil =
    s.castUntil =
      s.time;
  trial.started = s.time;
}
export function initializeTrial(s: State, config: Config) {
  const encounter = ["trial/ranged", "trial/pursuit", "trial/mixed"].indexOf(
    config.scene,
  );
  s.trial = {
    status: "ready",
    encounter: Math.max(0, encounter),
    isolated: encounter >= 0,
    scenario: config.scenario,
    elapsed: 0,
    started: 0,
    results: [],
  };
  prepareEncounter(s, config);
}
