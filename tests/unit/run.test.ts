import { beforeAll, expect, it } from "vitest";
import { initPhysics } from "../../src/physics/world";
import { Simulation } from "../../src/simulation/simulation";
import { configFromQuery } from "../../src/experiments/config";
import {
  fieldCapacity,
  offerRewards,
  UPGRADES,
  type UpgradeId,
} from "../../src/simulation/run";
import { idleInput, vec } from "../../src/simulation/types";
import { encodeSnapshot, WireReader } from "../../src/network/wire";
beforeAll(initPhysics);
it("run uses Model A; the existing Lab retains Model B", () => {
  expect(configFromQuery("?scene=run&model=weave-unweave").model).toBe(
    "primary-secondary",
  );
  expect(configFromQuery("?scene=free&model=weave-unweave").model).toBe(
    "weave-unweave",
  );
});
it("a guest entering the old trial discards its default-run state across JSON transport", () => {
  const host = new Simulation(configFromQuery("?scene=trial"));
  host.addPartner();
  const guest = new Simulation(configFromQuery("?scene=run"));
  const packet = JSON.parse(
    JSON.stringify(encodeSnapshot(host.state, host.config, 1, false, true)),
  );
  expect(new WireReader().read(packet, guest.state)!.run).toBeUndefined();
  host.dispose();
  guest.dispose();
});
const make = (coop = false) => {
  const sim = new Simulation(configFromQuery("?scene=run"));
  if (coop) sim.addPartner();
  sim.ready("mage-1");
  if (coop) sim.ready("mage-2");
  return sim;
};
function clear(sim: Simulation) {
  for (const e of sim.state.entities) if (e.ai) e.hp = 0;
  sim.step(idleInput());
}
function pick(sim: Simulation, actor = "mage-1", option = 0) {
  const r = sim.state.run!,
    o = r.reward!;
  return sim.chooseUpgrade(actor, r.id, o.id, o.offers[actor][option]);
}
function quiet(sim: Simulation) {
  for (const e of sim.state.entities) if (e.ai) e.ai.enabled = false;
}
const step = (sim: Simulation, n: number) => {
  for (let i = 0; i < n; i++) sim.step(idleInput());
};
it("offers are deterministic and personal; duplicate/stale/cross-actor requests cannot grant rewards", () => {
  const a = make(true),
    b = make(true);
  clear(a);
  clear(b);
  expect(a.state.run!.reward!.offers).toEqual(b.state.run!.reward!.offers);
  const old = structuredClone(a.state.run!);
  expect(pick(a)).toBe(true);
  expect(pick(a)).toBe(false);
  a.ready("mage-1");
  a.ready("mage-2");
  expect(a.state.trial!.status).toBe("between");
  expect(
    a.chooseUpgrade(
      "intruder",
      old.id,
      old.reward!.id,
      old.reward!.offers["mage-1"][0],
    ),
  ).toBe(false);
  expect(
    a.chooseUpgrade("mage-2", old.id, "stale", old.reward!.offers["mage-2"][0]),
  ).toBe(false);
  expect(pick(a, "mage-2")).toBe(true);
  a.ready("mage-2");
  expect(a.state.trial!.encounter).toBe(1);
  expect(a.state.run!.upgrades["mage-1"]).toHaveLength(1);
  expect(
    a.chooseUpgrade(
      "mage-2",
      old.id,
      old.reward!.id,
      old.reward!.offers["mage-2"][0],
    ),
  ).toBe(false);
  a.reset();
  expect(a.state.run!.id).not.toBe(old.id);
  expect(a.state.run!.upgrades).toEqual({ "mage-1": [], "mage-2": [] });
  a.dispose();
  b.dispose();
});
it("five beats carry builds and health, recover a downed ally, synchronize victory and clear all effects on restart", () => {
  const s = make(true);
  s.player.hp = 72;
  for (let beat = 0; beat < 5; beat++) {
    if (beat === 2) s.players[1].hp = 0;
    clear(s);
    expect(s.state.trial!.encounter).toBe(beat);
    expect(s.player.hp).toBe(72);
    if (beat === 2) expect(s.players[1].hp).toBe(35);
    if (beat === 4) break;
    if (s.state.run!.reward) {
      pick(s);
      pick(s, "mage-2");
    }
    s.ready("mage-1");
    s.ready("mage-2");
  }
  expect(s.state.trial!.status).toBe("victory");
  expect(s.state.run!.upgrades["mage-1"]).toHaveLength(2);
  s.ready("mage-1");
  s.ready("mage-2");
  expect(s.state.trial!.status).toBe("active");
  expect(s.state.trial!.encounter).toBe(0);
  expect(s.state.run!.upgrades["mage-2"]).toEqual([]);
  expect(s.player.hp).toBe(100);
  expect(s.state.fields).toEqual([]);
  expect(s.state.pending).toEqual([]);
  s.players.forEach((p) => (p.hp = 0));
  s.step(idleInput());
  expect(s.state.trial!.status).toBe("defeat");
  s.dispose();
});
it("wire intentionally carries run offers, personal choices and modifiers", () => {
  const s = make(true);
  clear(s);
  pick(s);
  const reader = new WireReader();
  const decoded = reader.read(
    encodeSnapshot(s.state, s.config, 1, false, true),
    s.state,
  )!;
  expect(decoded.run).toEqual(s.state.run);
  expect(decoded.run!.upgrades["mage-2"]).toEqual([]);
  s.dispose();
});
it("double inscription supports two fields per owner, replaces oldest and never changes baseline capacity", () => {
  const s = make(true);
  quiet(s);
  s.state.run!.upgrades = {
    "mage-1": ["double-inscription"],
    "mage-2": ["double-inscription"],
  };
  for (let j = 0; j < 3; j++) {
    for (const id of ["mage-1", "mage-2"])
      s.withActor(id, () => {
        s.actor.secondaryReady = 0;
        s.cast("secondary", "test", "Tide", vec(j * 2 - 2, 0, 0));
      });
  }
  expect(s.state.fields).toHaveLength(4);
  expect(s.config.secondaryCapacity).toBe(1);
  expect(fieldCapacity(s.state, "mage-1", 1)).toBe(2);
  s.dispose();
});
it("piercing Ember strikes two distinct targets once each and still stops at terrain", () => {
  const s = make();
  quiet(s);
  s.state.run!.upgrades["mage-1"] = ["piercing-ember"];
  s.player.pos = vec(0, 0.75, 5);
  s.physics.teleport(s.player);
  const enemies = s.state.entities.filter((e) => e.ai);
  enemies.forEach((e, i) => {
    e.pos = vec(0, 0.8, 2 - i * 2);
    s.physics.teleport(e);
  });
  s.physics.world.step();
  s.step({ ...idleInput(vec(0, 0, 0)), primary: true });
  step(s, 35);
  for (const e of enemies)
    expect(s.state.metrics.outcomes[`projectile:mage-1:hit:${e.id}`]).toBe(1);
  expect(s.state.bolts).toHaveLength(0);
  // Upgrade cannot pass through a conjured slab to reach the second target.
  for (const e of enemies) e.hp = 180;
  s.state.fields.push({
    id: "slab",
    source: "mage-1",
    principle: "Stone",
    pos: vec(0, 0, 3.5),
    end: vec(),
    radius: 2.2,
    life: 12,
    nextPulse: 0,
  });
  s.physics.syncFields(s.state.fields);
  s.physics.world.step();
  s.actor.primaryReady = 0;
  const blocked = s.state.metrics.blockedBolts;
  s.step({ ...idleInput(vec(0, 0, 0)), primary: true });
  step(s, 35);
  expect(s.state.metrics.blockedBolts).toBeGreaterThan(blocked);
  for (const e of enemies) expect(e.hp).toBe(180);
  s.dispose();
});
it("Stone echo schedules exactly one delayed repetition per cast, with actor attribution", () => {
  const s = make(true);
  quiet(s);
  const target = s.state.entities.find((e) => e.ai)!;
  target.pos = vec(0, 0.8, -2);
  s.physics.teleport(target);
  s.physics.world.step();
  for (const id of Object.keys(s.state.actors)) {
    s.state.run!.upgrades[id] = ["stone-echo"];
    s.withActor(id, () => s.cast("primary", "test", "Stone", vec(0, 0, -2)));
  }
  expect(s.state.pending).toHaveLength(4);
  step(s, 60);
  expect(s.state.pending).toHaveLength(0);
  for (const id of Object.keys(s.state.actors))
    expect(
      s.state.events.filter((e) => e.type === "eruption" && e.source === id),
    ).toHaveLength(2);
  for (const id of Object.keys(s.state.actors))
    expect(
      Object.values(s.state.metrics.damageRoutes).find(
        (r) =>
          r.source === id &&
          r.recipient === target.id &&
          r.reason === "eruption",
      )?.amount,
    ).toBe(40);
  s.dispose();
});
it("Undertow reverses jet force without changing saturation or damage", () => {
  const velocities: number[] = [];
  for (const upgraded of [false, true]) {
    const s = make();
    quiet(s);
    if (upgraded) s.state.run!.upgrades["mage-1"] = ["undertow"];
    const e = s.state.entities.find((e) => e.ai)!;
    s.player.pos = vec(0, 0.75, 5);
    e.pos = vec(0, 0.8, 2);
    s.physics.teleport(s.player);
    s.physics.teleport(e);
    s.physics.world.step();
    s.step({ ...idleInput(vec(0, 0, 2)), select: "Tide", primary: true });
    expect(e.wet).toBeGreaterThan(0.6);
    expect(e.hp).toBe(174);
    velocities.push(e.velocity.z);
    s.dispose();
  }
  expect(velocities[0]).toBeLessThan(0);
  expect(velocities[1]).toBeGreaterThan(0);
});
it("travelling basin moves, tethered updraft follows nearby placement, distant placement stays fixed", () => {
  const s = make();
  quiet(s);
  s.state.run!.upgrades["mage-1"] = ["travelling-basin", "tethered-updraft"];
  s.cast("secondary", "test", "Tide", vec(0, 0, 2));
  const z = s.state.fields[0].pos.z;
  step(s, 60);
  expect(s.state.fields[0].pos.z).toBeLessThan(z - 1);
  s.cast("secondary", "test", "Gale", vec(s.player.pos.x, 0, s.player.pos.z));
  for (let i = 0; i < 30; i++) s.step({ ...idleInput(), moveX: 1 });
  expect(Math.abs(s.state.fields[0].pos.x - s.player.pos.x)).toBeLessThan(0.2);
  s.actor.secondaryReady = 0;
  s.cast(
    "secondary",
    "test",
    "Gale",
    vec(s.player.pos.x, 0, s.player.pos.z - 5),
  );
  expect(s.state.fields[0].tethered).toBe(false);
  const fixed = { ...s.state.fields[0].pos };
  step(s, 30);
  expect(s.state.fields[0].pos).toEqual(fixed);
  s.dispose();
});
it.each([
  ["double-inscription", "travelling-basin"],
  ["double-inscription", "tethered-updraft"],
  ["piercing-ember", "stone-echo"],
  ["undertow", "stone-echo"],
] as UpgradeId[][])(
  "bounded pair %s + %s keeps effects finite for duplicate partner builds",
  (a, b) => {
    const s = make(true);
    quiet(s);
    for (const id of Object.keys(s.state.actors))
      s.state.run!.upgrades[id] = [a, b];
    for (let i = 0; i < 600; i++) {
      const input = {
        ...idleInput(vec(0, 0, -3)),
        select: (["Ember", "Tide", "Gale", "Stone"] as const)[
          Math.floor(i / 60) % 4
        ],
        primary: true,
        secondary: i % 60 === 0,
      };
      s.stepParty({ "mage-1": input, "mage-2": input });
      expect(s.state.fields.length).toBeLessThanOrEqual(4);
      expect(s.state.pending.length).toBeLessThanOrEqual(6);
      expect(s.state.bolts.length).toBeLessThan(16);
      expect(s.state.events.length).toBeLessThanOrEqual(180);
    }
    s.reset();
    expect(s.state.run!.upgrades["mage-1"]).toEqual([]);
    s.dispose();
  },
);
