import { ScriptedPolicy } from "../../src/diagnostics/policies";
import { PRINCIPLES } from "../../src/experiments/config";
import { beforeAll, expect, it } from "vitest";
import { initPhysics } from "../../src/physics/world";
import { Simulation } from "../../src/simulation/simulation";
import { configFromQuery } from "../../src/experiments/config";
import { idleInput, vec } from "../../src/simulation/types";
beforeAll(initPhysics);
it("a Gale deflection without an entity hit is useful, not empty", () => {
  const s = new Simulation(configFromQuery("?scene=states"));
  s.state.activePrinciple = "Gale";
  s.state.aim = vec(-4, 0, 3);
  s.state.bolts.push({
    id: "incoming",
    source: "sentinel",
    principle: "hostile",
    pos: vec(-4, 0.75, 2),
    velocity: vec(0, 0, -7),
    life: 3,
    radius: 0.2,
  });
  s.cast("primary");
  expect(s.state.metrics.transformations.deflect).toBe(1);
  expect(s.state.events.some((e) => e.type === "empty")).toBe(false);
  s.dispose();
});

it("trial starts explicitly, advances independently and carries health", () => {
  const s = new Simulation(configFromQuery("?scene=trial"));
  const pos = { ...s.player.pos };
  s.step({ ...idleInput(), primary: true, moveX: 1 });
  expect(s.state.time).toBe(0);
  expect(s.player.pos).toEqual(pos);
  s.step({ ...idleInput(), interact: true });
  expect(s.state.trial?.status).toBe("active");
  s.damage(s.player, 17, "test", "setup");
  for (let stage = 0; stage < 3; stage++) {
    for (const e of s.state.entities.filter((e) => e.ai))
      s.damage(e, 10000, "mage-1", "test-clear");
    s.step(idleInput());
    expect(s.state.trial?.status).toBe(stage === 2 ? "victory" : "between");
    expect(s.player.hp).toBe(83);
    if (stage < 2) s.step({ ...idleInput(), interact: true });
  }
  expect(s.state.trial?.results).toHaveLength(3);
  s.advanceTrial();
  expect(s.state.trial?.status).toBe("active");
  expect(s.player.hp).toBe(100);
  s.dispose();
});
it("enemies own independent attack state and defeat does not stop siblings", () => {
  const s = new Simulation(
    configFromQuery("?scene=trial/ranged&scenario=open-near"),
  );
  s.advanceTrial();
  const enemies = s.state.entities.filter((e) => e.ai);
  expect(enemies[0].ai).not.toBe(enemies[1].ai);
  s.damage(enemies[0], 10000, "mage-1", "test");
  for (let i = 0; i < 180; i++) s.step(idleInput());
  expect(
    s.state.metrics.outcomes[`${enemies[1].id}:projectile:attempt`],
  ).toBeGreaterThan(0);
  expect(s.state.trial?.status).toBe("active");
  s.dispose();
});
it("pursuer closes distance, telegraphs and can damage a stationary player", () => {
  const s = new Simulation(
    configFromQuery("?scene=trial/pursuit&scenario=open-near"),
  );
  s.advanceTrial();
  let telegraph = false;
  for (let i = 0; i < 600 && s.player.hp > 0; i++) {
    s.step(idleInput());
    telegraph ||= s.state.entities.some(
      (e) => e.kind === "pursuer" && e.ai?.phase === "telegraph",
    );
  }
  expect(telegraph).toBe(true);
  expect(s.player.hp).toBeLessThan(100);
  expect(
    Object.values(s.state.metrics.damageRoutes).some(
      (r) => r.recipient === "mage-1" && r.reason === "melee strike",
    ),
  ).toBe(true);
  s.dispose();
});
it("damage routes keep collateral recipients distinct and death is restartable", () => {
  const s = new Simulation(configFromQuery("?scene=trial/mixed"));
  s.advanceTrial();
  const wood = s.state.entities.find((e) => e.kind === "wood")!,
    enemy = s.state.entities.find((e) => e.ai)!;
  s.damage(wood, 7, "mage-1", "heat bolt");
  s.damage(enemy, 9, "mage-1", "heat bolt");
  const routes = Object.values(s.state.metrics.damageRoutes);
  expect(routes.map((r) => r.recipient)).toEqual([wood.id, enemy.id]);
  s.damage(s.player, 100, "enemy-test", "strike");
  s.step(idleInput());
  expect(s.state.trial?.status).toBe("defeat");
  s.advanceTrial();
  expect(s.player.hp).toBe(100);
  expect(s.state.trial?.encounter).toBe(2);
  s.dispose();
});

it("melee wind-up is readable and cover blocks the strike", () => {
  for (const cover of [false, true]) {
    const s = new Simulation(
      configFromQuery("?scene=trial/pursuit&scenario=cross-cover"),
    );
    s.advanceTrial();
    const e = s.state.entities.find((e) => e.ai)!;
    for (const other of s.state.entities.filter((x) => x.ai))
      other.ai!.enabled = other === e;
    s.player.pos = vec(cover ? -1.55 : 1.45, 0.75, 0);
    e.pos = vec(cover ? -4.45 : 0, 0.55, 0);
    s.physics.teleport(s.player);
    s.physics.teleport(e);
    e.ai!.phase = "telegraph";
    e.ai!.timer = 0.65;
    e.ai!.locked = { ...s.player.pos };
    for (let i = 0; i < 12; i++) s.step(idleInput());
    expect(s.player.hp).toBe(100);
    for (let i = 0; i < 32; i++) s.step(idleInput());
    expect(s.player.hp).toBe(cover ? 100 : 88);
    s.dispose();
  }
});

it("restricted policies adapt without issuing excluded casts; seeded runs repeat", () => {
  const run = (excluded: any) => {
    const s = new Simulation(
      configFromQuery("?scene=trial/mixed&scenario=open-near"),
    );
    s.advanceTrial();
    const policy = new ScriptedPolicy(
      "state-aware",
      "delayed-aim",
      123,
      excluded,
    );
    for (let i = 0; i < 240; i++) s.step(policy.input(s));
    expect(
      Object.keys(s.state.metrics.casts).every(
        (k) => !k.startsWith(excluded + ":"),
      ),
    ).toBe(true);
    expect(Object.keys(s.state.metrics.casts).length).toBeGreaterThan(0);
    const result = JSON.stringify(s.state);
    s.dispose();
    return result;
  };
  for (const p of PRINCIPLES) run(p);
  expect(run("Gale")).toBe(run("Gale"));
});
