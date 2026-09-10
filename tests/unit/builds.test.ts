import { beforeAll, expect, it } from "vitest";
import { initPhysics } from "../../src/physics/world";
import { Simulation } from "../../src/simulation/simulation";
import { configFromQuery } from "../../src/experiments/config";
import {
  eligible,
  offerRewards,
  UPGRADES,
  type UpgradeId,
} from "../../src/simulation/run";
import { idleInput, vec } from "../../src/simulation/types";
import { encodeSnapshot, WireReader } from "../../src/network/wire";
beforeAll(initPhysics);
function make(upgrades: UpgradeId[] = [], pair = false) {
  const s = new Simulation(configFromQuery("?scene=run&seed=123"));
  if (pair) s.addPartner();
  for (const id of Object.keys(s.state.actors)) {
    s.state.run!.upgrades[id] = [...upgrades];
    s.ready(id);
  }
  for (const e of s.state.entities) if (e.ai) e.ai.enabled = false;
  s.player.pos = vec(0, 0.75, 5);
  s.physics.teleport(s.player);
  const enemies = s.state.entities.filter((e) => e.ai);
  enemies.forEach((e, i) => {
    e.pos = vec(i * 1.4, 0.8, 0);
    s.physics.teleport(e);
  });
  s.physics.world.step();
  return s;
}
const step = (s: Simulation, n: number) => {
  for (let i = 0; i < n; i++) s.step(idleInput());
};
it("theorems require an owned compatible alteration and the final reward; offers and choices are revalidated", () => {
  const s = make([], true);
  s.state.trial!.status = "between";
  s.state.trial!.encounter = 3;
  expect(eligible(s.state, "mage-1", "break-seal")).toBe(false);
  s.state.run!.upgrades["mage-1"] = ["stone-echo"];
  expect(eligible(s.state, "mage-1", "break-seal")).toBe(true);
  expect(eligible(s.state, "mage-2", "break-seal")).toBe(false);
  offerRewards(s.state);
  const r = structuredClone(s.state.run!.reward!);
  offerRewards(s.state);
  expect(s.state.run!.reward!.offers).toEqual(r.offers);
  expect(r.offers["mage-1"]).toContain("break-seal");
  expect(
    r.offers["mage-2"].every((id) => UPGRADES[id].kind === "Alteration"),
  ).toBe(true);
  s.state.run!.upgrades["mage-1"] = [];
  expect(s.chooseUpgrade("mage-1", s.state.run!.id, r.id, "break-seal")).toBe(
    false,
  );
  s.state.trial!.encounter = 2;
  expect(eligible(s.state, "mage-1", "break-seal")).toBe(false);
  s.dispose();
});
it("three personal stops stay deterministic across seeds, exclude owned choices, and cap the build", () => {
  for (let seed = 0; seed < 30; seed++) {
    const a = make(),
      b = make();
    for (const s of [a, b]) {
      s.state.seed = seed;
      s.state.trial!.status = "between";
    }
    for (const encounter of [0, 2, 3]) {
      for (const s of [a, b]) {
        s.state.trial!.encounter = encounter;
        offerRewards(s.state);
      }
      expect(a.state.run!.reward!.offers).toEqual(b.state.run!.reward!.offers);
      for (const s of [a, b]) {
        const r = s.state.run!.reward!;
        expect(new Set(r.offers["mage-1"]).size).toBe(3);
        const choice = r.offers["mage-1"][0];
        expect(s.chooseUpgrade("mage-1", s.state.run!.id, r.id, choice)).toBe(
          true,
        );
        expect(s.chooseUpgrade("mage-1", s.state.run!.id, r.id, choice)).toBe(
          false,
        );
      }
    }
    expect(a.state.run!.upgrades["mage-1"]).toHaveLength(3);
    a.reset();
    expect(a.state.run!.upgrades["mage-1"]).toEqual([]);
    a.dispose();
    b.dispose();
  }
});
it("cross seam preview direction is the execution direction; no global spell mutation", () => {
  const s = make(["cross-seam"]);
  const axis = s.seamDirection(vec(0, 0, -1));
  s.cast("secondary", "test", "Ember", vec(0, 0, 0));
  const f = s.state.fields[0];
  expect(f.end.x - f.pos.x).toBeCloseTo(axis.x * 4);
  expect(f.end.z - f.pos.z).toBeCloseTo(axis.z * 4);
  s.dispose();
});
it("focused gust extends reach but loses peripheral coverage, with unchanged force", () => {
  const s = make(["focused-gale"]);
  expect(s.inGust(vec(0, 0.75, -3), vec(0, 0, -1))).toBe(true);
  expect(s.inGust(vec(3, 0.75, 1), vec(0, 0, -1))).toBe(false);
  s.cast("primary", "test", "Gale", vec(0, 0, -3));
  expect(s.state.events.find((e) => e.type === "fan")?.value).toBe(9);
  s.dispose();
});
it("forked Tide splits delivery with one application per target and terrain-clipped branches", () => {
  const s = make(["forked-tide"]);
  const target = s.state.entities.find((e) => e.ai)!;
  target.pos = vec(0, 0.8, 4);
  s.physics.teleport(target);
  s.physics.world.step();
  s.cast("primary", "test", "Tide", vec(0, 0, 0));
  expect(s.state.events.filter((e) => e.type === "jet")).toHaveLength(2);
  expect(target.hp).toBe(174); // overlapping branch origins never double-hit
  s.dispose();
});
it("fault line and Stone echo schedule bounded distinct points and stop propagation at cover", () => {
  const s = make(["fault-line", "stone-echo"]);
  s.cast("primary", "test", "Stone", vec(0, 0, 0));
  expect(s.state.pending).toHaveLength(6);
  expect(new Set(s.state.pending.map((p) => p.pos.z)).size).toBe(3);
  step(s, 100);
  expect(s.state.pending).toHaveLength(0);
  for (const route of Object.values(s.state.metrics.damageRoutes).filter(
    (r) => r.reason === "eruption",
  ))
    expect(route.amount).toBeLessThanOrEqual(40);
  s.dispose();
});
it.each([
  ["forked-tide", "undertow", "shared-vapour"],
  ["double-inscription", "cross-seam", "migrating-inscriptions"],
  ["stone-echo", "fault-line", "break-seal"],
  ["focused-gale", "tethered-updraft", "migrating-inscriptions"],
] as UpgradeId[][])(
  "three-choice duplicate partner build %s remains bounded and cleans up",
  (...upgrades) => {
    const s = make(upgrades, true);
    for (let tick = 0; tick < 1200; tick++) {
      const input = {
        ...idleInput(vec(0, 0, -2)),
        select: (["Ember", "Tide", "Gale", "Stone"] as const)[
          Math.floor(tick / 45) % 4
        ],
        primary: true,
        secondary: tick % 55 === 0,
      };
      s.stepParty({ "mage-1": input, "mage-2": input });
      expect(s.state.fields.length).toBeLessThanOrEqual(4);
      expect(s.state.pending.length).toBeLessThanOrEqual(24);
      expect(s.state.bolts.length).toBeLessThan(20);
      expect(s.state.events.length).toBeLessThanOrEqual(180);
    }
    s.reset();
    expect(s.state.pending).toEqual([]);
    expect(s.state.run!.upgrades["mage-2"]).toEqual([]);
    s.dispose();
  },
);
it("Shared vapour transfers moisture with provenance once, without recursive spread or terrain leaks", () => {
  const s = make(["shared-vapour"]);
  const [a, b] = s.state.entities.filter((e) => e.ai);
  a.wet = 0.8;
  b.heat = 80;
  s.apply(a, { heat: 60 }, "mage-1", "test");
  expect(s.state.metrics.outcomes["upgrade:mage-1:shared-vapour"]).toBe(1);
  expect(b.sources.wet).toBe("mage-1");
  expect(s.state.metrics.transformations.vaporize).toBe(2);
  expect(s.state.events.filter((e) => e.type === "vapour-link")).toHaveLength(
    1,
  );
  s.dispose();
});
it("Break the seal consumes binding through any force operation and retains recipient/source attribution", () => {
  const s = make(["break-seal"], true),
    e = s.state.entities.find((e) => e.ai)!;
  s.apply(e, { cohesion: 0.6 }, "mage-2", "bind");
  s.apply(e, { force: vec(12, 0, 0) }, "mage-1", "jet");
  expect(e.cohesion).toBe(0);
  expect(Object.values(s.state.metrics.damageRoutes)).toContainEqual({
    source: "mage-1",
    recipient: e.id,
    reason: "fracture impulse",
    amount: 10.8,
  });
  expect(s.state.metrics.outcomes["upgrade:mage-1:break-seal"]).toBe(1);
  s.dispose();
});
it("migration moves only owned visible non-solid fields, keeps lifetime/capacity and serializes live state", () => {
  const s = make(["double-inscription", "migrating-inscriptions"], true);
  s.cast("secondary", "test", "Tide", vec(0, 0, 2));
  s.withActor("mage-2", () =>
    s.cast("secondary", "test", "Tide", vec(1, 0, 2)),
  );
  const own = s.state.fields[0],
    other = s.state.fields[1];
  s.cast("primary", "test", "Gale", vec(0, 0, 0));
  expect(own.travel).toBeDefined();
  expect(other.travel).toBeUndefined();
  s.actor.primaryReady = 0;
  s.cast("primary", "test", "Ember", vec(-7, 0, 0));
  const decoded = new WireReader().read(
    JSON.parse(
      JSON.stringify(encodeSnapshot(s.state, s.config, 1, false, true)),
    ),
    s.state,
  )!;
  expect(decoded.bolts).toEqual(s.state.bolts);
  expect(decoded.fields).toEqual(s.state.fields);
  const z = own.pos.z;
  step(s, 30);
  expect(own.pos.z).toBeLessThan(z - 0.8);
  expect(own.life).toBeLessThan(12);
  s.reset();
  expect(s.state.fields).toEqual([]);
  s.dispose();
});
