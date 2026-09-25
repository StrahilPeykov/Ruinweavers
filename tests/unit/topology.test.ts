import { beforeAll, expect, it } from "vitest";
import { initPhysics } from "../../src/physics/world";
import { Simulation } from "../../src/simulation/simulation";
import { configFromQuery } from "../../src/experiments/config";
import {
  currentNode,
  generateRoute,
  ORDINARY_ROOMS,
  STAGES,
} from "../../src/simulation/topology";
import {
  captureCheckpoint,
  restoreCheckpoint,
} from "../../src/simulation/checkpoint";
import { idleInput } from "../../src/simulation/types";
import { encodeSnapshot, WireReader } from "../../src/network/wire";
beforeAll(initPhysics);
const make = (pair = false) => {
  const s = new Simulation(configFromQuery("?scene=run&seed=123"));
  if (pair) s.addPartner();
  return s;
};
const clear = (s: Simulation) => {
  for (const e of s.state.entities) if (e.ai) e.hp = 0;
  s.step(idleInput());
};
const ready = (s: Simulation) => {
  for (const p of s.players) s.ready(p.id);
};
const choose = (s: Simulation) => {
  const r = s.state.run!;
  for (const p of s.players)
    if (r.reward && !r.reward.choices[p.id])
      expect(
        s.chooseUpgrade(p.id, r.id, r.reward.id, r.reward.offers[p.id][0]),
      ).toBe(true);
};
const vote = (s: Simulation, actor: string, option = 0) => {
  const r = s.state.run!,
    d = r.route!.decision!;
  return s.voteRoute(actor, r.id, d.id, r.route!.boundary, d.options[option]);
};

it("seeded binary routes contain four distinct authored ordinary rooms and one Warden on every path", () => {
  const seen = new Set<string>();
  for (let seed = 0; seed < 500; seed++) {
    const r = generateRoute(seed);
    expect(r).toEqual(generateRoute(seed));
    expect(r.nodes).toHaveLength(16);
    const walk = (id: string, rooms: string[]) => {
      const n = r.nodes.find((n) => n.id === id)!;
      expect(rooms).not.toContain(n.room);
      seen.add(n.room);
      if (!n.next.length) {
        expect(n.room).toBe("warden");
        expect(rooms).toHaveLength(4);
      } else for (const next of n.next) walk(next, [...rooms, n.room]);
    };
    walk("entry", []);
  }
  expect([...seen].sort()).toEqual([...ORDINARY_ROOMS, "warden"].sort());
});
it("personal choices precede shared agreement; changed votes, stale and duplicate controls are safe", () => {
  const s = make(true);
  ready(s);
  clear(s);
  expect(vote(s, "mage-1")).toBe(false);
  choose(s);
  expect(vote(s, "intruder")).toBe(false);
  expect(vote(s, "mage-1")).toBe(true);
  expect(vote(s, "mage-2", 1)).toBe(true);
  ready(s);
  expect(s.state.trial!.status).toBe("between");
  expect(s.state.party!.ready).toEqual([]);
  const old = structuredClone(s.state.run!);
  expect(vote(s, "mage-1", 1)).toBe(true);
  expect(vote(s, "mage-2", 1)).toBe(false);
  ready(s);
  expect(s.state.trial!.status).toBe("active");
  expect(s.state.roomId).toBe(
    old.route!.nodes.find((n) => n.id === old.route!.decision!.options[1])!
      .room,
  );
  expect(
    s.voteRoute(
      "mage-2",
      old.id,
      old.route!.decision!.id,
      old.route!.boundary,
      old.route!.decision!.options[0],
    ),
  ).toBe(false);
  clear(s);
  expect(
    s.voteRoute(
      "mage-2",
      old.id,
      old.route!.decision!.id,
      old.route!.boundary,
      old.route!.decision!.options[0],
    ),
  ).toBe(false);
  s.dispose();
});
it("different paths retain exactly three rewards, personal builds, Guardian and same-seed replay", () => {
  for (const routeChoice of [0, 1]) {
    const s = make(true),
      initial = structuredClone(s.state.run!.route);
    ready(s);
    let rewards = 0;
    const visited: string[] = [];
    for (let stage = 0; stage < 5; stage++) {
      expect(currentNode(s.state)!.stage).toBe(stage);
      visited.push(s.state.roomId!);
      clear(s);
      if (stage === 4) break;
      if (s.state.run!.reward) {
        rewards++;
        choose(s);
      }
      if (!s.state.run!.route!.decision!.selected) {
        vote(s, "mage-1", routeChoice);
        vote(s, "mage-2", routeChoice);
      }
      ready(s);
    }
    expect(rewards).toBe(3);
    expect(new Set(visited).size).toBe(5);
    expect(s.state.trial!.status).toBe("victory");
    expect(s.state.run!.upgrades["mage-2"]).toHaveLength(3);
    s.restartRun(s.state.run!.id, s.state.seed);
    expect(s.state.run!.route).toEqual(initial);
    expect(s.state.run!.upgrades["mage-1"]).toEqual([]);
    s.dispose();
  }
});
it("safe checkpoints round-trip solo and co-op without transient physics, votes or readiness", () => {
  for (const pair of [false, true]) {
    const s = make(pair);
    const roundtrip = () => {
      const c = JSON.parse(JSON.stringify(captureCheckpoint(s.state)));
      const restored = restoreCheckpoint(c, s.config, {
        runId: c.runId,
        boundary: c.boundary,
      });
      expect(restored.state.run!.upgrades).toEqual(s.state.run!.upgrades);
      expect(restored.state.run!.reward).toEqual(s.state.run!.reward);
      expect(restored.state.run!.route!.visited).toEqual(
        s.state.run!.route!.visited,
      );
      expect(restored.state.seed).toBe(s.state.seed);
      expect(restored.players.map((p) => p.hp)).toEqual(
        s.players.map((p) => p.hp),
      );
      expect(restored.state.fields).toEqual([]);
      expect(restored.state.bolts).toEqual([]);
      expect(restored.state.pending).toEqual([]);
      expect(restored.state.events).toEqual([]);
      expect(restored.state.time).toBe(0);
      expect(restored.state.party?.ready ?? []).toEqual([]);
      expect(restored.state.run!.route!.boundary).toBeGreaterThan(c.boundary);
      expect(restored.state.run!.route!.decision?.votes ?? {}).toEqual({});
      return restored;
    };
    roundtrip().dispose();
    ready(s);
    s.player.hp = 63;
    expect(() => captureCheckpoint(s.state)).toThrow("safe");
    clear(s);
    expect(captureCheckpoint(s.state).phase).toBe("REWARD_PENDING");
    roundtrip().dispose();
    if (pair) {
      const r = s.state.run!;
      s.chooseUpgrade(
        "mage-1",
        r.id,
        r.reward!.id,
        r.reward!.offers["mage-1"][0],
      );
      roundtrip().dispose();
    }
    choose(s);
    expect(captureCheckpoint(s.state).phase).toBe("REWARD_COMPLETE");
    roundtrip().dispose();
    for (const p of s.players) vote(s, p.id);
    expect(captureCheckpoint(s.state).phase).toBe("NEXT_ENCOUNTER_READY");
    const restored = roundtrip();
    ready(restored);
    expect(restored.state.trial!.status).toBe("active");
    expect(restored.state.roomId).not.toBe("split");
    restored.dispose();
    ready(s);
    clear(s);
    expect(captureCheckpoint(s.state).phase).toBe("ROUTE_PENDING");
    roundtrip().dispose();
    s.dispose();
  }
});
it("checkpoint rejects stale/wrong-run/schema, forged path, HP, offers and mismatched phases", () => {
  const s = make();
  ready(s);
  clear(s);
  const c = captureCheckpoint(s.state);
  for (const patch of [
    { schema: 2 },
    { routeVersion: 99 },
    { runId: "other" },
    { boundary: 99 },
    { visited: ["entry", "ward"] },
    { phase: "ENCOUNTER_READY" },
    { actors: [{ id: "mage-1", hp: 999, upgrades: [] }] },
    { reward: { ...c.reward, offers: { "mage-1": ["break-seal"] } } },
  ]) {
    expect(() =>
      restoreCheckpoint({ ...c, ...patch } as any, s.config, {
        runId: c.runId,
        boundary: c.boundary,
      }),
    ).toThrow();
  }
  s.dispose();
});
it("explicit wire state carries host graph, personal rewards and shared votes across JSON", () => {
  const s = make(true);
  ready(s);
  clear(s);
  choose(s);
  vote(s, "mage-1");
  const p = JSON.parse(
    JSON.stringify(encodeSnapshot(s.state, s.config, 1, false, true)),
  );
  const state = new WireReader().read(p, s.state)!;
  expect(state.run).toEqual(s.state.run);
  expect(state.run!.route!.nodes[currentNode(state)!.stage].room).toBe("split");
  expect(STAGES.filter((s) => s.reward)).toHaveLength(3);
  s.dispose();
});

it("final safe boundary rebuilds the Warden with carried personal builds and no stale fields", () => {
  const s = make(true);
  ready(s);
  for (let stage = 0; stage < 4; stage++) {
    if (stage === 2) s.players[1].hp = 0;
    clear(s);
    if (stage === 3) {
      // The fixed Warden destination is already known while personal rewards wait.
      // This is a legitimate pending checkpoint, not an early fork agreement.
      const pending = captureCheckpoint(s.state);
      expect(pending.phase).toBe("REWARD_PENDING");
      expect(pending.next).toBe("ward");
      const recovered = restoreCheckpoint(
        JSON.parse(JSON.stringify(pending)), s.config,
        { runId: pending.runId, boundary: pending.boundary },
      );
      expect(recovered.state.run!.reward).toEqual(s.state.run!.reward);
      ready(recovered);
      expect(recovered.state.trial!.status).toBe("between");
      choose(recovered);
      ready(recovered);
      expect(recovered.state.roomId).toBe("warden");
      recovered.dispose();
    }
    choose(s);
    if (!s.state.run!.route!.decision!.selected)
      for (const p of s.players) vote(s, p.id, 1);
    if (stage < 3) ready(s);
  }
  s.state.fields.push({ id: "discard-me" } as any);
  const c = captureCheckpoint(s.state);
  expect(c.phase).toBe("NEXT_ENCOUNTER_READY");
  const restored = restoreCheckpoint(JSON.parse(JSON.stringify(c)), s.config, {
    runId: c.runId,
    boundary: c.boundary,
  });
  expect(
    restored.state.entities.filter((e) => e.ai).every((e) => e.hp === 0),
  ).toBe(true);
  ready(restored);
  expect(restored.state.roomId).toBe("warden");
  expect(restored.state.guardian).toBeDefined();
  expect(restored.state.fields).toEqual([]);
  expect(restored.players[1].hp).toBe(35);
  expect(restored.state.run!.upgrades).toEqual(s.state.run!.upgrades);
  expect(
    restored.state.entities.find((e) => e.kind === "warden")!.hp,
  ).toBeGreaterThan(0);
  s.dispose();
  restored.dispose();
});
