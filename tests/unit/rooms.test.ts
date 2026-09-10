import { beforeAll, expect, it } from "vitest";
import { initPhysics } from "../../src/physics/world";
import { Simulation } from "../../src/simulation/simulation";
import { configFromQuery } from "../../src/experiments/config";
import { idleInput, vec } from "../../src/simulation/types";
import { ROOMS, bridgeAt } from "../../src/simulation/rooms";
beforeAll(initPhysics);
it("a pursuer on the low terrace keeps approaching a living player", () => {
  const s = new Simulation(
    configFromQuery("?scene=trial/pursuit&room=terrace"),
  );
  s.ready("mage-1");
  const e = s.state.entities.find((e) => e.kind === "pursuer")!;
  s.player.pos = vec(-8, 0.75, 6);
  s.physics.teleport(s.player);
  const start = { ...e.pos };
  for (let i = 0; i < 180; i++) s.step(idleInput());
  expect(e.pos.z - start.z).toBeGreaterThan(2);
  expect(e.hp).toBeGreaterThan(0);
  s.dispose();
});
it("authored bridge placement never leaks the Lab gap into other rooms", () => {
  expect(bridgeAt("broken", vec(0, 0, 0))).toBe(true);
  expect(bridgeAt("split", vec(9, 0, 0))).toBe(false);
  expect(bridgeAt(undefined, vec(9, 0, 0), true)).toBe(true);
  expect(Object.keys(ROOMS)).toHaveLength(8);
});
