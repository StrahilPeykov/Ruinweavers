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
    hp: 100,
    hitAt: -10,
  };
  const s: any = { time: 1, events: [] };
  const truth = JSON.stringify({ e, s });
  performMage(root, e, s);
  expect(JSON.stringify({ e, s })).toBe(truth);
  s.time = 1.1;
  performMage(root, e, s);
  const moving = root.getObjectByName("thighL")!.rotation.x;
  expect(Math.abs(moving)).toBeGreaterThan(0.01);
  performMage(root, e, s);
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
