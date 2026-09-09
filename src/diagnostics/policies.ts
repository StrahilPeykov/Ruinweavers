import { type Principle, PRINCIPLES } from "../experiments/config";
import { Simulation, distance } from "../simulation/simulation";
import {
  idleInput,
  vec,
  type Entity,
  type FrameInput,
  type State,
} from "../simulation/types";

export const POLICY_VERSION = "policies-1";
export const POLICY_NAMES = [
  "attack-move",
  "basin-ember",
  "control-cover",
  "state-aware",
] as const;
export type PolicyName = (typeof POLICY_NAMES)[number];
export type ObservationMode = "exact-state" | "delayed-aim";
// No AI timers/locked future targets, RNG state, or future simulation steps are exposed.
type Visible = {
  time: number;
  player: Entity;
  enemies: Entity[];
  allies: Entity[];
  fields: State["fields"];
  bolts: State["bolts"];
};
const snapshot = (s: State, actorId: string): Visible => ({
  time: s.time,
  player: structuredClone(s.entities.find((e) => e.id === actorId)!),
  allies: structuredClone(
    s.entities.filter((e) => !!s.actors[e.id] && e.id !== actorId),
  ),
  enemies: s.entities
    .filter((e) => e.ai && e.hp > 0)
    .map((e) => ({
      ...structuredClone(e),
      ai: e.ai ? { ...e.ai, timer: 0, started: 0, locked: vec() } : undefined,
    })),
  fields: structuredClone(s.fields),
  bolts: structuredClone(s.bolts),
});
const unit = (x: number, z: number) => {
  const d = Math.hypot(x, z) || 1;
  return vec(x / d, 0, z / d);
};

export class ScriptedPolicy {
  history: Visible[] = [];
  current: FrameInput = idleInput();
  nextDecision = 0;
  nextSecondary = 0;
  lastTarget = "";
  decisions = 0;
  constructor(
    public name: PolicyName,
    public mode: ObservationMode,
    public seed = 123,
    public excluded?: Principle,
    public motor: "continuous" | "keyboard" = "continuous",
    public role: "independent" | "primer" | "striker" = "independent",
  ) {}
  input(sim: Simulation): FrameInput {
    const s = sim.state;
    if (s.trial && s.trial.status !== "active")
      return { ...idleInput(), interact: true };
    this.history.push(snapshot(s, sim.actorId));
    if (this.history.length > 24) this.history.shift();
    // Identical 10 Hz decisions and motor execution for every policy/profile.
    if (s.time + 1e-6 >= this.nextDecision) {
      this.nextDecision = s.time + 0.1;
      this.decisions++;
      const delay = this.mode === "delayed-aim" ? 0.2 : 0;
      const observed =
        [...this.history].reverse().find((o) => o.time <= s.time - delay) ??
        this.history[0];
      this.current = this.decide(observed, sim);
    } else this.current = { ...this.current, secondary: false, dodge: false };
    return this.current;
  }
  decide(o: Visible, sim: Simulation): FrameInput {
    const p = o.player;
    const available = PRINCIPLES.filter((p) => p !== this.excluded);
    const has = (p: Principle) => available.includes(p);
    const fallback: Principle = has("Ember")
      ? "Ember"
      : has("Stone")
        ? "Stone"
        : has("Tide")
          ? "Tide"
          : "Gale";
    const sorted = [...o.enemies].sort(
      (a, b) => distance(a.pos, p.pos) - distance(b.pos, p.pos),
    );
    let target = sorted[0];
    if (!target) return idleInput();
    if (this.name === "state-aware")
      target =
        sorted.find((e) => e.wet > 0.2 && distance(e.pos, p.pos) < 10) ??
        target;
    if (this.role !== "independent" && o.allies.length) {
      const center = vec(
        (p.pos.x + o.allies[0].pos.x) / 2,
        0,
        (p.pos.z + o.allies[0].pos.z) / 2,
      );
      target = [...o.enemies].sort(
        (a, b) => distance(a.pos, center) - distance(b.pos, center),
      )[0];
    }
    this.lastTarget = target.id;
    const d = distance(target.pos, p.pos),
      toward = unit(target.pos.x - p.pos.x, target.pos.z - p.pos.z);
    const noise =
      this.mode === "delayed-aim"
        ? 0.6 * Math.sin(this.decisions * 2.17 + this.seed * 0.13)
        : 0;
    const aim = vec(
      target.pos.x + toward.z * noise,
      Math.max(0, target.pos.y - target.height / 2),
      target.pos.z - toward.x * noise,
    );
    const f = idleInput(aim);
    f.primary = true;
    f.select = fallback;
    const melee = sorted.find(
      (e) => e.kind === "pursuer" && distance(e.pos, p.pos) < 5,
    );
    const projectile = o.bolts.find(
      (b) =>
        b.source !== p.id &&
        distance(b.pos, p.pos) < 4 &&
        (p.pos.x - b.pos.x) * b.velocity.x +
          (p.pos.z - b.pos.z) * b.velocity.z >
          0,
    );
    // Shared visible-danger reaction, never the AI's exact remaining attack time.
    f.dodge =
      !!projectile ||
      sorted.some(
        (e) =>
          e.ai?.phase === "telegraph" &&
          e.kind === "pursuer" &&
          distance(e.pos, p.pos) < 2.5,
      );
    const field = o.fields.find((f) => f.source === p.id);
    const secondary = (principle: Principle, pos = aim) => {
      if (has(principle) && o.time >= this.nextSecondary) {
        f.select = principle;
        f.primary = false;
        f.secondary = true;
        f.aim = pos;
        this.nextSecondary = o.time + 0.75;
        return true;
      }
      return false;
    };
    if (this.name === "basin-ember") {
      if (
        has("Tide") &&
        (!field ||
          field.principle !== "Tide" ||
          distance(field.pos, target.pos) > 2.4 ||
          field.life < 1)
      )
        secondary("Tide");
    } else if (this.name === "control-cover") {
      if (has("Gale") && (melee || projectile) && d < 6) f.select = "Gale";
      if (!field || field.life < 1) {
        if (sorted.some((e) => e.kind === "sentinel") && has("Stone"))
          secondary(
            "Stone",
            vec(p.pos.x + toward.x * 2.5, 0, p.pos.z + toward.z * 2.5),
          );
        else if (melee && has("Gale"))
          secondary("Gale", vec(p.pos.x, 0, p.pos.z));
      }
    } else if (this.name === "state-aware") {
      if (melee && d < 3.8 && has("Gale")) f.select = "Gale";
      else if (target.wet > 0.18 && has("Ember")) f.select = "Ember";
      else if (target.cohesion < -0.25 && d < 6 && has("Gale"))
        f.select = "Gale";
      else if (
        has("Stone") &&
        sorted.filter((e) => distance(e.pos, target.pos) < 1.8).length > 1
      )
        f.select = "Stone";
      else if (has("Tide") && target.wet < 0.2 && has("Ember"))
        f.select = "Tide";
      if (
        has("Tide") &&
        (!field || field.life < 1 || distance(field.pos, target.pos) > 3.5)
      )
        secondary("Tide");
      else if (
        !has("Tide") &&
        has("Gale") &&
        melee &&
        (!field || field.life < 1)
      )
        secondary("Gale", vec(p.pos.x, 0, p.pos.z));
    }
    if (this.role === "primer" && !f.secondary)
      f.select = target.wet > 0.2 ? "Stone" : "Tide";
    if (this.role === "striker") {
      f.secondary = false;
      f.primary = true;
      f.select = "Ember";
    }
    // Shared movement: keep range, strafe and repel close pursuers. Never teleport.
    const desired = f.select === "Gale" ? 4.4 : 6;
    const radial = d > desired + 1 ? 1 : d < desired - 1 ? -1 : 0;
    let mx = toward.x * radial + toward.z * 0.8,
      mz = toward.z * radial - toward.x * 0.8;
    for (const e of sorted.filter((e) => e.kind === "pursuer")) {
      const away = unit(p.pos.x - e.pos.x, p.pos.z - e.pos.z),
        near = Math.max(0, (4 - distance(p.pos, e.pos)) / 3);
      mx += away.x * near;
      mz += away.z * near;
    }
    if (Math.abs(p.pos.x) > 9) mx -= Math.sign(p.pos.x) * 2;
    if (Math.abs(p.pos.z) > 8) mz -= Math.sign(p.pos.z) * 2;
    // Same reactive collision probes for all policies; only motor clearance, no enemy information.
    const heading = Math.atan2(mx, mz),
      actual = sim.player.pos;
    let chosen = vec();
    const turns =
      this.motor === "keyboard"
        ? Array.from({ length: 8 }, (_, i) => (i * Math.PI) / 4 - heading).sort(
            (a, b) => Math.cos(b) - Math.cos(a),
          )
        : [0, 0.6, -0.6, 1.2, -1.2, 1.8, -1.8, Math.PI];
    for (const turn of turns) {
      const v = vec(Math.sin(heading + turn), 0, Math.cos(heading + turn));
      const start = vec(actual.x, actual.y - 0.5, actual.z),
        end = vec(start.x + v.x * 1.3, start.y, start.z + v.z * 1.3);
      if (!sim.physics.terrainHit(start, end)) {
        chosen = v;
        break;
      }
    }
    f.moveX = this.motor === "keyboard" ? Math.round(chosen.x) : chosen.x;
    f.moveZ = this.motor === "keyboard" ? Math.round(chosen.z) : chosen.z;
    return f;
  }
}
