import { test, expect } from "vitest";
import { Object3D } from "three";
import { performMage } from "../../src/render/performance";
test("articulation is bounded, pause-stable and never changes authoritative state", () => {
  const root = new Object3D();
  for (const name of [
    "hips",
    "chest",
    "head",
    "cape",
    "thighL",
    "thighR",
    "shinL",
    "shinR",
    "upperL",
    "upperR",
    "foreL",
    "foreR",
  ]) {
    const j = new Object3D();
    j.name = name;
    root.add(j);
  }
  const e: any = {
    id: "mage-2",
    velocity: { x: 3, y: 0, z: 4 },
    pos: { x: 0, y: 0.7, z: 0 },
    hp: 100,
    hitAt: -10,
  };
  const s: any = { time: 1, events: [] };
  const truth = JSON.stringify({ e, s });
  performMage(root, e, s);
  expect(JSON.stringify({ e, s })).toBe(truth);
  s.time = 1.1;
  e.pos.x += 0.15;
  e.pos.z += 0.2;
  performMage(root, e, s, 0.05);
  const moving = root.getObjectByName("thighL")!.rotation.x;
  expect(Math.abs(moving)).toBeGreaterThan(0.01);
  performMage(root, e, s, 0.016, true);
  expect(root.getObjectByName("thighL")!.rotation.x).toBe(moving);
  s.events = [{ source: "mage-1", type: "cast", time: 1.1 }];
  performMage(root, e, s);
  expect(root.userData.pose.castAge).toBe(99);
  s.events.push({ source: "mage-2", type: "cast", time: 1.1 });
  performMage(root, e, s);
  expect(root.getObjectByName("upperR")!.rotation.x).toBeLessThan(-1);
  s.time = 2;
  e.hp = 0;
  const downTruth = JSON.stringify({ e, s });
  performMage(root, e, s);
  expect(root.userData.pose.downed).toBe(true);
  expect(root.getObjectByName("hips")!.position.y).toBeGreaterThan(-0.5);
  expect(JSON.stringify({ e, s })).toBe(downTruth);
});

test("rendered displacement animates between unchanged snapshots; corrections and gaps do not stride", () => {
  const model = new Object3D();
  for (const name of [
    "hips",
    "chest",
    "head",
    "cape",
    "thighL",
    "thighR",
    "shinL",
    "shinR",
    "upperL",
    "upperR",
    "foreL",
    "foreR",
  ]) {
    const j = new Object3D();
    j.name = name;
    model.add(j);
  }
  const state: any = { time: 1, tick: 60, party: { epoch: 1 }, events: [] };
  const e: any = {
    id: "mage-2",
    pos: { x: 0, y: 0.7, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    hp: 100,
    hitAt: -10,
  };
  performMage(model, e, state, 0.016);
  const truth = JSON.stringify(state);
  e.pos.z = 0.05;
  performMage(model, e, state, 0.016);
  const first = model.userData.pose.stride;
  e.pos.z = 0.1;
  performMage(model, e, state, 0.016);
  expect(model.userData.pose.stride).not.toBe(first);
  expect(JSON.stringify(state)).toBe(truth);
  expect(e.velocity.z).toBe(0);
  e.pos.z = 8;
  performMage(model, e, state, 0.016);
  expect(model.userData.pose.stride).toBe(0);
  model.userData.gait = Math.PI / 2;
  e.pos.z += 0.2;
  performMage(model, e, state, 0.001);
  expect(
    Math.abs(model.getObjectByName("thighL")!.rotation.x),
  ).toBeLessThanOrEqual(0.65);
  expect(
    Math.abs(model.getObjectByName("thighL")!.rotation.z),
  ).toBeLessThanOrEqual(0.42);
  e.pos.z = 9;
  performMage(model, e, state, 1);
  expect(model.userData.pose.stride).toBe(0);
  e.hp = 0;
  performMage(model, e, state, 0.016);
  expect(model.userData.pose.downed).toBe(true);
  e.hp = 35;
  performMage(model, e, state, 0.016);
  expect(model.userData.pose.stride).toBe(0);
});
