import { beforeAll, it, expect } from "vitest";
import { initPhysics } from "../../src/physics/world";
import { Simulation } from "../../src/simulation/simulation";
import { configFromQuery } from "../../src/experiments/config";
import { encodeSnapshot, WireReader } from "../../src/network/wire";
import { PresentationTimeline } from "../../src/network/presentation";
import { LocalPrediction } from "../../src/network/prediction";
import { idleInput, vec } from "../../src/simulation/types";
beforeAll(initPhysics);
it("cursor queries use presented bodies while terrain and authoritative colliders stay unchanged", () => {
  const host = setup(),
    guest = new Simulation(host.config);
  guest.acceptSnapshot(structuredClone(host.state));
  const target = guest.state.entities.find((e) => e.ai)!;
  const displayed = guest.state.entities.map((e) =>
    e.id === target.id ? { ...e, pos: vec(8, 0.8, -6) } : e,
  );
  const actual = { ...guest.physics.colliders.get(target.id)!.translation() };
  const hit = guest.physics.pick(
    vec(8, 10, -6),
    vec(0, -1, 0),
    "mage-2",
    displayed,
  );
  expect(hit.body).toBe(true);
  expect(hit.y).toBeGreaterThan(1);
  expect({ ...guest.physics.colliders.get(target.id)!.translation() }).toEqual(
    actual,
  );
  host.dispose();
  guest.dispose();
});
function setup() {
  const s = new Simulation(configFromQuery("?scene=trial"));
  s.addPartner();
  s.ready("mage-1");
  s.ready("mage-2");
  return s;
}
it("wire omits diagnostics/static repetition and reconstitutes live queries; events deduplicate across restart", () => {
  const s = setup(),
    r = new WireReader();
  s.state.metrics.damageRoutes.large = {
    source: "a",
    recipient: "b",
    reason: "x",
    amount: 2,
  };
  s.event("cast", "mage-1", vec());
  const initial = encodeSnapshot(s.state, s.config, 1, false, true);
  const a = r.read(initial, s.state)!;
  expect(a.entities).toEqual(s.state.entities);
  expect(a.metrics.damageRoutes).toEqual({});
  const packet = encodeSnapshot(s.state, s.config, 2, false, false);
  expect(JSON.stringify(packet)).not.toMatch(
    /damageRoutes|material|cameraDistance/,
  );
  const b = r.read(packet, a)!;
  expect(b.events).toEqual(a.events);
  expect(b.fields).toEqual(s.state.fields);
  s.reset();
  const next = encodeSnapshot(s.state, s.config, 3, false, false);
  expect(r.read(next, b)).toBeNull();
  const reset = r.read(encodeSnapshot(s.state, s.config, 4, false, true), b)!;
  expect(reset.events).toEqual(s.state.events);
  expect(reset.party!.epoch).toBe(s.state.party!.epoch);
  s.dispose();
});
it("timeline interpolates bounded poses, leaves local actor and truth intact, immediately handles lifecycle", () => {
  const sim = setup(),
    timeline = new PresentationTimeline();
  const a = structuredClone(sim.state);
  a.time = 1;
  a.tick = 60;
  const b = structuredClone(a);
  b.time = 1.1;
  b.tick = 66;
  b.entities[0].pos.x += 1;
  timeline.push(a, 1, 1000, false);
  timeline.push(b, 2, 1100, false);
  const before = JSON.stringify(b);
  const view = timeline.sample(b, "mage-2", 1100);
  expect(view.entities[0].pos.x).toBeGreaterThan(a.entities[0].pos.x);
  expect(view.entities[0].pos.x).toBeLessThan(b.entities[0].pos.x);
  expect(view.entities.find((e) => e.id === "mage-2")!.pos).toEqual(
    b.entities.find((e) => e.id === "mage-2")!.pos,
  );
  expect(JSON.stringify(b)).toBe(before);
  const end = timeline.sample(b, "mage-2", 3000);
  expect(end.entities[0].pos.x).toBeLessThanOrEqual(b.entities[0].pos.x);
  const dead = structuredClone(b);
  dead.entities[0].hp = 0;
  timeline.push(dead, 3, 1200, false);
  expect(timeline.entityReset.get(dead.entities[0].id)).toBe(3);
  expect(timeline.sample(dead, "mage-2", 1200).entities[0].hp).toBe(0);
  const teleported = structuredClone(b);
  teleported.entities[0].pos.x += 9;
  timeline.push(teleported, 4, 1300, false);
  expect(timeline.entityReset.get(teleported.entities[0].id)).toBe(4);
  timeline.push(teleported, 5, 1400, true);
  expect(timeline.sample(teleported, "mage-2", 1600)).toBe(teleported);
  sim.dispose();
});
it("prediction advances only a local query pose, replays only unacknowledged input and respects collision", () => {
  const host = setup(),
    guest = new Simulation(host.config);
  guest.acceptSnapshot(structuredClone(host.state));
  const p = new LocalPrediction(),
    id = "mage-2",
    original = JSON.stringify(guest.state),
    start = { ...guest.players[1].pos };
  for (let i = 1; i <= 10; i++)
    p.capture(
      i,
      { ...idleInput(), moveX: 1 },
      i * 17,
      guest.state,
      id,
      guest.config,
      guest.physics,
    );
  expect(p.pos!.x).toBeGreaterThan(start.x);
  expect(JSON.stringify(guest.state)).toBe(original);
  expect(guest.physics.colliders.get(id)!.translation().x).toBeCloseTo(
    start.x,
    4,
  );
  p.reconcile(10, guest.state, id, guest.config, guest.physics, 170);
  expect(p.history).toHaveLength(0);
  expect(p.pos).toEqual(start);
  for (let i = 0; i < 80; i++)
    p.capture(
      i + 20,
      { ...idleInput(), moveX: 1 },
      200 + i * 17,
      guest.state,
      id,
      guest.config,
      guest.physics,
    );
  expect(p.history.length).toBeLessThanOrEqual(32);
  expect(p.dropped).toBeGreaterThan(0);
  expect(p.pos!.x).toBeLessThan(15);
  const frozen = { ...p.pos! };
  p.capture(
    200,
    { ...idleInput(), moveX: 1 },
    3000,
    guest.state,
    id,
    guest.config,
    guest.physics,
  );
  expect(p.pos).toEqual(frozen);
  let walk = { pos: start, verticalSpeed: 0 };
  for (let i = 0; i < 300; i++)
    walk = guest.physics.previewMove(
      id,
      walk.pos,
      vec(5.6 / 60, 0, 0),
      walk.verticalSpeed,
      1 / 60,
    );
  expect(walk.pos.x).toBeLessThan(11.65); // Inner wall x=12, minus capsule and skin.
  expect(walk.pos.x).toBeGreaterThan(10);
  expect(JSON.stringify(guest.state)).toBe(original);
  p.reset();
  expect(p.pos).toBeUndefined();
  expect(p.history).toHaveLength(0);
  host.dispose();
  guest.dispose();
});
