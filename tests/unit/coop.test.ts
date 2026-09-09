import { beforeAll, it, expect } from "vitest";
import { Simulation } from "../../src/simulation/simulation";
import { initPhysics } from "../../src/physics/world";
import { configFromQuery } from "../../src/experiments/config";
import { idleInput, vec } from "../../src/simulation/types";
import { localCastFeedback } from "../../src/ui/cast-feedback";
beforeAll(initPhysics);
const setup = () => {
  const s = new Simulation(
    configFromQuery("?scene=trial/mixed&scenario=open-near"),
  );
  s.addPartner();
  s.ready("mage-1");
  s.ready("mage-2");
  return s;
};
it("buffer and rejection feedback belong to each actor, including simultaneous failures", () => {
  const s = setup();
  s.state.actors["mage-2"].secondaryReady = s.state.time + 0.1;
  s.withActor("mage-2", () => s.secondaryPress("keyboard-fallback"));
  expect(localCastFeedback(s.state, "mage-2")).toBe("Secondary buffered");
  expect(localCastFeedback(s.state, "mage-1")).toBeUndefined();
  s.withActor("mage-1", () => s.reject("Recovering"));
  expect(localCastFeedback(s.state, "mage-2")).toBe("Secondary buffered");
  s.withActor("mage-2", () => s.reject("Out of range"));
  expect(localCastFeedback(s.state, "mage-1")).toBe("Recovering");
  expect(localCastFeedback(s.state, "mage-2")).toBe("Out of range");
  expect(s.state.events.filter((e) => e.type === "rejected")).toHaveLength(2);
  s.dispose();
});
it("actors independently move, cast, dodge, select and replace only their fields", () => {
  const s = setup();
  s.stepParty({
    "mage-1": {
      ...idleInput(vec(-3, 0, 3)),
      select: "Tide",
      secondary: true,
      moveX: -1,
    },
    "mage-2": {
      ...idleInput(vec(3, 0, 3)),
      select: "Stone",
      secondary: true,
      moveX: 1,
    },
  });
  expect(s.state.fields.map((f) => f.source)).toEqual(["mage-1", "mage-2"]);
  const other = s.state.fields[1].id;
  for (let i = 0; i < 40; i++) s.stepParty({});
  s.stepParty({
    "mage-1": {
      ...idleInput(vec(-3, 0, 3)),
      select: "Gale",
      secondary: true,
      dodge: false,
    },
    "mage-2": { ...idleInput(), dodge: true, moveX: 1 },
  });
  expect(s.state.fields.some((f) => f.id === other)).toBe(true);
  expect(s.state.fields).toHaveLength(2);
  expect(s.state.actors["mage-1"].dodgeReady).toBe(0);
  expect(s.state.actors["mage-2"].dodgeReady).toBeGreaterThan(s.state.time);
  expect(s.state.actors["mage-1"].activePrinciple).toBe("Gale");
  expect(s.state.actors["mage-2"].activePrinciple).toBe("Stone");
  s.dispose();
});
it("cross-player prime/transform has provenance, no allied damage and per-recipient invulnerability", () => {
  const s = setup(),
    p = s.players[1],
    enemy = s.state.entities.find((e) => e.ai)!;
  s.apply(enemy, { water: 1 }, "mage-1", "prime");
  s.apply(enemy, { heat: 80 }, "mage-2", "heat");
  expect(s.state.metrics.transformations.vaporize).toBe(1);
  expect(enemy.sources.wet).toBe("mage-1");
  expect(s.state.events.find((e) => e.type === "steam")?.source).toBe("mage-2");
  s.damage(p, 20, "mage-1", "heat bolt");
  expect(p.hp).toBe(100);
  s.state.actors["mage-1"].invulnerableUntil = 10;
  s.damage(p, 12, "enemy", "strike");
  expect(p.hp).toBe(88);
  s.damage(s.players[0], 12, "enemy", "strike");
  expect(s.players[0].hp).toBe(100);
  s.dispose();
});
it("downed partners revive, clears restore them, both-down defeats and restart needs both ready", () => {
  const s = setup();
  s.players[0].pos = vec(0, 0.75, 5);
  s.players[1].pos = vec(1, 0.75, 5);
  s.players.forEach((p) => s.physics.teleport(p));
  s.damage(s.players[1], 100, "enemy", "strike");
  for (const e of s.state.entities.filter((e) => e.ai)) e.ai!.enabled = false;
  for (let i = 0; i < 74; i++)
    s.stepParty({ "mage-1": { ...idleInput(), revive: true } });
  expect(s.players[1].hp).toBe(35);
  s.state.actors["mage-2"].invulnerableUntil = 0;
  s.damage(s.players[1], 35, "enemy", "strike");
  for (const e of s.state.entities.filter((e) => e.ai))
    s.damage(e, 1000, "mage-1", "test");
  s.stepParty({});
  expect(s.players[1].hp).toBe(35);
  expect(s.state.trial?.status).toBe("victory");
  s.ready("mage-1");
  expect(s.state.trial?.status).toBe("victory");
  s.ready("mage-2");
  expect(s.state.trial?.status).toBe("active");
  s.players.forEach((p) => s.damage(p, 1000, "enemy", "strike"));
  s.stepParty({});
  expect(s.state.trial?.status).toBe("defeat");
  s.dispose();
});
it("enemies acquire the nearest living actor and retarget a downed actor", () => {
  const s = setup(),
    enemy = s.state.entities.find((e) => e.ai)!;
  s.players[1].pos = vec(enemy.pos.x + 1, 0.75, enemy.pos.z);
  s.physics.teleport(s.players[1]);
  s.stepParty({});
  expect(enemy.ai!.targetId).toBe("mage-2");
  s.damage(s.players[1], 100, "enemy", "strike");
  s.stepParty({});
  expect(enemy.ai!.targetId).toBe("mage-1");
  s.dispose();
});

it("vertical state and query-only replica remain separate from the host", () => {
  const s = setup();
  s.players[0].pos = vec(-2, 4, 5);
  s.players[1].pos = vec(2, 0.75, 5);
  s.players.forEach((p) => s.physics.teleport(p));
  for (let i = 0; i < 12; i++) s.stepParty({});
  expect(s.state.actors["mage-1"].verticalSpeed).toBeLessThan(0);
  expect(s.state.actors["mage-2"].verticalSpeed).not.toBe(
    s.state.actors["mage-1"].verticalSpeed,
  );
  const replica = new Simulation(configFromQuery("?scene=trial"));
  replica.acceptSnapshot(structuredClone(s.state));
  expect(replica.state.tick).toBe(s.state.tick);
  expect(() => replica.stepParty({})).toThrow();
  expect(replica.state.tick).toBe(s.state.tick);
  replica.dispose();
  s.dispose();
});

it("the shown melee strike can hit both players with distinct damage recipients", () => {
  const s = setup(),
    enemy = s.state.entities.find((e) => e.kind === "pursuer")!;
  for (const e of s.state.entities.filter((e) => e.ai)) e.ai!.enabled = false;
  enemy.pos = vec(0, 0.55, 0);
  s.physics.teleport(enemy);
  s.players[0].pos = vec(-0.5, 0.75, 1);
  s.players[1].pos = vec(0.5, 0.75, 1);
  s.players.forEach((p) => s.physics.teleport(p));
  Object.assign(enemy.ai!, {
    enabled: true,
    phase: "telegraph",
    timer: 0,
    locked: vec(0, 0.75, 1),
    targetId: "mage-1",
  });
  s.tickEnemies(1 / 60);
  expect(s.players.map((p) => p.hp)).toEqual([88, 88]);
  expect(
    Object.values(s.state.metrics.damageRoutes)
      .filter((r) => r.reason === "melee strike")
      .map((r) => r.recipient)
      .sort(),
  ).toEqual(["mage-1", "mage-2"]);
  s.dispose();
});
