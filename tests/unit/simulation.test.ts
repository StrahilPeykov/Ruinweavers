import { beforeAll, describe, expect, it } from "vitest";
import { initPhysics } from "../../src/physics/world";
import { Simulation } from "../../src/simulation/simulation";
import { configFromQuery } from "../../src/experiments/config";
import { idleInput, vec } from "../../src/simulation/types";
beforeAll(initPhysics);
const make = () => new Simulation(configFromQuery("?scene=states"));
describe("material rules and simulation invariants", () => {
  it("traversal spawn is clear of ballast and the two-tier slab bridges the gap", () => {
    const s = new Simulation(configFromQuery("?scene=traversal"));
    for (let i = 0; i < 10; i++) s.step(idleInput());
    s.step({ ...idleInput(vec(9.5, 0, 0)), select: "Stone", secondary: true });
    for (let i = 0; i < 85; i++) s.step({ ...idleInput(), moveX: 1 });
    expect(s.player.pos.x).toBeGreaterThan(11);
    expect(s.state.metrics.falls).toBe(0);
    s.dispose();
  });
  it("slab cover blocks bolts from both directions and preserves open space above", () => {
    const s = make();
    s.state.fields.push({
      id: "cover",
      source: "mage-1",
      principle: "Stone",
      pos: vec(0, 0, 0),
      end: vec(),
      radius: 2.2,
      life: 12,
      nextPulse: 0,
    });
    s.physics.syncFields(s.state.fields);
    s.physics.world.step();
    expect(
      s.physics.terrainHit(vec(-4, 0.72, 0), vec(4, 0.72, 0)),
    ).not.toBeNull();
    expect(
      s.physics.terrainHit(vec(4, 0.8, 0), vec(-4, 0.8, 0)),
    ).not.toBeNull();
    expect(s.physics.terrainHit(vec(-4, 2, 0), vec(4, 2, 0))).toBeNull();
    s.dispose();
  });
  it("repeated reactions do not permanently suppress a sentinel telegraph", () => {
    const s = new Simulation(configFromQuery("?scene=combat"));
    const e = s.state.entities.find((e) => e.id === "sentinel")!;
    let fired = false;
    for (let i = 0; i < 300; i++) {
      s.stagger(e, 0.4);
      s.step(idleInput());
      if (s.state.bolts.some((b) => b.source === "sentinel")) fired = true;
    }
    expect(fired).toBe(true);
    s.dispose();
  });
  it("heat plus saturation transforms any wettable structure, with provenance", () => {
    const s = make(),
      e = s.state.entities.find((e) => e.id === "column")!;
    s.apply(e, { water: 0.8 }, "mage-2", "test");
    s.apply(e, { heat: 60 }, "mage-1", "test");
    expect(s.state.metrics.transformations.vaporize).toBe(1);
    expect(e.cohesion).toBeLessThan(0);
    expect(e.sources.wet).toBe("mage-2");
    expect(s.state.events.find((e) => e.type === "steam")?.source).toBe(
      "mage-1",
    );
    s.dispose();
  });
  it("flammability is a material property; cooling extinguishes", () => {
    const s = make(),
      e = s.state.entities.find((e) => e.id === "timber")!;
    s.apply(e, { heat: 100 }, "mage-1", "test");
    expect(e.burning).toBe(true);
    s.apply(e, { heat: -100 }, "mage-1", "test");
    expect(e.burning).toBe(false);
    s.dispose();
  });
  it("fracture increases force consequences; stabilization resists force", () => {
    const s = make(),
      e = s.state.entities.find((e) => e.id === "ballast")!;
    s.apply(e, { cohesion: -1 }, "mage-2", "test");
    s.apply(e, { force: vec(40, 0, 0) }, "mage-1", "test");
    expect(e.hp).toBeLessThan(100);
    expect(s.state.metrics.transformations["shatter impulse"]).toBe(1);
    s.dispose();
  });
  it("manifestation capacity is per actor; inverse actions share states", () => {
    const s = make();
    s.state.activePrinciple = "Tide";
    s.cast("secondary");
    s.state.time = 1;
    s.state.activePrinciple = "Stone";
    s.cast("secondary");
    expect(s.state.fields).toHaveLength(1);
    expect(s.state.fields[0].principle).toBe("Stone");
    s.config.model = "weave-unweave";
    s.state.time = 2;
    s.cast("secondary");
    expect(s.state.fields).toHaveLength(0);
    s.dispose();
  });
  it("fixed inputs replay identically and reset clears transient state", () => {
    const a = make(),
      b = make();
    for (let i = 0; i < 120; i++) {
      const f = {
        ...idleInput(vec(-5, 0, -5.5)),
        moveX: i < 60 ? 1 : 0,
        primary: true,
      };
      a.step(f);
      b.step(f);
    }
    expect(a.state).toEqual(b.state);
    expect(() => JSON.stringify(a.state)).not.toThrow();
    a.reset();
    expect(a.state.tick).toBe(0);
    expect(a.state.bolts).toHaveLength(0);
    a.dispose();
    b.dispose();
  });
  it("diagonal movement is normalized and dodge has a real recovery", () => {
    const s = make();
    const start = { ...s.player.pos };
    for (let i = 0; i < 30; i++) s.step({ ...idleInput(), moveX: 1, moveZ: 1 });
    const travelled = Math.hypot(
      s.player.pos.x - start.x,
      s.player.pos.z - start.z,
    );
    expect(travelled).toBeGreaterThan(s.config.moveSpeed * 0.5 * 0.95);
    expect(travelled).toBeLessThan(s.config.moveSpeed * 0.5 * 1.01);
    s.step({ ...idleInput(), dodge: true });
    s.step({ ...idleInput(), dodge: true });
    expect(s.state.metrics.dodges).toBe(1);
    s.dispose();
  });
});
