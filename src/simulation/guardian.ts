import { entity } from "./lab";
import { vec, type Vec, type State } from "./types";
import type { Simulation } from "./simulation";

export type Maneuver = "volley" | "march" | "furnace";
export interface GuardianState {
  core: string;
  plates: { id: string; attached: boolean; side: number }[];
  phase: 1 | 2;
  maneuver: Maneuver;
  stage: "telegraph" | "commit" | "attack" | "recover" | "shift" | "fallen";
  remaining: number;
  duration: number;
  serial: number;
  cycle: number;
  targetCursor: number;
  targetId: string;
  locked: Vec;
  origin: Vec;
  direction: Vec;
  heading: number;
  hitIds: string[];
  staggered: boolean;
}
// Guardian-only tuning. All base spells, world rules and normal enemies are unchanged.
export const WARDEN = {
  hp: 900,
  coopDurability: 1.35,
  plateHp: 140,
  mass: 32,
  plateMass: 8,
  phaseAt: 0.55,
  pulseRadius: 4.5,
  marchDistance: 8.5,
  volley: { telegraph: 1.2, commit: 0.35, attack: 0.2, recovery: 1.7 },
  march: { telegraph: 1.1, commit: 0.4, attack: 1.25, recovery: 1.8 },
  furnace: { telegraph: 1.25, commit: 0.35, attack: 0.2, recovery: 1.9 },
};
export function createGuardian(s: State) {
  const core = entity(
    "warden",
    "warden",
    "The Bound Warden",
    0,
    -5,
    1.05,
    2.8,
    WARDEN.mass,
  );
  core.hp = core.maxHp =
    WARDEN.hp * (Object.keys(s.actors).length > 1 ? WARDEN.coopDurability : 1);
  core.material.structural = true;
  core.cohesion = 0.65;
  core.ai = {
    enabled: true,
    phase: "idle",
    timer: 0,
    locked: vec(0, 0.75, 6),
    started: s.time,
  };
  s.entities.push(core);
  const plates = [-1, 1].map((side) => {
    const p = entity(
      `warden-plate-${side < 0 ? "left" : "right"}`,
      "wardplate",
      "Fitted ward plate",
      side * 1.65,
      -4.8,
      0.52,
      1.9,
      WARDEN.plateMass,
    );
    p.hp = p.maxHp = WARDEN.plateHp;
    p.cohesion = 0.8;
    p.material.structural = true;
    s.entities.push(p);
    return { id: p.id, side, attached: true };
  });
  s.guardian = {
    core: core.id,
    plates,
    phase: 1,
    maneuver: "volley",
    stage: "recover",
    remaining: 1.2,
    duration: 1.2,
    serial: 0,
    cycle: 0,
    targetCursor: 0,
    targetId: "",
    locked: vec(0, 0.75, 6),
    origin: { ...core.pos },
    direction: vec(0, 0, 1),
    heading: 0,
    hitIds: [],
    staggered: false,
  };
}
const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.z - b.z);
const direction = (a: Vec, b: Vec) => {
  const d = dist(a, b) || 1;
  return vec((b.x - a.x) / d, 0, (b.z - a.z) / d);
};
export function tickGuardian(sim: Simulation, dt: number) {
  const s = sim.state,
    g = s.guardian;
  if (!g) return;
  const core = s.entities.find((e) => e.id === g.core)!;
  const enter = (stage: GuardianState["stage"], duration: number) => {
    g.stage = stage;
    g.remaining = g.duration = duration;
    g.serial++;
    core.ai!.phase =
      stage === "fallen"
        ? "defeated"
        : ["telegraph", "commit"].includes(stage)
          ? "telegraph"
          : "recover";
  };
  for (const part of g.plates) {
    const e = s.entities.find((e) => e.id === part.id)!;
    if (part.attached && (e.hp <= 0 || e.cohesion <= 0 || core.hp <= 0)) {
      part.attached = false;
      sim.event(
        "warden-unbind",
        (e.hp <= 0 ? e.sources.damage : e.sources.cohesion) || g.core,
        e.pos,
        {
          target: e.id,
          duration: 0.8,
        },
      );
      sim.outcome(`warden:plate:detached:${e.id}`);
    }
  }
  sim.physics.syncGuardian(s);
  if (core.hp <= 0) {
    if (g.stage !== "fallen") {
      enter("fallen", 0);
      sim.event("warden-fall", g.core, core.pos, { duration: 1.4 });
    }
    return;
  }
  if (!core.ai!.enabled) return;
  if (
    g.phase === 1 &&
    core.hp <= core.maxHp * WARDEN.phaseAt &&
    g.stage === "recover"
  ) {
    g.phase = 2;
    const plate = g.plates.find((p) => p.attached);
    if (plate)
      sim.apply(
        s.entities.find((e) => e.id === plate.id)!,
        { cohesion: -2 },
        g.core,
        "strained binding",
      );
    enter("shift", 0.9);
    sim.outcome("warden:phase:2");
    sim.event("warden-shift", g.core, core.pos, { duration: 0.9 });
  }
  if (core.stagger > 0) {
    if (!g.staggered) sim.outcome(`warden:${g.maneuver}:interrupted`);
    g.staggered = true;
    return; // Existing stagger gate buys time; never resets the attack chain.
  }
  g.staggered = false;
  const living = sim.players
    .filter((p) => p.hp > 0)
    .sort((a, b) => a.id.localeCompare(b.id));
  if (!living.length) return;
  let target = living.find((p) => p.id === g.targetId);
  if (g.stage === "telegraph" && !target) {
    target = living[g.targetCursor++ % living.length];
    g.targetId = target.id;
    sim.outcome(`warden:retarget:${target.id}`);
  }
  if (g.stage === "telegraph" && target) {
    g.locked = { ...target.pos };
    g.origin = { ...core.pos };
    g.direction = direction(core.pos, g.locked);
    g.heading = Math.atan2(g.direction.x, g.direction.z);
    core.ai!.locked = { ...g.locked };
    sim.physics.bodies
      .get(core.id)
      ?.setRotation(
        { x: 0, y: Math.sin(g.heading / 2), z: 0, w: Math.cos(g.heading / 2) },
        true,
      );
  }
  if (g.stage === "attack" && g.maneuver === "march") {
    const speed = g.phase === 1 ? 7 : 8;
    // Drive the existing dynamic body. Cover, mass, impulse and footing remain physical.
    if (core.pos.y - core.height / 2 < 0.3)
      sim.physics.impulse(
        core.id,
        vec(
          (g.direction.x * speed - core.velocity.x) * core.mass * dt * 7,
          0,
          (g.direction.z * speed - core.velocity.z) * core.mass * dt * 7,
        ),
      );
    for (const p of living)
      if (
        !g.hitIds.includes(p.id) &&
        dist(p.pos, core.pos) < core.radius + p.radius + 0.25 &&
        Math.abs(p.pos.y - core.pos.y) < 2 &&
        !sim.physics.terrainHit(
          vec(core.pos.x, 0.6, core.pos.z),
          vec(p.pos.x, 0.6, p.pos.z),
        )
      ) {
        g.hitIds.push(p.id);
        sim.damage(p, 18, core.id, "bound march");
        sim.outcome(`warden:march:contact:${p.id}`);
      }
    if (dist(core.pos, g.origin) >= WARDEN.marchDistance) g.remaining = 0;
    sim.outcome(
      "warden:march:travel",
      Math.hypot(core.velocity.x, core.velocity.z) * dt,
    );
  }
  g.remaining -= dt;
  if (g.remaining > 0) return;
  if (g.stage === "recover" || g.stage === "shift") {
    const pattern: Maneuver[] =
      g.phase === 1
        ? ["volley", "march", "furnace"]
        : ["volley", "march", "furnace", "march"];
    g.maneuver = pattern[g.cycle++ % pattern.length];
    const chosen = living[g.targetCursor++ % living.length];
    g.targetId = chosen.id;
    g.origin = { ...core.pos };
    g.locked = { ...chosen.pos };
    g.direction = direction(core.pos, g.locked);
    g.hitIds = [];
    enter("telegraph", WARDEN[g.maneuver].telegraph);
    sim.outcome(`warden:target:${chosen.id}`);
    sim.event("warden-windup", core.id, core.pos, {
      target: g.maneuver,
      duration: g.duration,
    });
  } else if (g.stage === "telegraph") {
    // This is the authoritative lock. A downed/moving target does not bend this route.
    g.direction = direction(core.pos, g.locked);
    g.origin = { ...core.pos };
    if (g.maneuver === "march")
      g.locked = vec(
        core.pos.x + g.direction.x * WARDEN.marchDistance,
        0.1,
        core.pos.z + g.direction.z * WARDEN.marchDistance,
      );
    core.ai!.locked = { ...g.locked };
    enter("commit", WARDEN[g.maneuver].commit);
    sim.outcome(`warden:${g.maneuver}:commit`);
  } else if (g.stage === "commit") {
    enter("attack", WARDEN[g.maneuver].attack);
    sim.outcome(`warden:${g.maneuver}:attack`);
    sim.event(`warden-${g.maneuver}`, core.id, core.pos, {
      end: { ...g.locked },
      duration: 0.5,
    });
    if (g.maneuver === "volley") {
      const heading = Math.atan2(g.direction.x, g.direction.z);
      for (const angle of [-0.27, 0, 0.27]) {
        const d = vec(Math.sin(heading + angle), 0, Math.cos(heading + angle));
        s.bolts.push({
          id: `warden-shard-${++s.serial}`,
          source: core.id,
          originalSource: core.id,
          principle: "hostile",
          pos: vec(core.pos.x + d.x * 1.6, 0.65, core.pos.z + d.z * 1.6),
          velocity: vec(d.x * 8, 0, d.z * 8),
          life: 3,
          radius: 0.32,
        });
      }
    } else if (g.maneuver === "furnace") {
      const bodies = s.entities.filter(
        (e) =>
          e.hp > 0 && e.id !== core.id && !g.plates.some((p) => p.id === e.id),
      );
      for (const e of bodies)
        if (
          dist(core.pos, e.pos) < WARDEN.pulseRadius + e.radius &&
          Math.abs(e.pos.y - core.pos.y) < 3 &&
          !sim.physics.terrainHit(
            vec(core.pos.x, 0.5, core.pos.z),
            vec(e.pos.x, 0.5, e.pos.z),
          )
        ) {
          sim.apply(e, { heat: 65, damage: 12 }, core.id, "furnace pulse");
          sim.outcome(`warden:furnace:contact:${e.id}`);
        }
      for (const e of [
        core,
        ...g.plates
          .filter((p) => p.attached)
          .map((p) => s.entities.find((e) => e.id === p.id)!),
      ])
        sim.apply(e, { heat: 85 }, core.id, "furnace stress");
    }
  } else if (g.stage === "attack") {
    if (!g.hitIds.length && g.maneuver === "march")
      sim.outcome("warden:march:avoided");
    enter("recover", WARDEN[g.maneuver].recovery * (g.phase === 2 ? 0.85 : 1));
  }
}
