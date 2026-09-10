import { beforeAll, expect, it } from "vitest";
import { initPhysics } from "../../src/physics/world";
import { Simulation } from "../../src/simulation/simulation";
import { configFromQuery } from "../../src/experiments/config";
import { idleInput, vec } from "../../src/simulation/types";
import { ROOMS, bridgeAt } from "../../src/simulation/rooms";
import { RUN_ROOMS } from "../../src/simulation/rooms";
import { encodeSnapshot, WireReader } from "../../src/network/wire";
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
it("every fixed run beat selects its authored room while classic regression stays available", () => {
  const s = new Simulation(configFromQuery("?scene=run&seed=123"));
  const old = new Simulation(configFromQuery("?scene=run-classic&seed=123"));
  expect(old.state.roomId).toBeUndefined();
  for (let i = 0; i < 5; i++) {
    expect(s.state.roomId).toBe(RUN_ROOMS[i]);
    if (i < 4) {
      s.state.trial!.status = "between";
      s.advanceTrial();
    }
  }
  expect(s.state.guardian).toBeDefined();
  s.reset();
  expect(s.state.roomId).toBe("split");
  s.dispose();
  old.dispose();
});
it("room and pitched terrain are explicit in guest bootstrap and survive live snapshots", () => {
  const s = new Simulation(configFromQuery("?scene=trial/mixed&room=terrace"));
  s.addPartner();
  const r = new WireReader();
  const first = r.read(
    encodeSnapshot(s.state, s.config, 1, false, true),
    s.state,
  )!;
  expect(first.roomId).toBe("terrace");
  expect(first.terrain!.some((t) => !!t.pitch)).toBe(true);
  const live = r.read(
    encodeSnapshot(s.state, s.config, 2, false, false),
    first,
  )!;
  expect(live.roomId).toBe("terrace");
  s.dispose();
});
it("pursuers route around authored cover with body clearance, including the former timber pocket", () => {
  for (const room of ["split", "gallery", "yard"]) {
    const s = new Simulation(
      configFromQuery(`?scene=trial/pursuit&room=${room}`),
    );
    s.ready("mage-1");
    const r = ROOMS[room];
    s.player.pos = vec(r.width / 2 - 1.5, 0.75, r.depth / 2 - 1.5);
    s.player.hp = 100000;
    s.physics.teleport(s.player);
    const seen = new Set<string>();
    for (let tick = 0; tick < 1500; tick++) {
      s.step(idleInput());
      for (const e of s.state.entities.filter((e) => e.ai))
        if (
          Math.hypot(e.pos.x - s.player.pos.x, e.pos.z - s.player.pos.z) < 3.3
        )
          seen.add(e.id);
    }
    expect(seen.size, room).toBe(3);
    expect(s.state.metrics.falls).toBe(0);
    s.dispose();
  }
});
it("a baseline Stone approach to gallery cover loses its raised support when the field expires", () => {
  const s = new Simulation(
    configFromQuery("?scene=trial/pursuit&room=gallery"),
  );
  s.ready("mage-1");
  s.player.pos = vec(-3, 0.75, 2);
  s.player.hp = 10000;
  s.physics.teleport(s.player);
  s.cast("secondary", "test", "Stone", vec(-3, 0, -2));
  for (let t = 0; t < 150; t++) s.step({ ...idleInput(), moveZ: -1 });
  expect(s.player.pos.y).toBeGreaterThan(1.2);
  for (let t = 0; t < 660; t++) s.step(idleInput());
  expect(s.state.fields).toHaveLength(0);
  expect(s.player.pos.y).toBeLessThan(0.9);
  s.dispose();
});
