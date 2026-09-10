import {
  initializeRun,
  offerRewards,
  chooseUpgrade,
  rewardsChosen,
  hasUpgrade,
  fieldCapacity,
  RUN_BEATS,
} from "./run";
import { actorState, legacyActorAccessors } from "./actors";
import { entity } from "./lab";
import {
  CAST,
  PRINCIPLES,
  type Config,
  type Principle,
} from "../experiments/config";
import { initializeTrial, prepareEncounter, TRIAL_TUNING } from "./trial";
import { Physics } from "../physics/world";
import { createState, PAD, WATER } from "./lab";
import {
  vec,
  idleInput,
  type AimPoint,
  type Entity,
  type FrameInput,
  type MagicEvent,
  type Operation,
  type State,
  type Vec,
} from "./types";
export const distance = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.z - b.z);
const normalize = (v: Vec) => {
  const d = Math.hypot(v.x, v.z) || 1;
  return vec(v.x / d, 0, v.z / d);
};
const inc = (r: Record<string, number>, key: string, n = 1) =>
  (r[key] = (r[key] || 0) + n);
export function segmentDistance(p: Vec, a: Vec, b: Vec) {
  const dx = b.x - a.x,
    dz = b.z - a.z;
  const t = Math.max(
    0,
    Math.min(
      1,
      ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz || 1),
    ),
  );
  return Math.hypot(p.x - a.x - t * dx, p.z - a.z - t * dz);
}
export class Simulation {
  state: State;
  actorId = "mage-1";
  replica = false;
  runGeneration = 0;
  acceptSnapshot(snapshot: State) {
    const rebuild =
      !this.replica ||
      JSON.stringify(this.state.terrain) !== JSON.stringify(snapshot.terrain);
    this.state = legacyActorAccessors(snapshot);
    this.replica = true;
    if (rebuild) {
      this.physics.dispose();
      this.physics = new Physics(this.state, true);
    }
    this.physics.updateSnapshot(this.state);
  }
  withActor<T>(id: string, work: () => T): T {
    if (!this.state.actors[id]) throw Error("Unknown actor");
    const previous = this.actorId;
    this.actorId = id;
    try {
      return work();
    } finally {
      this.actorId = previous;
    }
  }
  get actor() {
    return this.state.actors[this.actorId];
  }
  get players() {
    return this.state.entities.filter((e) => !!this.state.actors[e.id]);
  }
  physics: Physics;
  constructor(public config: Config) {
    this.state = legacyActorAccessors(createState(config));
    if (config.scene === "run") initializeRun(this.state, ++this.runGeneration);
    if (config.scene.startsWith("trial") || config.scene === "run")
      initializeTrial(this.state, config);
    this.physics = new Physics(this.state);
  }
  get player() {
    return this.state.entities.find((e) => e.id === this.actorId)!;
  }
  stagger(e: Entity, duration: number) {
    if (this.state.time >= e.staggerReady) {
      this.outcome(`stagger:${e.id}`);
      e.stagger = Math.min(0.4, duration);
      e.staggerReady = this.state.time + 1.4;
    }
  }
  reset() {
    this.replica = false;
    this.physics.dispose();
    const ids = Object.keys(this.state.actors),
      epoch = (this.state.party?.epoch ?? 0) + 1;
    this.state = legacyActorAccessors(createState(this.config));
    if (ids.length === 2) {
      this.state.actors["mage-2"] = actorState();
      this.state.entities.push(
        entity("mage-2", "player", "Partner", 2, 6, 0.38, 1.4, 2),
      );
      this.state.party = { ready: [], epoch };
    }
    if (this.config.scene === "run")
      initializeRun(this.state, ++this.runGeneration);
    if (this.config.scene.startsWith("trial") || this.config.scene === "run")
      initializeTrial(this.state, this.config);
    this.physics = new Physics(this.state);
  }
  addPartner() {
    if (
      !this.state.trial ||
      this.state.trial.status !== "ready" ||
      this.players.length !== 1
    )
      throw Error("Join before starting a trial");
    this.state.actors["mage-2"] = actorState();
    this.state.entities.push(
      entity("mage-2", "player", "Partner", 2, 6, 0.38, 1.4, 2),
    );
    this.state.party = { ready: [], epoch: 1 };
    if (this.state.run) this.state.run.upgrades["mage-2"] = [];
    prepareEncounter(this.state, this.config);
    this.physics.dispose();
    this.physics = new Physics(this.state);
  }
  ready(id: string) {
    const s = this.state;
    if (!s.actors[id] || s.trial?.status === "active") return;
    if (s.run?.reward && !s.run.reward.choices[id]) return;
    if (!s.party) {
      this.advanceTrial();
      return;
    }
    if (!s.party.ready.includes(id)) s.party.ready.push(id);
    if (Object.keys(s.actors).every((id) => s.party!.ready.includes(id))) {
      this.advanceTrial();
      if (this.state.party) {
        this.state.party.ready = [];
        this.state.party.epoch++;
      }
    }
  }
  revive(id: string, source: string) {
    const p = this.players.find((p) => p.id === id);
    if (!p || p.hp > 0) return;
    p.hp = 35;
    p.heat = 0;
    p.wet = 0;
    p.stagger = 0;
    Object.assign(this.state.actors[id], {
      bufferedCast: undefined,
      verticalSpeed: 0,
      invulnerableUntil: this.state.time + 1,
    });
    if (!this.physics.bodies.has(id)) this.physics.add(p);
    this.event("revive", source, p.pos, { target: id, duration: 1 });
    this.outcome(`revive:${source}:${id}`);
  }
  chooseUpgrade(
    actor: string,
    runId: string,
    rewardId: string,
    upgrade: string,
  ) {
    return chooseUpgrade(this.state, actor, runId, rewardId, upgrade);
  }
  advanceTrial() {
    const s = this.state,
      t = s.trial;
    if (!t) return;
    if (t.status === "victory" || t.status === "defeat") {
      this.reset();
      this.state.trial!.status = "active";
      return;
    }
    if (t.status === "between") {
      if (!rewardsChosen(s)) return;
      if (s.run) s.run.reward = undefined;
      t.encounter++;
      prepareEncounter(s, this.config);
      this.physics.dispose();
      this.physics = new Physics(s);
    }
    if (t.status === "ready" || t.status === "between") {
      t.status = "active";
      t.started = s.time;
      this.cancelBufferedCast();
    }
  }
  outcome(key: string, n = 1) {
    inc(this.state.metrics.outcomes, key, n);
  }
  event(
    type: string,
    source: string,
    pos: Vec,
    extra: Partial<MagicEvent> = {},
  ) {
    const s = this.state;
    const e = {
      id: ++s.serial,
      time: s.time,
      type,
      source,
      pos: { ...pos },
      duration: 0.45,
      ...extra,
    };
    s.events.push(e);
    return e;
  }
  damage(e: Entity, n: number, source: string, reason: string) {
    if (e.hp <= 0 || n <= 0) return;
    if (
      this.state.party &&
      e.kind === "player" &&
      this.state.actors[source] &&
      source !== e.id
    ) {
      this.outcome(`allied-damage-suppressed:${source}:${e.id}`);
      return;
    }
    if (
      e.kind === "player" &&
      this.state.time < this.state.actors[e.id].invulnerableUntil
    ) {
      this.outcome(`invulnerable-contact:${source}`);
      return;
    }
    if (this.state.metrics.combatStartedAt === null && e.kind === "sentinel")
      this.state.metrics.combatStartedAt = this.state.time;
    const actual = Math.min(e.hp, n);
    e.hp -= actual;
    if (n >= 1) e.hitAt = this.state.time;
    e.sources.damage = source;
    inc(this.state.metrics.damage, `${source}:${reason}`, actual);
    const route = JSON.stringify([source, e.id, reason]);
    const record = (this.state.metrics.damageRoutes[route] ??= {
      source,
      recipient: e.id,
      reason,
      amount: 0,
    });
    record.amount += actual;
    if (e.kind === "player") {
      this.state.metrics.playerDamage += actual;
      if (e.hp <= 0) this.state.actors[e.id].bufferedCast = undefined;
    }
    if (e.hp <= 0) {
      this.event("shatter", source, e.pos, { target: e.id, duration: 0.8 });
      if (e.ai) e.ai.phase = "defeated";
      if (e.id === "sentinel") {
        this.state.sentinel.phase = "defeated";
        this.state.metrics.sentinelDefeatTime =
          this.state.time -
          (this.state.metrics.combatStartedAt ?? this.state.time);
      }
    }
  }
  apply(e: Entity, op: Operation, source: string, reason: string) {
    if (e.hp <= 0) return;
    const s = this.state;
    const priorWetSource = e.sources.wet,
      priorHeatSource = e.sources.heat;
    const oldHeat = e.heat,
      oldWet = e.wet,
      oldCohesion = e.cohesion;
    if (op.water && e.material.wettable) {
      e.wet = Math.max(0, Math.min(1, e.wet + op.water));
      e.sources.wet = source;
    }
    if (op.heat) {
      e.heat = Math.max(0, Math.min(150, e.heat + op.heat));
      e.sources.heat = source;
    }
    if (op.cohesion && e.material.structural) {
      e.cohesion = Math.max(-1, Math.min(1, e.cohesion + op.cohesion));
      e.sources.cohesion = source;
    }
    // Shared heat/water rule: no Principle-pair table. Every wettable entity uses this.
    if (e.wet > 0.16 && e.heat >= 45) {
      const consumed = Math.min(e.wet, e.heat / 100, 0.65);
      e.wet -= consumed;
      e.heat = Math.max(0, e.heat - consumed * 100);
      this.stagger(e, 0.4);
      inc(s.metrics.transformations, "vaporize");
      const primedBy = op.heat ? priorWetSource : priorHeatSource;
      if (s.actors[primedBy] && s.actors[source] && primedBy !== source)
        this.outcome(`cross-reaction:${primedBy}:${source}:${e.id}`);
      this.event("steam", source, e.pos, {
        primedBy,
        target: e.id,
        value: consumed,
        duration: 1.2,
      });
      this.damage(e, consumed * 28, source, "steam");
      if (e.material.structural && (oldHeat >= 35 || oldWet > 0.16)) {
        e.cohesion = Math.max(-1, e.cohesion - 0.5);
        e.sources.cohesion = source;
        inc(s.metrics.transformations, "thermal fracture");
      }
    }
    if (op.force) {
      const resistance = 1 + Math.max(0, e.cohesion) * 5;
      const f = {
        x: op.force.x / resistance,
        y: op.force.y / resistance,
        z: op.force.z / resistance,
      };
      this.physics.impulse(e.id, f);
      e.sources.force = source;
      if (!e.material.anchored && Math.hypot(f.x, f.z) / e.mass > 1) {
        this.stagger(e, 0.25);
        this.event("force", source, e.pos, { target: e.id, duration: 0.3 });
      }
      if (e.material.structural && e.cohesion < -0.25) {
        this.damage(e, Math.hypot(f.x, f.z) * 0.9, source, "fracture impulse");
        e.cohesion = 0;
        inc(s.metrics.transformations, "shatter impulse");
        this.event("shatter", source, e.pos);
      }
    }
    if (op.damage) this.damage(e, op.damage, source, reason);
    e.burning = e.material.flammable && e.heat > 65 && e.wet < 0.15;
    if (oldWet <= 0.1 && e.wet > 0.1)
      this.event("wet", source, e.pos, {
        principle: "Tide",
        target: e.id,
        duration: 0.4,
      });
    if (
      (oldCohesion < 0.25 && e.cohesion >= 0.25) ||
      (oldCohesion > -0.25 && e.cohesion <= -0.25)
    )
      this.event("structure", source, e.pos, {
        principle: "Stone",
        target: e.id,
        duration: 0.5,
      });
    s.metrics.stateApplications++;
  }
  nearby(pos: Vec, r: number, source = "mage-1") {
    return this.state.entities.filter(
      (e) =>
        e.id !== source &&
        e.hp > 0 &&
        distance(e.pos, pos) < r + e.radius &&
        Math.abs(e.pos.y - pos.y) < 3,
    );
  }
  targeting(
    action: "primary" | "secondary",
    principle = this.actor.activePrinciple,
    aim = this.actor.aim,
  ) {
    const p = this.player.pos,
      range = CAST[principle].range;
    const d = distance(p, aim),
      ratio = Math.min(1, range / (d || 1));
    const ground = action === "secondary" || principle === "Stone";
    const point = vec(
      p.x + (aim.x - p.x) * ratio,
      aim.y,
      p.z + (aim.z - p.z) * ratio,
    );
    if (!ground) {
      point.y = p.y + (aim.y + (aim.body ? 0 : 0.75) - p.y) * ratio;
      return {
        pos: point,
        valid: !aim.invalid,
        clamped: d > range,
        reason: aim.invalid ? "Aim at the room" : "",
        ground,
      };
    }
    const own = this.state.fields.filter((f) => f.source === this.player.id);
    const replaced =
      action === "secondary" && this.config.model === "primary-secondary"
        ? own
            .slice(
              0,
              Math.max(
                0,
                own.length -
                  fieldCapacity(
                    this.state,
                    this.actorId,
                    this.config.secondaryCapacity,
                  ) +
                  1,
              ),
            )
            .map((f) => f.id)
        : [];
    const surface = this.physics.surfaceAt(
      { ...point, y: Math.max(aim.y, p.y) + 0.1 },
      replaced,
    );
    const bridge =
      principle === "Stone" &&
      action === "secondary" &&
      this.config.model === "primary-secondary" &&
      point.x >= 8 &&
      point.x <= 11 &&
      Math.abs(point.z) < 4;
    point.y = surface?.y ?? 0;
    const valid = !aim.invalid && (!!surface || bridge);
    return {
      pos: point,
      valid,
      clamped: d > range,
      reason: valid
        ? d > range
          ? "Range limit"
          : ""
        : "No supporting surface",
      ground,
    };
  }
  inGust(point: Vec, dir: Vec, radius = 0) {
    const p = this.player.pos,
      d = normalize(vec(point.x - p.x, 0, point.z - p.z));
    return (
      distance(point, p) < 6 + radius &&
      Math.abs(point.y - p.y) < 3 &&
      d.x * dir.x + d.z * dir.z > 0.72 &&
      !this.physics.terrainHit(p, point)
    );
  }
  contact(e: Entity, base: Vec, height = 0.65) {
    return (
      e.pos.y - e.height / 2 <= base.y + height &&
      e.pos.y - e.height / 2 >= base.y - 0.2
    );
  }
  fieldReaches(pos: Vec, target: Vec, height = 0.65) {
    if (target.y < pos.y - 0.1 || target.y > pos.y + height) return false;
    return !this.physics.terrainHit(vec(pos.x, pos.y + 0.15, pos.z), target);
  }
  cancelBufferedCast() {
    this.actor.bufferedCast = undefined;
  }
  reject(reason: string, pos = this.actor.aim) {
    const last = this.state.events
      .filter((e) => e.type === "rejected" && e.source === this.player.id)
      .at(-1);
    if (!last || this.state.time - last.time > 0.2)
      this.event("rejected", this.player.id, pos, {
        target: reason,
        duration: 0.4,
      });
  }
  secondaryPress(device = "unknown") {
    const s = this.state,
      remaining =
        Math.max(this.actor.secondaryReady, this.actor.dodgeUntil) - s.time;
    this.cancelBufferedCast();
    if (this.player.hp <= 0) return;
    if (remaining > 0 && remaining <= this.config.inputBuffer + 1e-6) {
      this.actor.bufferedCast = {
        principle: this.actor.activePrinciple,
        aim: { ...this.actor.aim },
        device,
        expires: s.time + this.config.inputBuffer,
      };
      this.event("buffered", this.player.id, this.actor.aim, {
        principle: this.actor.activePrinciple,
        duration: 0.16,
      });
    } else if (remaining > 0) this.reject("Recovering");
    else this.cast("secondary", device);
  }
  cast(
    action: "primary" | "secondary",
    device = "unknown",
    principle = this.actor.activePrinciple,
    aim: AimPoint = this.actor.aim,
  ) {
    const s = this.state,
      p = this.player;
    if (
      p.hp <= 0 ||
      s.time < this.actor.dodgeUntil ||
      (s.trial && s.trial.status !== "active")
    )
      return;
    if (
      s.time <
      (action === "primary"
        ? this.actor.primaryReady
        : this.actor.secondaryReady)
    )
      return;
    const target = this.targeting(action, principle, aim),
      pos = target.pos;
    if (!target.valid) {
      this.reject(target.reason, pos);
      return;
    }
    const dir = normalize(vec(pos.x - p.pos.x, 0, pos.z - p.pos.z));
    if (action === "primary")
      this.actor.primaryReady =
        s.time + CAST[principle].cadence * this.config.castRecovery;
    else this.actor.secondaryReady = s.time + 0.65 * this.config.castRecovery;
    this.actor.castUntil = s.time + 0.12;
    const applicationsBefore = s.metrics.stateApplications;
    const deflectionsBefore = s.metrics.transformations.deflect || 0;
    inc(s.metrics.casts, `${principle}:${action}`);
    this.outcome(`${p.id}:cast:${principle}:${action}`);
    inc(s.metrics.inputs, `${action}:${device}`);
    this.event("cast", p.id, p.pos, { principle, duration: 0.2 });
    if (action === "secondary") {
      if (this.config.model === "weave-unweave") {
        this.event("inverse", p.id, pos, { principle, duration: 0.55 });
        for (const e of this.nearby(pos, 2.8)) {
          if (principle === "Ember")
            this.apply(e, { heat: -100 }, p.id, "cool");
          if (principle === "Tide") {
            const d = normalize(vec(p.pos.x - e.pos.x, 0, p.pos.z - e.pos.z));
            this.apply(
              e,
              { water: -1, force: vec(d.x * 18, 1, d.z * 18) },
              p.id,
              "drain",
            );
          }
          if (principle === "Gale") {
            const d = normalize(vec(pos.x - e.pos.x, 0, pos.z - e.pos.z));
            this.apply(e, { force: vec(d.x * 45, 5, d.z * 45) }, p.id, "pull");
          }
          if (principle === "Stone")
            this.apply(e, { cohesion: -1, damage: 12 }, p.id, "fracture");
        }
        if (principle === "Stone")
          s.fields = s.fields.filter(
            (f) => distance(f.pos, pos) > 3 || f.principle !== "Stone",
          );
        return;
      }
      const own = s.fields.filter((f) => f.source === p.id);
      while (
        own.length >=
        fieldCapacity(s, this.actorId, this.config.secondaryCapacity)
      ) {
        this.outcome("field:replaced");
        const old = own.shift()!;
        s.fields = s.fields.filter((f) => f.id !== old.id);
        this.event("dissolve", p.id, old.pos, { principle: old.principle });
      }
      const end = ["Ember", "Tide"].includes(principle)
        ? vec(pos.x + dir.x * 2, pos.y, pos.z + dir.z * 2)
        : { ...pos };
      const start =
        principle === "Ember"
          ? vec(pos.x - dir.x * 2, pos.y, pos.z - dir.z * 2)
          : pos;
      s.fields.push({
        id: `field-${++s.serial}`,
        source: p.id,
        principle,
        pos: start,
        end,
        radius: principle === "Stone" ? 2.2 : 2.5,
        life: 12,
        nextPulse: 0,
        travel:
          principle === "Tide" &&
          hasUpgrade(s, this.actorId, "travelling-basin")
            ? vec(dir.x * 1.2, 0, dir.z * 1.2)
            : undefined,
        tethered:
          principle === "Gale" &&
          hasUpgrade(s, this.actorId, "tethered-updraft") &&
          distance(pos, p.pos) <= 3,
      });
      this.event("manifestation", p.id, pos, { principle, duration: 0.6 });
      this.physics.syncFields(s.fields);
      if (
        principle === "Stone" &&
        Math.abs(p.pos.x - pos.x) < 2.6 &&
        Math.abs(p.pos.z - pos.z) < 2.6 &&
        p.pos.y < pos.y + 1.6
      ) {
        p.pos.y = pos.y + 1.6;
        this.physics.teleport(p);
      }
      return;
    }
    if (principle === "Ember") {
      s.bolts.push({
        id: `bolt-${++s.serial}`,
        source: p.id,
        principle,
        pos: vec(p.pos.x + dir.x * 0.6, p.pos.y, p.pos.z + dir.z * 0.6),
        velocity: vec(
          dir.x * 21,
          ((pos.y - p.pos.y) / Math.max(1, distance(pos, p.pos))) * 21,
          dir.z * 21,
        ),
        life: 0.56,
        radius: 0.22,
        pierce: hasUpgrade(s, this.actorId, "piercing-ember") ? 1 : 0,
        hitIds: [],
      });
    } else if (principle === "Tide") {
      const jetEnd =
        this.physics.terrainHit(
          p.pos,
          vec(
            p.pos.x + dir.x * 8,
            p.pos.y +
              ((pos.y - p.pos.y) * 8) / Math.max(1, distance(pos, p.pos)),
            p.pos.z + dir.z * 8,
          ),
        ) ||
        vec(
          p.pos.x + dir.x * 8,
          p.pos.y + ((pos.y - p.pos.y) * 8) / Math.max(1, distance(pos, p.pos)),
          p.pos.z + dir.z * 8,
        );
      this.event("jet", p.id, vec(p.pos.x, p.pos.y, p.pos.z), {
        principle,
        end: jetEnd,
        duration: 0.22,
      });
      const jetHeightAt = (point: Vec) => {
        const dx = jetEnd.x - p.pos.x,
          dz = jetEnd.z - p.pos.z;
        const t =
          ((point.x - p.pos.x) * dx + (point.z - p.pos.z) * dz) /
          (dx * dx + dz * dz || 1);
        return p.pos.y + (jetEnd.y - p.pos.y) * t;
      };
      for (const e of s.entities)
        if (
          e.id !== p.id &&
          e.hp > 0 &&
          segmentDistance(e.pos, p.pos, jetEnd) < e.radius + 0.4 &&
          Math.abs(e.pos.y - jetHeightAt(e.pos)) < e.height / 2 + 0.4 &&
          !this.physics.terrainHit(
            p.pos,
            vec(e.pos.x, jetHeightAt(e.pos), e.pos.z),
          )
        )
          this.apply(
            e,
            {
              water: 0.7,
              damage: 6,
              force: vec(
                dir.x * (hasUpgrade(s, this.actorId, "undertow") ? -8 : 8),
                0,
                dir.z * (hasUpgrade(s, this.actorId, "undertow") ? -8 : 8),
              ),
            },
            p.id,
            "jet",
          );
    } else if (principle === "Gale") {
      this.event("fan", p.id, p.pos, {
        principle,
        end: vec(dir.x, 0, dir.z),
        duration: 0.3,
      });
      for (const e of this.nearby(p.pos, 6)) {
        const d = normalize(vec(e.pos.x - p.pos.x, 0, e.pos.z - p.pos.z));
        if (this.inGust(e.pos, dir, e.radius))
          this.apply(
            e,
            { force: vec(d.x * 42, 7, d.z * 42), damage: 5 },
            p.id,
            "pressure",
          );
      }
      for (const b of s.bolts)
        if (b.source !== p.id && this.inGust(b.pos, dir)) {
          b.originalSource ??= b.source;
          this.outcome(`projectile:${b.originalSource}:deflected`);
          b.velocity = vec(dir.x * 11, 0, dir.z * 11);
          b.source = p.id;
          inc(s.metrics.transformations, "deflect");
        }
    } else {
      this.event("eruption-warning", p.id, pos, { principle, duration: 0.22 });
      s.pending.push({ source: p.id, pos, at: s.time + 0.18, principle });
      if (hasUpgrade(s, this.actorId, "stone-echo")) {
        s.pending.push({
          source: p.id,
          pos: { ...pos },
          at: s.time + 0.83,
          principle,
        });
        this.event("eruption-warning", p.id, pos, {
          principle,
          duration: 0.83,
        });
      }
    }
    if (principle === "Tide" || principle === "Gale")
      this.outcome(
        `${p.id}:${principle}:primary:${s.metrics.stateApplications > applicationsBefore || (s.metrics.transformations.deflect || 0) > deflectionsBefore ? "hit" : "miss"}`,
      );
    if (
      (principle === "Tide" || principle === "Gale") &&
      applicationsBefore === s.metrics.stateApplications &&
      deflectionsBefore === (s.metrics.transformations.deflect || 0)
    )
      this.event("empty", p.id, pos, { duration: 0.3 });
  }
  actorInput(input: FrameInput, dt: number) {
    const s = this.state,
      p = this.player;
    this.actor.aim = { ...input.aim };
    for (const key of input.triggers || []) inc(s.metrics.inputs, key);
    const old = this.actor.activePrinciple;
    if (input.select) this.actor.activePrinciple = input.select;
    if (input.cycle)
      this.actor.activePrinciple =
        PRINCIPLES[
          (PRINCIPLES.indexOf(this.actor.activePrinciple) + input.cycle + 4) % 4
        ];
    if (old !== this.actor.activePrinciple) s.metrics.switches++;
    const direction = normalize(vec(input.moveX, 0, input.moveZ));
    if (input.dodge && s.time >= this.actor.dodgeReady && p.hp > 0) {
      this.actor.dodgeDirection =
        input.moveX || input.moveZ
          ? direction
          : normalize(
              vec(this.actor.aim.x - p.pos.x, 0, this.actor.aim.z - p.pos.z),
            );
      this.actor.dodgeUntil = s.time + this.config.dodgeDuration;
      this.actor.invulnerableUntil =
        s.time +
        Math.min(this.config.invulnerability, this.config.dodgeDuration);
      this.actor.dodgeReady = s.time + this.config.dodgeRecovery;
      s.metrics.dodges++;
      this.event("dodge", p.id, p.pos, { duration: 0.3 });
    }
    const downed = this.players.find(
      (e) =>
        e.id !== p.id &&
        e.hp <= 0 &&
        distance(e.pos, p.pos) < 2.2 &&
        Math.abs(e.pos.y - p.pos.y) < 1.4 &&
        !this.physics.terrainHit(p.pos, e.pos),
    );
    if (s.party && input.revive && p.hp > 0 && downed) {
      this.actor.reviveProgress += dt;
      if (this.actor.reviveProgress >= 1.2) {
        this.revive(downed.id, p.id);
        this.actor.reviveProgress = 0;
      }
    } else this.actor.reviveProgress = 0;
    if (input.primary && !this.actor.reviveProgress)
      this.cast(
        "primary",
        input.primaryDevice,
        input.primarySelect ?? this.actor.activePrinciple,
        input.primaryAim ?? this.actor.aim,
      );
    if (input.secondary && !this.actor.reviveProgress)
      this.secondaryPress(input.secondaryDevice);
    const buffered = this.actor.bufferedCast;
    if (p.hp <= 0 || (buffered && s.time > buffered.expires + 1e-6))
      this.cancelBufferedCast();
    else if (
      buffered &&
      s.time >= Math.max(this.actor.secondaryReady, this.actor.dodgeUntil)
    ) {
      this.cancelBufferedCast();
      this.cast("secondary", buffered.device, buffered.principle, buffered.aim);
    }
    if (
      !s.trial &&
      input.interact &&
      distance(p.pos, vec(PAD.x, 0, PAD.z)) < 3
    ) {
      s.sentinel.enabled = !s.sentinel.enabled;
      this.event("interact", p.id, p.pos);
    }
    const dashing = s.time < this.actor.dodgeUntil;
    const speed = dashing
      ? this.config.dodgeDistance / this.config.dodgeDuration
      : this.config.moveSpeed *
        (s.time < this.actor.castUntil ? this.config.castMoveMultiplier : 1);
    const movement = dashing ? this.actor.dodgeDirection : direction;
    return p.hp > 0
      ? vec(movement.x * speed * dt, 0, movement.z * speed * dt)
      : vec();
  }
  step(input: FrameInput) {
    this.stepParty({ [this.actorId]: input });
  }
  stepParty(inputs: Record<string, FrameInput>) {
    if (this.replica) throw Error("A replica cannot advance gameplay");
    const s = this.state,
      p = this.player,
      dt = 1 / 60;
    if (s.trial && s.trial.status !== "active") {
      for (const [id, input] of Object.entries(inputs))
        if (input.interact) this.ready(id);
      return;
    }
    if (s.trial) s.trial.elapsed += dt;
    s.time += dt;
    s.tick++;
    const moves: Record<string, Vec> = {};
    for (const id of Object.keys(s.actors))
      this.withActor(id, () => {
        moves[id] = this.actorInput(
          inputs[id] ?? idleInput(this.actor.aim),
          dt,
        );
      });
    for (const pending of s.pending.filter((a) => a.at <= s.time)) {
      this.event("eruption", pending.source, pending.pos, {
        principle: "Stone",
        duration: 0.5,
      });
      const before = s.metrics.stateApplications;
      for (const e of this.nearby(pending.pos, 1.25, pending.source).filter(
        (e) =>
          this.contact(e, pending.pos, 1.6) &&
          !this.physics.terrainHit(
            vec(pending.pos.x, pending.pos.y + 0.15, pending.pos.z),
            vec(
              e.pos.x,
              Math.max(pending.pos.y + 0.15, e.pos.y - e.height / 2 + 0.1),
              e.pos.z,
            ),
          ),
      )) {
        this.apply(
          e,
          { cohesion: 0.6, damage: 20, force: vec(0, 8, 0) },
          pending.source,
          "eruption",
        );
        this.stagger(e, 0.25);
      }
      this.outcome(
        `${pending.source}:Stone:primary:${s.metrics.stateApplications > before ? "hit" : "miss"}`,
      );
    }
    s.pending = s.pending.filter((a) => a.at > s.time);
    for (const f of s.fields) {
      // Moving manifestations stay grounded and stop at solid terrain. No gameplay prediction.
      const owner = s.entities.find((e) => e.id === f.source);
      const next =
        f.tethered && owner && owner.hp > 0
          ? vec(owner.pos.x, f.pos.y, owner.pos.z)
          : f.travel
            ? vec(f.pos.x + f.travel.x * dt, f.pos.y, f.pos.z + f.travel.z * dt)
            : undefined;
      if (next) {
        const surface = this.physics.surfaceAt(
          vec(next.x, f.pos.y + 0.3, next.z),
        );
        if (
          surface &&
          Math.abs(surface.y - f.pos.y) < 0.3 &&
          !this.physics.terrainHit(
            vec(f.pos.x, f.pos.y + 0.15, f.pos.z),
            vec(next.x, f.pos.y + 0.15, next.z),
          )
        ) {
          f.end.x += next.x - f.pos.x;
          f.end.z += next.z - f.pos.z;
          f.pos = { ...next, y: surface.y };
        } else if (f.travel) f.travel = undefined;
      }
      f.life -= dt;
      f.nextPulse -= dt;
      if (f.nextPulse > 0) continue;
      f.nextPulse = 0.25;
      for (const e of s.entities.filter((e) => e.hp > 0)) {
        const inside =
          f.principle === "Ember"
            ? segmentDistance(e.pos, f.pos, f.end) < 0.8 + e.radius
            : distance(e.pos, f.pos) < f.radius + e.radius;
        const height =
          f.principle === "Gale" ? 3 : f.principle === "Stone" ? 1.1 : 0.65;
        if (!inside || !this.contact(e, f.pos, height)) continue;
        const base =
          f.principle === "Stone"
            ? vec(f.pos.x, f.pos.y + 0.9, f.pos.z)
            : f.pos;
        const target = vec(
          e.pos.x,
          Math.max(base.y + 0.15, e.pos.y - e.height / 2 + 0.1),
          e.pos.z,
        );
        if (!this.fieldReaches(base, target, height)) continue;
        this.outcome(`field:${f.principle}:contact:${e.id}`);
        if (f.principle === "Ember")
          this.apply(e, { heat: 18, damage: 2 }, f.source, "seam");
        if (f.principle === "Tide")
          this.apply(
            e,
            {
              water: 0.25,
              force: vec((f.end.x - f.pos.x) * 2, 0, (f.end.z - f.pos.z) * 2),
            },
            f.source,
            "basin",
          );
        if (f.principle === "Gale" && e.id !== f.source) {
          const d = normalize(vec(f.pos.x - e.pos.x, 0, f.pos.z - e.pos.z));
          this.apply(
            e,
            { force: vec(d.x * 8, 8, d.z * 8) },
            f.source,
            "updraft",
          );
        }
        if (f.principle === "Stone" && e.material.structural)
          this.apply(e, { cohesion: 0.1 }, f.source, "stabilize");
      }
    }
    for (const f of s.fields.filter((f) => f.life <= 0))
      this.event("dissolve", f.source, f.pos, {
        principle: f.principle,
        target: "Expired",
        duration: 0.65,
      });
    s.fields = s.fields.filter((f) => f.life > 0);
    this.physics.syncFields(s.fields);
    for (const b of s.bolts) {
      const old = { ...b.pos };
      let slow = 1;
      if (
        s.fields.some(
          (f) =>
            f.principle === "Gale" &&
            distance(f.pos, b.pos) < f.radius &&
            this.fieldReaches(f.pos, b.pos, 3),
        )
      )
        slow = 0.3;
      b.pos.x += b.velocity.x * dt * slow;
      b.pos.y += b.velocity.y * dt * slow;
      b.pos.z += b.velocity.z * dt * slow;
      b.life -= dt;
      const obstacle = this.physics.terrainHit(old, b.pos);
      if (obstacle) {
        b.life = 0;
        s.metrics.blockedBolts++;
        this.outcome(`projectile:${b.originalSource ?? b.source}:blocked`);
        this.event("impact", b.source, b.pos, { principle: "Stone" });
        continue;
      }
      const hits = s.entities
        .filter(
          (e) =>
            e.id !== b.source &&
            !b.hitIds?.includes(e.id) &&
            e.hp > 0 &&
            segmentDistance(e.pos, old, b.pos) < e.radius + b.radius &&
            Math.abs(e.pos.y - b.pos.y) < e.height / 2 + 0.3,
        )
        .sort((a, c) => distance(a.pos, old) - distance(c.pos, old));
      if (hits.length) {
        const e = hits[0];
        this.outcome(`projectile:${b.originalSource ?? b.source}:hit:${e.id}`);
        (b.hitIds ??= []).push(e.id);
        if ((b.pierce ?? 0) > 0) b.pierce!--;
        else b.life = 0;
        if (b.principle === "hostile")
          this.damage(e, 14, b.source, "sentinel bolt");
        else this.apply(e, { heat: 48, damage: 9 }, b.source, "heat bolt");
        this.event("impact", b.source, e.pos, {
          principle: b.principle === "hostile" ? "Ember" : b.principle,
        });
      }
    }
    for (const b of s.bolts.filter((b) => b.life <= 0 && b.life !== 0))
      this.outcome(`projectile:${b.originalSource ?? b.source}:expired`);
    s.bolts = s.bolts.filter((b) => b.life > 0);
    for (const e of s.entities.filter((e) => e.hp > 0)) {
      if (
        !s.trial &&
        distance(e.pos, vec(WATER.x, 0, WATER.z)) < WATER.radius &&
        this.contact(e, vec(WATER.x, 0, WATER.z), 0.25)
      ) {
        if (e.wet < 0.9) this.apply(e, { water: 0.08 }, "water", "saturation");
      }
      e.heat = Math.max(0, e.heat - dt * 4);
      e.wet = Math.max(0, e.wet - dt * 0.025);
      if (e.ai && e.stagger > 0)
        this.outcome(`control:stagger-seconds:${e.id}`, dt);
      if (e.ai && e.pos.y - e.height / 2 > 0.3)
        this.outcome(`control:airborne-seconds:${e.id}`, dt);
      e.stagger = Math.max(0, e.stagger - dt);
      e.burning = e.material.flammable && e.heat > 65 && e.wet < 0.15;
      if (e.burning) {
        e.heat = Math.min(130, e.heat + dt * 9);
        this.damage(e, dt * 5, e.sources.heat || "world", "burning");
      }
      if (e.pos.y < -5) {
        s.metrics.falls++;
        if (e.kind === "player") {
          e.pos = vec(6, 0.9, 5);
          this.physics.teleport(e);
          s.actors[e.id].verticalSpeed = 0;
          this.damage(e, 10, "world", "fall");
        } else this.damage(e, e.hp, "world", "fall");
      }
    }
    this.tickEnemies(dt);
    this.physics.step(s, moves);
    // Material/momentum interaction: loose fast bodies can damage structural targets.
    for (const e of s.entities.filter(
      (e) => ["loose", "heavy"].includes(e.kind) && e.hp > 0,
    )) {
      const speed = Math.hypot(e.velocity.x, e.velocity.z);
      if (speed < 2) continue;
      for (const target of s.entities.filter(
        (t) => t.material.structural && t.id !== e.id && t.hp > 0,
      ))
        if (
          distance(e.pos, target.pos) < e.radius + target.radius + 0.35 &&
          s.time - target.hitAt > 0.35
        ) {
          this.damage(
            target,
            Math.min(28, speed * e.mass * 1.5),
            e.sources.force || "world",
            "physical impact",
          );
          inc(s.metrics.transformations, "physical impact");
        }
    }
    s.mechanism =
      !s.trial &&
      s.entities.some(
        (e) =>
          e.hp > 0 &&
          e.mass >= 10 &&
          distance(e.pos, vec(PAD.x, 0, PAD.z)) < PAD.radius,
      );
    if (s.trial) {
      if (!this.players.some((p) => p.hp > 0)) {
        s.trial.status = "defeat";
        if (s.party) {
          s.party.ready = [];
          s.party.epoch++;
        }
        for (const a of Object.values(s.actors)) a.bufferedCast = undefined;
        this.cancelBufferedCast();
      } else if (!s.entities.some((e) => e.ai && e.hp > 0)) {
        for (const ally of this.players.filter((p) => p.hp <= 0))
          this.revive(ally.id, "encounter-clear");
        s.trial.results.push({
          encounter: s.trial.encounter,
          seconds: s.time - s.trial.started,
          health: p.hp,
        });
        s.trial.status =
          s.trial.isolated ||
          s.trial.encounter === (s.run ? RUN_BEATS.length - 1 : 2)
            ? "victory"
            : "between";
        if (s.trial.status === "between") offerRewards(s);
        s.bolts = [];
        s.pending = [];
        if (s.party) {
          s.party.ready = [];
          s.party.epoch++;
        }
        for (const actor of Object.values(s.actors))
          actor.bufferedCast = undefined;
        this.cancelBufferedCast();
      }
    }
    s.events = s.events
      .filter((e) => s.time - e.time < Math.max(2, e.duration))
      .slice(-180);
  }
  steerEnemy(e: Entity, target: Vec, speed: number, dt: number) {
    if (e.stagger > 0 || e.pos.y - e.height / 2 > 0.3) return;
    const goal = normalize(vec(target.x - e.pos.x, 0, target.z - e.pos.z));
    const base = Math.atan2(goal.x, goal.z);
    let best = vec(),
      score = -Infinity;
    for (const offset of [0, 0.65, -0.65, 1.25, -1.25, 1.8, -1.8, Math.PI]) {
      const dir = vec(Math.sin(base + offset), 0, Math.cos(base + offset));
      const end = vec(
        e.pos.x + dir.x * 1.4,
        e.pos.y - e.height / 2 + 0.2,
        e.pos.z + dir.z * 1.4,
      );
      if (this.physics.terrainHit(vec(e.pos.x, end.y, e.pos.z), end)) continue;
      const value = dir.x * goal.x + dir.z * goal.z;
      if (value > score) {
        score = value;
        best = dir;
      }
    }
    if (score === -Infinity) {
      this.outcome(`navigation:blocked:${e.id}`);
      return;
    }
    // Acceleration, not velocity replacement: force/lift/stagger retain their effect.
    const amount = Math.min(1, dt * 5);
    this.physics.impulse(
      e.id,
      vec(
        (best.x * speed - e.velocity.x) * e.mass * amount,
        0,
        (best.z * speed - e.velocity.z) * e.mass * amount,
      ),
    );
  }
  tickEnemies(dt: number) {
    const s = this.state,
      tuning = TRIAL_TUNING[this.config.encounterVersion];
    for (const e of s.entities) {
      const ai = e.ai ?? (e.id === "sentinel" ? s.sentinel : undefined);
      const living = this.players.filter((p) => p.hp > 0);
      const target =
        (ai?.phase === "telegraph"
          ? living.find((p) => p.id === ai.targetId)
          : undefined) ??
        living.sort(
          (a, b) => distance(a.pos, e.pos) - distance(b.pos, e.pos),
        )[0];
      if (ai && target) ai.targetId = target.id;
      if (!ai || e.hp <= 0 || !ai.enabled || !target || e.stagger > 0) continue;
      const d = distance(e.pos, target.pos);
      if (!s.trial && d > 15) continue;
      if (e.kind === "pursuer") {
        ai.timer -= dt;
        if (ai.phase !== "telegraph") {
          ai.locked = { ...target.pos };
          this.steerEnemy(e, target.pos, tuning.pursuitSpeed, dt);
          if (
            d < 2.1 &&
            ai.timer <= 0 &&
            Math.abs(e.pos.y - target.pos.y) < 1.3
          ) {
            ai.phase = "telegraph";
            ai.timer = tuning.meleeWindup;
            ai.started = s.time;
          }
        } else {
          if (tuning.windupAdvance > 0)
            this.steerEnemy(
              e,
              ai.locked,
              tuning.pursuitSpeed * tuning.windupAdvance,
              dt,
            );
          if (ai.timer > tuning.meleeLock) ai.locked = { ...target.pos };
          if (ai.timer <= 0) {
            this.outcome(`${e.id}:melee:attempt`);
            const victims = living.filter(
              (p) =>
                distance(p.pos, ai.locked) < tuning.meleeRadius + p.radius &&
                distance(e.pos, p.pos) < 3.3 &&
                Math.abs(e.pos.y - p.pos.y) < 1.6 &&
                !this.physics.terrainHit(e.pos, p.pos),
            );
            this.outcome(
              `${e.id}:melee:${victims.length ? "contact" : "miss"}`,
            );
            for (const victim of victims)
              this.damage(victim, 12, e.id, "melee strike");
            this.event("melee-strike", e.id, ai.locked, { duration: 0.3 });
            ai.phase = "recover";
            ai.timer = tuning.meleeRecovery;
          }
        }
        continue;
      }
      if (s.trial && (d > 12 || this.physics.terrainHit(e.pos, target.pos)))
        this.steerEnemy(e, target.pos, 2.4, dt);
      ai.timer -= dt;
      if (ai.phase === "idle" || ai.phase === "recover") {
        if (ai.timer <= 0) {
          ai.phase = "telegraph";
          ai.timer = this.config.telegraph;
          ai.started = s.time;
          ai.locked = { ...target.pos };
        }
      } else if (ai.phase === "telegraph") {
        if (ai.timer > (s.trial ? tuning.rangedLock : 0.45))
          ai.locked = { ...target.pos };
        if (ai.timer <= 0) {
          const dir = normalize(
            vec(ai.locked.x - e.pos.x, 0, ai.locked.z - e.pos.z),
          );
          this.outcome(`${e.id}:projectile:attempt`);
          s.bolts.push({
            id: `enemy-${++s.serial}`,
            source: e.id,
            originalSource: e.id,
            principle: "hostile",
            pos: { ...e.pos },
            velocity: vec(
              dir.x * 7,
              s.trial
                ? ((ai.locked.y - e.pos.y) * 7) /
                    Math.max(1, distance(ai.locked, e.pos))
                : 0,
              dir.z * 7,
            ),
            life: 3,
            radius: 0.3,
          });
          ai.phase = "recover";
          ai.timer = s.trial ? tuning.rangedRecovery : 1.1;
        }
      }
    }
  }
  dispose() {
    this.physics.dispose();
  }
}
