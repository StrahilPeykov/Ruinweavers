import { beforeAll, expect, it } from "vitest";
import { initPhysics } from "../../src/physics/world";
import { Simulation } from "../../src/simulation/simulation";
import { configFromQuery } from "../../src/experiments/config";
import { idleInput, vec } from "../../src/simulation/types";
beforeAll(initPhysics);
const make = () => new Simulation(configFromQuery("?scene=states"));

it("Gale does not deflect a projectile behind the caster", () => {
  const s = make();
  s.state.activePrinciple = "Gale";
  s.state.aim = vec(-4, 0, -5);
  s.state.bolts.push({
    id: "behind",
    source: "sentinel",
    principle: "hostile",
    pos: vec(-4, 0.75, 2),
    velocity: vec(0, 0, -7),
    life: 3,
    radius: 0.2,
  });
  s.cast("primary");
  expect(s.state.bolts[0].source).toBe("sentinel");
  s.dispose();
});

it("a ground basin cannot wet an object above its contact band", () => {
  const s = make();
  const e = s.state.entities.find((e) => e.id === "dummy")!;
  e.pos = vec(0, 4, -4.5);
  s.physics.teleport(e);
  s.state.fields.push({
    id: "basin",
    source: "mage-1",
    principle: "Tide",
    pos: vec(0, 0, -4.5),
    end: vec(0, 0, -2.5),
    radius: 2.5,
    life: 12,
    nextPulse: 0,
  });
  s.step(idleInput());
  expect(e.wet).toBe(0);
  s.dispose();
});

it("a Secondary press in the final 100ms of dodge executes once after dodge", () => {
  const s = make();
  s.state.dodgeUntil = 0.1;
  s.step({ ...idleInput(vec(-4, 0, -3)), select: "Tide", secondary: true });
  for (let i = 0; i < 20; i++) s.step(idleInput());
  expect(s.state.metrics.casts["Tide:secondary"]).toBe(1);
  s.dispose();
});

function slab(s: Simulation, x = 0, z = 0) {
  s.state.fields.push({
    id: "cover",
    source: "mage-1",
    principle: "Stone",
    pos: vec(x, 0, z),
    end: vec(x, 0, z),
    radius: 2.2,
    life: 12,
    nextPulse: 0,
  });
  s.physics.syncFields(s.state.fields);
  s.physics.world.step();
}
it("pointer queries resolve bodies, actual stair tops and Stone surfaces, excluding VFX", () => {
  const s = make();
  const body = s.physics.pick(vec(0, 8, -4.5), vec(0, -1, 0), s.player.id);
  expect(body.body).toBe(true);
  expect(body.y).toBeCloseTo(1.25, 2);
  const stair = s.physics.pick(vec(-10, 8, -6.2), vec(0, -1, 0), s.player.id);
  expect(stair.y).toBeCloseTo(0.25, 2);
  slab(s);
  expect(
    s.physics.pick(vec(0, 8, 0), vec(0, -1, 0), s.player.id).y,
  ).toBeCloseTo(0.85, 2);
  s.state.aim = { ...body };
  s.state.activePrinciple = "Tide";
  expect(s.targeting("secondary").pos.y).toBeCloseTo(0, 2);
  s.dispose();
});
it("range clamping resamples support and replacement excludes the outgoing slab", () => {
  const s = make();
  slab(s, 0, 0);
  s.state.activePrinciple = "Tide";
  s.state.aim = vec(0, 0.85, 0);
  expect(s.targeting("secondary").pos.y).toBeCloseTo(0, 2);
  s.state.activePrinciple = "Stone";
  expect(s.targeting("primary").pos.y).toBeCloseTo(0.85, 2);
  s.player.pos = vec(-4, 0.75, 3);
  s.physics.teleport(s.player);
  s.state.aim = vec(-10, 1.2, -10);
  const target = s.targeting("secondary");
  expect(target.clamped).toBe(true);
  expect(target.pos.y).toBeCloseTo(0, 2);
  s.state.aim = { ...vec(16, 1, 0), invalid: true };
  s.cast("secondary");
  expect(s.state.fields).toHaveLength(1);
  expect(s.state.events.at(-1)?.type).toBe("rejected");
  s.dispose();
});
it("Tide and Gale respect cover; Gale only deflects forward visible bolts", () => {
  const s = make();
  slab(s);
  s.player.pos = vec(-4, 0.75, 0);
  s.physics.teleport(s.player);
  const e = s.state.entities.find((e) => e.id === "dummy")!;
  e.pos = vec(4, 0.75, 0);
  s.physics.teleport(e);
  s.physics.world.step();
  s.state.aim = vec(4, 0, 0);
  s.state.activePrinciple = "Tide";
  s.cast("primary");
  expect(e.wet).toBe(0);
  s.state.activePrinciple = "Gale";
  s.state.primaryReady = 0;
  for (const [id, pos] of [
    ["open", vec(-3, 0.75, 0.5)],
    ["blocked", vec(1, 0.75, 0)],
    ["side", vec(-4, 0.75, 3)],
  ] as const)
    s.state.bolts.push({
      id,
      source: "sentinel",
      principle: "hostile",
      pos,
      velocity: vec(),
      life: 3,
      radius: 0.2,
    });
  s.cast("primary");
  expect(s.state.bolts.find((b) => b.id === "open")?.source).toBe("mage-1");
  expect(s.state.bolts.find((b) => b.id === "blocked")?.source).toBe(
    "sentinel",
  );
  expect(s.state.bolts.find((b) => b.id === "side")?.source).toBe("sentinel");
  s.dispose();
});
it("a pitched Tide jet hits raised bodies but misses bodies below its ray", () => {
  const s = make();
  const e = s.state.entities.find((e) => e.id === "dummy")!;
  e.pos = vec(-4, 3, -5);
  s.physics.teleport(e);
  s.physics.world.step();
  s.state.activePrinciple = "Tide";
  s.state.aim = { ...e.pos, body: true };
  s.cast("primary");
  expect(e.wet).toBeGreaterThan(0.5);
  e.wet = 0;
  s.state.primaryReady = 0;
  s.state.aim = { ...vec(-4, 7, -5), body: true };
  s.cast("primary");
  expect(e.wet).toBe(0);
  s.dispose();
});
it("ground fields reject targets below, above, or behind raised terrain", () => {
  const s = make();
  const e = s.state.entities.find((e) => e.id === "dummy")!;
  e.pos = vec(-10, 0.65, -7);
  s.physics.teleport(e);
  s.state.fields.push({
    id: "basin",
    source: "mage-1",
    principle: "Tide",
    pos: vec(-10, 1.2, -8),
    end: vec(-10, 1.2, -6),
    radius: 2.5,
    life: 12,
    nextPulse: 0,
  });
  s.step(idleInput());
  expect(e.wet).toBe(0);
  s.dispose();
});
it("buffer snapshots Principle and world aim, retains cooldown and never repeats", () => {
  const s = make();
  s.state.secondaryReady = 0.1;
  s.step({ ...idleInput(vec(-4, 0, -3)), select: "Tide", secondary: true });
  s.step({ ...idleInput(vec(0, 0, 0)), select: "Ember" });
  for (let i = 0; i < 50; i++) s.step(idleInput());
  expect(s.state.metrics.casts["Tide:secondary"]).toBe(1);
  expect(s.state.metrics.casts["Ember:secondary"]).toBeUndefined();
  expect(s.state.fields[0].pos.z).toBe(-3);
  expect(s.state.secondaryReady).toBeGreaterThan(0.74);
  expect(s.state.bufferedCast).toBeUndefined();
  s.dispose();
});
it("zero buffer, too-early presses, cancellation, reset and death discard intent", () => {
  const s = make();
  for (const buffer of [0, 0.12]) {
    s.config.inputBuffer = buffer;
    s.state.dodgeUntil = s.state.time + 0.2;
    s.step({ ...idleInput(), secondary: true });
    expect(s.state.bufferedCast).toBeUndefined();
  }
  s.state.dodgeUntil = s.state.time + 0.1;
  s.step({ ...idleInput(), secondary: true });
  expect(s.state.bufferedCast).toBeDefined();
  s.cancelBufferedCast();
  expect(s.state.bufferedCast).toBeUndefined();
  s.step({ ...idleInput(), secondary: true });
  s.damage(s.player, 1000, "test", "death");
  expect(s.state.bufferedCast).toBeUndefined();
  s.reset();
  expect(s.state.bufferedCast).toBeUndefined();
  s.dispose();
});
it("replacement preserves residual states and expiry drops the player onto remaining support", () => {
  const s = make();
  s.state.activePrinciple = "Tide";
  s.state.aim = vec(0, 0, -4.5);
  s.cast("secondary");
  s.step(idleInput());
  const e = s.state.entities.find((e) => e.id === "dummy")!;
  expect(e.wet).toBeGreaterThan(0);
  s.state.secondaryReady = 0;
  s.state.activePrinciple = "Stone";
  s.state.aim = vec(-4, 0, 0);
  s.cast("secondary");
  expect(e.wet).toBeGreaterThan(0);
  expect(s.player.pos.y).toBeGreaterThan(1.5);
  s.state.fields[0].life = 0.02;
  for (let i = 0; i < 90; i++) s.step(idleInput());
  expect(s.player.pos.y).toBeLessThan(0.8);
  expect(s.player.hp).toBe(100);
  expect(s.state.fields).toHaveLength(0);
  s.dispose();
});

it("placement capacity counts only the casting actor's manifestations", () => {
  const s = make();
  s.config.secondaryCapacity = 2;
  slab(s);
  for (let i = 0; i < 2; i++)
    s.state.fields.push({
      id: `other-${i}`,
      source: "mage-2",
      principle: "Tide",
      pos: vec(-8, 0, 0),
      end: vec(-8, 0, 0),
      radius: 2.5,
      life: 12,
      nextPulse: 0,
    });
  s.state.activePrinciple = "Tide";
  s.state.aim = vec(0, 0.85, 0);
  expect(s.targeting("secondary").pos.y).toBeCloseTo(0.85, 2);
  s.cast("secondary");
  expect(s.state.fields.find((f) => f.id === "cover")).toBeDefined();
  s.dispose();
});

it("Tide's visible upper jet can hit a body whose center is hidden by a ledge", () => {
  const s = make();
  s.player.pos = vec(-10, 1.95, -9);
  s.physics.teleport(s.player);
  const e = s.state.entities.find((e) => e.id === "dummy")!;
  e.pos = vec(-5, 0.65, -9);
  s.physics.teleport(e);
  s.physics.world.step();
  s.state.activePrinciple = "Tide";
  s.state.aim = { ...vec(-5, 1.2, -9), body: true };
  s.cast("primary");
  expect(e.wet).toBeGreaterThan(0.5);
  e.wet = 0;
  s.state.primaryReady = 0;
  s.state.aim = { ...vec(-5, 0.1, -9), body: true };
  s.cast("primary");
  expect(e.wet).toBe(0);
  s.dispose();
});
