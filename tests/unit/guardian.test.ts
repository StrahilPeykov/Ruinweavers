import { beforeAll, expect, it } from "vitest";
import { initPhysics } from "../../src/physics/world";
import { Simulation } from "../../src/simulation/simulation";
import { configFromQuery } from "../../src/experiments/config";
import { idleInput, vec } from "../../src/simulation/types";
import { encodeSnapshot, WireReader } from "../../src/network/wire";
beforeAll(initPhysics);
function make(pair = false) {
  const sim = new Simulation(configFromQuery("?scene=guardian&seed=123"));
  if (pair) sim.addPartner();
  for (const p of sim.players) sim.ready(p.id);
  return sim;
}
const advance = (s: Simulation, n: number) => {
  for (let i = 0; i < n; i++)
    s.stepParty(Object.fromEntries(s.players.map((p) => [p.id, idleInput()])));
};
it("Guardian replaces only the final run court and leaves the legacy run available", () => {
  const s = make(),
    old = new Simulation(configFromQuery("?scene=run-legacy"));
  expect(s.state.guardian?.core).toBe("warden");
  expect(s.state.entities.filter((e) => e.kind === "wardplate")).toHaveLength(
    2,
  );
  expect(old.state.guardian).toBeUndefined();
  old.state.trial!.encounter = 3;
  old.state.trial!.status = "between";
  old.advanceTrial();
  expect(old.state.entities.filter((e) => e.ai)).toHaveLength(5);
  expect(old.state.guardian).toBeUndefined();
  s.dispose();
  old.dispose();
});
it("the body takes ordinary damage while both optional plates remain attached", () => {
  const s = make(),
    core = s.state.entities.find((e) => e.id === "warden")!;
  const hp = core.hp;
  s.apply(core, { damage: 20, heat: 48, water: 0.7 }, "mage-1", "ordinary");
  expect(core.hp).toBeLessThan(hp - 20);
  expect(s.state.guardian!.plates.every((p) => p.attached)).toBe(true);
  expect(s.state.metrics.transformations.vaporize).toBeGreaterThan(0);
  s.dispose();
});
it("maneuvers expose telegraph, commitment and recovery; all three fire under normal time", () => {
  const s = make();
  s.player.hp = s.player.maxHp = 100000;
  for (let i = 0; i < 2400; i++) {
    advance(s, 1);
    if (
      ["volley", "march", "furnace"].every(
        (name) => s.state.metrics.outcomes[`warden:${name}:attack`] > 0,
      )
    )
      break;
  }
  for (const name of ["volley", "march", "furnace"]) {
    expect(s.state.metrics.outcomes[`warden:${name}:commit`]).toBeGreaterThan(
      0,
    );
    expect(s.state.metrics.outcomes[`warden:${name}:attack`]).toBeGreaterThan(
      0,
    );
  }
  expect(s.state.bolts.length).toBeLessThan(12);
  s.dispose();
});
it("committed route never retargets a moving player", () => {
  const s = make();
  s.player.hp = 100000;
  while (s.state.guardian!.stage !== "commit") advance(s, 1);
  const locked = structuredClone(s.state.guardian!.locked);
  s.player.pos = vec(-8, 0.75, 3);
  s.physics.teleport(s.player);
  advance(s, 8);
  expect(s.state.guardian!.locked).toEqual(locked);
  s.dispose();
});
it("living targets alternate; a downed partner is excluded at the next selection", () => {
  const s = make(true);
  for (const p of s.players) p.hp = 100000;
  advance(s, 1200);
  expect(s.state.metrics.outcomes["warden:target:mage-1"]).toBeGreaterThan(0);
  expect(s.state.metrics.outcomes["warden:target:mage-2"]).toBeGreaterThan(0);
  s.players[1].hp = 0;
  const old = s.state.metrics.outcomes["warden:target:mage-2"];
  advance(s, 700);
  expect(s.state.metrics.outcomes["warden:target:mage-2"]).toBe(old);
  s.dispose();
});
it("cohesion failure detaches a real plate without changing the core HP", () => {
  const s = make(),
    g = s.state.guardian!,
    plate = s.state.entities.find((e) => e.id === g.plates[0].id)!,
    core = s.state.entities.find((e) => e.id === g.core)!;
  const hp = core.hp;
  s.apply(
    plate,
    { cohesion: -1.5, force: vec(12, 0, 0) },
    "mage-1",
    "fracture",
  );
  advance(s, 3);
  expect(g.plates[0].attached).toBe(false);
  expect(s.physics.wardenJoints.has(plate.id)).toBe(false);
  expect(core.hp).toBe(hp);
  s.dispose();
});
it("one phase transition has no damage gate and releases construction", () => {
  const s = make(),
    g = s.state.guardian!,
    core = s.state.entities.find((e) => e.id === g.core)!;
  s.damage(core, core.maxHp * 0.5, "mage-1", "fixture");
  advance(s, 1);
  expect(g.phase).toBe(2);
  const hp = core.hp;
  s.damage(core, 9, "mage-1", "ordinary");
  expect(core.hp).toBe(hp - 9);
  advance(s, 100);
  expect(s.state.metrics.outcomes["warden:phase:2"]).toBe(1);
  expect(g.plates.some((p) => !p.attached)).toBe(true);
  s.dispose();
});
it("body death resolves victory without requiring plate destruction; retry cleans descendants", () => {
  const s = make(),
    g = s.state.guardian!,
    core = s.state.entities.find((e) => e.id === g.core)!;
  s.damage(core, core.hp, "mage-1", "fixture");
  advance(s, 1);
  expect(s.state.trial!.status).toBe("victory");
  expect(g.stage).toBe("fallen");
  s.reset();
  expect(s.state.guardian!.phase).toBe(1);
  expect(s.state.bolts).toHaveLength(0);
  expect(s.state.run!.upgrades["mage-1"]).toEqual([]);
  s.dispose();
});
it("threshold crossing cannot cancel a committed maneuver", () => {
  const s = make();
  s.player.hp = 100000;
  while (s.state.guardian!.stage !== "commit") advance(s, 1);
  const core = s.state.entities.find((e) => e.id === "warden")!;
  s.damage(core, 500, "mage-1", "fixture");
  advance(s, 1);
  expect(s.state.guardian!.stage).toBe("commit");
  expect(s.state.guardian!.phase).toBe(1);
  advance(s, 50);
  expect(s.state.metrics.outcomes["warden:volley:attack"]).toBe(1);
  expect(s.state.guardian!.phase).toBe(2);
  s.dispose();
});
it("a target downed before commitment is replaced; committed routes still remain locked", () => {
  const s = make(true);
  while (s.state.guardian!.stage !== "telegraph") advance(s, 1);
  const g = s.state.guardian!,
    old = s.players.find((p) => p.id === g.targetId)!;
  old.hp = 0;
  advance(s, 1);
  expect(g.targetId).not.toBe(old.id);
  while (g.stage !== "commit") advance(s, 1);
  expect(s.players.find((p) => p.id === g.targetId)!.hp).toBeGreaterThan(0);
  s.dispose();
});
it("co-op changes only central durability, not damage or plate rules", () => {
  const solo = make(),
    pair = make(true);
  expect(pair.state.entities.find((e) => e.kind === "warden")!.maxHp).toBe(
    1215,
  );
  expect(
    pair.state.entities.filter((e) => e.kind === "wardplate").map((e) => e.hp),
  ).toEqual(
    solo.state.entities.filter((e) => e.kind === "wardplate").map((e) => e.hp),
  );
  solo.dispose();
  pair.dispose();
});
it("plate destruction keeps the damaging actor in detachment feedback", () => {
  const s = make();
  const plate = s.state.entities.find((e) => e.kind === "wardplate")!;
  s.damage(plate, plate.hp, "mage-1", "fixture");
  advance(s, 1);
  expect(
    s.state.events.find(
      (e) => e.type === "warden-unbind" && e.target === plate.id,
    )?.source,
  ).toBe("mage-1");
  s.dispose();
});
it("Guardian live state and attached/loose lifecycle cross the explicit wire contract", () => {
  const s = make(true),
    reader = new WireReader();
  advance(s, 120);
  const packet = JSON.parse(
    JSON.stringify(encodeSnapshot(s.state, s.config, 1, false, true)),
  );
  const replica = reader.read(packet, s.state)!;
  expect(replica.guardian).toEqual(s.state.guardian);
  expect(JSON.stringify(packet).length).toBeLessThan(30000);
  s.dispose();
});
it("Gale redirects a Guardian shard and reports effect without requiring an entity hit", () => {
  const s = make();
  s.state.entities.find((e) => e.kind === "warden")!.ai!.enabled = false;
  s.state.bolts.push({
    id: "fixture-shard",
    source: "warden",
    originalSource: "warden",
    principle: "hostile",
    pos: vec(0, 0.75, 3),
    velocity: vec(0, 0, 8),
    life: 3,
    radius: 0.32,
  });
  s.step({ ...idleInput(vec(0, 0, 0)), select: "Gale", primary: true });
  expect(s.state.metrics.outcomes["projectile:warden:deflected"]).toBe(1);
  expect(s.state.bolts[0].source).toBe("mage-1");
  expect(
    s.state.events.filter((e) => e.source === "mage-1" && e.type === "empty"),
  ).toHaveLength(0);
  s.dispose();
});
it("Stone cover blocks an actually launched volley; direct unprotected standing takes damage", () => {
  for (const cover of [false, true]) {
    const s = make();
    s.player.pos = vec(0, 0.75, 4);
    s.physics.teleport(s.player);
    if (cover)
      s.step({ ...idleInput(vec(0, 0, 0)), select: "Stone", secondary: true });
    advance(s, 245);
    if (cover) {
      expect(
        s.state.metrics.outcomes["projectile:warden:blocked"],
      ).toBeGreaterThan(0);
      expect(s.player.hp).toBe(100);
    } else expect(s.player.hp).toBeLessThan(100);
    s.dispose();
  }
});
it("furnace heat on the construction can be transformed with ordinary water", () => {
  const s = make();
  s.player.hp = 100000;
  while (!s.state.metrics.outcomes["warden:furnace:attack"]) advance(s, 1);
  const core = s.state.entities.find((e) => e.kind === "warden")!;
  expect(core.heat).toBeGreaterThan(40);
  const before = core.hp;
  s.apply(core, { water: 0.7 }, "mage-1", "jet");
  expect(core.hp).toBeLessThan(before);
  expect(core.stagger).toBeGreaterThan(0);
  s.dispose();
});
it("ordinary mass/cohesion reduces rather than removes force and stagger", () => {
  const s = make(),
    core = s.state.entities.find((e) => e.kind === "warden")!,
    before = { ...core.pos };
  core.ai!.enabled = false;
  s.apply(core, { force: vec(14, 0, 0) }, "mage-1", "pressure");
  advance(s, 20);
  expect(core.pos.x - before.x).toBeGreaterThan(0.001);
  expect(core.pos.x - before.x).toBeLessThan(0.5);
  s.stagger(core, 0.4);
  expect(core.stagger).toBeGreaterThan(0);
  const duration = core.stagger;
  s.stagger(core, 0.4);
  expect(core.stagger).toBe(duration);
  s.dispose();
});
