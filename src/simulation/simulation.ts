import {
  CAST,
  PRINCIPLES,
  type Config,
  type Principle,
} from "../experiments/config";
import { Physics } from "../physics/world";
import { createState, PAD, WATER } from "./lab";
import {
  vec,
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
  physics: Physics;
  constructor(public config: Config) {
    this.state = createState(config);
    this.physics = new Physics(this.state);
  }
  get player() {
    return this.state.entities[0];
  }
  stagger(e: Entity, duration: number) {
    if (this.state.time >= e.staggerReady) {
      e.stagger = Math.min(0.4, duration);
      e.staggerReady = this.state.time + 1.4;
    }
  }
  reset() {
    this.physics.dispose();
    this.state = createState(this.config);
    this.physics = new Physics(this.state);
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
    if (e.kind === "player" && this.state.time < this.state.invulnerableUntil)
      return;
    if (this.state.metrics.combatStartedAt === null && e.kind === "sentinel")
      this.state.metrics.combatStartedAt = this.state.time;
    const actual = Math.min(e.hp, n);
    e.hp -= actual;
    if (n >= 1) e.hitAt = this.state.time;
    e.sources.damage = source;
    inc(this.state.metrics.damage, `${source}:${reason}`, actual);
    if (e.kind === "player") this.state.metrics.playerDamage += actual;
    if (e.hp <= 0) {
      this.event("shatter", source, e.pos, { target: e.id, duration: 0.8 });
      if (e.kind === "sentinel") {
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
    const oldHeat = e.heat,
      oldWet = e.wet;
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
      this.event("steam", source, e.pos, {
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
  targetPoint(range: number) {
    const p = this.player.pos,
      a = this.state.aim;
    const d = distance(p, a);
    return vec(
      p.x + (a.x - p.x) * Math.min(1, range / (d || 1)),
      a.y,
      p.z + (a.z - p.z) * Math.min(1, range / (d || 1)),
    );
  }
  cast(action: "primary" | "secondary", device = "unknown") {
    const s = this.state,
      p = this.player,
      principle = s.activePrinciple;
    if (p.hp <= 0 || s.time < s.dodgeUntil) return;
    if (s.time < (action === "primary" ? s.primaryReady : s.secondaryReady))
      return;
    const pos = this.targetPoint(CAST[principle].range),
      dir = normalize(vec(pos.x - p.pos.x, 0, pos.z - p.pos.z));
    if (action === "primary")
      s.primaryReady =
        s.time + CAST[principle].cadence * this.config.castRecovery;
    else s.secondaryReady = s.time + 0.65 * this.config.castRecovery;
    s.castUntil = s.time + 0.12;
    inc(s.metrics.casts, `${principle}:${action}`);
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
      while (own.length >= this.config.secondaryCapacity) {
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
      });
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
          ((pos.y + 0.75 - p.pos.y) / Math.max(1, distance(pos, p.pos))) * 21,
          dir.z * 21,
        ),
        life: 0.56,
        radius: 0.22,
      });
    } else if (principle === "Tide") {
      const jetEnd =
        this.physics.terrainHit(
          p.pos,
          vec(p.pos.x + dir.x * 8, p.pos.y, p.pos.z + dir.z * 8),
        ) || vec(p.pos.x + dir.x * 8, p.pos.y, p.pos.z + dir.z * 8);
      this.event("jet", p.id, vec(p.pos.x, p.pos.y, p.pos.z), {
        principle,
        end: jetEnd,
        duration: 0.22,
      });
      for (const e of s.entities)
        if (
          e.id !== p.id &&
          e.hp > 0 &&
          segmentDistance(e.pos, p.pos, jetEnd) < e.radius + 0.4
        )
          this.apply(
            e,
            { water: 0.7, damage: 6, force: vec(dir.x * 8, 0, dir.z * 8) },
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
        if (
          d.x * dir.x + d.z * dir.z > 0.72 &&
          !this.physics.terrainHit(p.pos, e.pos)
        )
          this.apply(
            e,
            { force: vec(d.x * 42, 7, d.z * 42), damage: 5 },
            p.id,
            "pressure",
          );
      }
      for (const b of s.bolts)
        if (b.source !== p.id && distance(b.pos, p.pos) < 6) {
          b.velocity = vec(dir.x * 11, 0, dir.z * 11);
          b.source = p.id;
          inc(s.metrics.transformations, "deflect");
        }
    } else {
      this.event("eruption-warning", p.id, pos, { principle, duration: 0.22 });
      s.pending.push({ source: p.id, pos, at: s.time + 0.18, principle });
    }
  }
  step(input: FrameInput) {
    const s = this.state,
      p = this.player,
      dt = 1 / 60;
    s.time += dt;
    s.tick++;
    s.aim = { ...input.aim };
    for (const key of input.triggers || []) inc(s.metrics.inputs, key);
    const old = s.activePrinciple;
    if (input.select) s.activePrinciple = input.select;
    if (input.cycle)
      s.activePrinciple =
        PRINCIPLES[
          (PRINCIPLES.indexOf(s.activePrinciple) + input.cycle + 4) % 4
        ];
    if (old !== s.activePrinciple) s.metrics.switches++;
    const direction = normalize(vec(input.moveX, 0, input.moveZ));
    if (input.dodge && s.time >= s.dodgeReady && p.hp > 0) {
      s.dodgeDirection =
        input.moveX || input.moveZ
          ? direction
          : normalize(vec(s.aim.x - p.pos.x, 0, s.aim.z - p.pos.z));
      s.dodgeUntil = s.time + this.config.dodgeDuration;
      s.invulnerableUntil =
        s.time +
        Math.min(this.config.invulnerability, this.config.dodgeDuration);
      s.dodgeReady = s.time + this.config.dodgeRecovery;
      s.metrics.dodges++;
      this.event("dodge", p.id, p.pos, { duration: 0.3 });
    }
    if (input.primary) this.cast("primary", input.primaryDevice);
    if (input.secondary) this.cast("secondary", input.secondaryDevice);
    if (input.interact && distance(p.pos, vec(PAD.x, 0, PAD.z)) < 3) {
      s.sentinel.enabled = !s.sentinel.enabled;
      this.event("interact", p.id, p.pos);
    }
    for (const pending of s.pending.filter((a) => a.at <= s.time)) {
      this.event("eruption", pending.source, pending.pos, {
        principle: "Stone",
        duration: 0.5,
      });
      for (const e of this.nearby(pending.pos, 1.25, pending.source)) {
        this.apply(
          e,
          { cohesion: 0.6, damage: 20, force: vec(0, 8, 0) },
          pending.source,
          "eruption",
        );
        this.stagger(e, 0.25);
      }
    }
    s.pending = s.pending.filter((a) => a.at > s.time);
    for (const f of s.fields) {
      f.life -= dt;
      f.nextPulse -= dt;
      if (f.nextPulse > 0) continue;
      f.nextPulse = 0.25;
      for (const e of s.entities.filter((e) => e.hp > 0)) {
        const inside =
          f.principle === "Ember"
            ? segmentDistance(e.pos, f.pos, f.end) < 0.8 + e.radius
            : distance(e.pos, f.pos) < f.radius + e.radius;
        if (!inside) continue;
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
    s.fields = s.fields.filter((f) => f.life > 0);
    this.physics.syncFields(s.fields);
    for (const b of s.bolts) {
      const old = { ...b.pos };
      let slow = 1;
      if (
        s.fields.some(
          (f) => f.principle === "Gale" && distance(f.pos, b.pos) < f.radius,
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
        this.event("impact", b.source, b.pos, { principle: "Stone" });
        continue;
      }
      const hits = s.entities
        .filter(
          (e) =>
            e.id !== b.source &&
            e.hp > 0 &&
            segmentDistance(e.pos, old, b.pos) < e.radius + b.radius &&
            Math.abs(e.pos.y - b.pos.y) < e.height / 2 + 0.3,
        )
        .sort((a, c) => distance(a.pos, old) - distance(c.pos, old));
      if (hits.length) {
        const e = hits[0];
        b.life = 0;
        if (b.principle === "hostile")
          this.damage(e, 14, b.source, "sentinel bolt");
        else this.apply(e, { heat: 48, damage: 9 }, b.source, "heat bolt");
        this.event("impact", b.source, e.pos, {
          principle: b.principle === "hostile" ? "Ember" : b.principle,
        });
      }
    }
    s.bolts = s.bolts.filter((b) => b.life > 0);
    for (const e of s.entities.filter((e) => e.hp > 0)) {
      if (
        distance(e.pos, vec(WATER.x, 0, WATER.z)) < WATER.radius &&
        e.pos.y < 2
      ) {
        if (e.wet < 0.9) this.apply(e, { water: 0.08 }, "water", "saturation");
      }
      e.heat = Math.max(0, e.heat - dt * 4);
      e.wet = Math.max(0, e.wet - dt * 0.025);
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
          this.physics.verticalSpeed = 0;
          this.damage(e, 10, "world", "fall");
        } else this.damage(e, e.hp, "world", "fall");
      }
    }
    this.tickSentinel(dt);
    const dashing = s.time < s.dodgeUntil;
    const speed = dashing
      ? this.config.dodgeDistance / this.config.dodgeDuration
      : this.config.moveSpeed *
        (s.time < s.castUntil ? this.config.castMoveMultiplier : 1);
    const movement = dashing ? s.dodgeDirection : direction;
    this.physics.step(
      s,
      p.hp > 0
        ? vec(movement.x * speed * dt, 0, movement.z * speed * dt)
        : vec(),
    );
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
    s.mechanism = s.entities.some(
      (e) =>
        e.hp > 0 &&
        e.mass >= 10 &&
        distance(e.pos, vec(PAD.x, 0, PAD.z)) < PAD.radius,
    );
    s.events = s.events
      .filter((e) => s.time - e.time < Math.max(2, e.duration))
      .slice(-180);
  }
  tickSentinel(dt: number) {
    const s = this.state,
      ai = s.sentinel,
      e = s.entities.find((e) => e.id === "sentinel")!;
    if (
      e.hp <= 0 ||
      !ai.enabled ||
      this.player.hp <= 0 ||
      distance(e.pos, this.player.pos) > 15 ||
      e.stagger > 0
    )
      return;
    ai.timer -= dt;
    if (ai.phase === "idle" || ai.phase === "recover") {
      if (ai.timer <= 0) {
        ai.phase = "telegraph";
        ai.timer = this.config.telegraph;
        ai.started = s.time;
        ai.locked = { ...this.player.pos };
      }
    } else if (ai.phase === "telegraph") {
      if (ai.timer > 0.45) ai.locked = { ...this.player.pos };
      if (ai.timer <= 0) {
        const dir = normalize(
          vec(ai.locked.x - e.pos.x, 0, ai.locked.z - e.pos.z),
        );
        s.bolts.push({
          id: `enemy-${++s.serial}`,
          source: e.id,
          principle: "hostile",
          pos: { ...e.pos },
          velocity: vec(dir.x * 7, 0, dir.z * 7),
          life: 3,
          radius: 0.3,
        });
        ai.phase = "recover";
        ai.timer = 1.1;
      }
    }
  }
  dispose() {
    this.physics.dispose();
  }
}
