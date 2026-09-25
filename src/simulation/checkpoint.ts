// Local contract only. No browser import endpoint, transport, storage or recovery service.
import { Simulation } from "./simulation";
import { prepareEncounter } from "./trial";
import { Physics } from "../physics/world";
import type { Config } from "../experiments/config";
import type { State } from "./types";
import {
  offerRewards,
  rewardsChosen,
  UPGRADES,
  type Reward,
  type UpgradeId,
} from "./run";
import {
  currentNode,
  generateRoute,
  openRoute,
  ROUTE_VERSION,
  STAGES,
} from "./topology";

export type SafePhase =
  | "ENCOUNTER_READY"
  | "REWARD_PENDING"
  | "REWARD_COMPLETE"
  | "ROUTE_PENDING"
  | "NEXT_ENCOUNTER_READY";
export interface RunCheckpoint {
  schema: 1;
  runId: string;
  seed: number;
  routeVersion: number;
  boundary: number;
  phase: SafePhase;
  visited: string[];
  next?: string;
  reward?: Reward;
  actors: { id: string; hp: number; upgrades: UpgradeId[] }[];
}
export function safePhase(s: State): SafePhase | undefined {
  if (!s.run?.route) return;
  if (s.trial?.status === "ready") return "ENCOUNTER_READY";
  if (s.trial?.status !== "between") return;
  if (!rewardsChosen(s)) return "REWARD_PENDING";
  if (s.run.route.decision?.selected) return "NEXT_ENCOUNTER_READY";
  return s.run.reward ? "REWARD_COMPLETE" : "ROUTE_PENDING";
}
export function captureCheckpoint(s: State): RunCheckpoint {
  const phase = safePhase(s);
  if (!phase) throw Error("Checkpoint requires a safe topology boundary");
  const run = s.run!,
    route = run.route!;
  return structuredClone({
    schema: 1,
    runId: run.id,
    seed: s.seed,
    routeVersion: route.version,
    boundary: route.boundary,
    phase,
    visited: route.visited,
    next: route.decision?.selected,
    reward: run.reward,
    actors: Object.keys(s.actors)
      .sort()
      .map((id) => ({
        id,
        hp: s.entities.find((e) => e.id === id)!.hp,
        upgrades: run.upgrades[id],
      })),
  });
}
// A future coordinator must provide the expected run and exact stored boundary.
// Config is trusted host session configuration, not client-supplied checkpoint data.
export function restoreCheckpoint(
  data: RunCheckpoint,
  config: Config,
  expected: { runId: string; boundary: number },
): Simulation {
  const c = structuredClone(data);
  if (
    c.schema !== 1 ||
    c.routeVersion !== ROUTE_VERSION ||
    c.runId !== expected.runId ||
    c.boundary !== expected.boundary ||
    !Number.isSafeInteger(c.boundary) ||
    c.boundary < 0 ||
    !Number.isSafeInteger(c.seed) ||
    c.seed < 0 ||
    c.seed > 0xffffffff ||
    !Array.isArray(c.actors) ||
    ![1, 2].includes(c.actors.length) ||
    !Array.isArray(c.visited) ||
    c.visited.length < 1 ||
    c.visited.length > 5
  )
    throw Error("Incompatible or stale checkpoint");
  const route = generateRoute(c.seed);
  for (let i = 0; i < c.visited.length; i++) {
    const node = route.nodes.find((n) => n.id === c.visited[i]);
    const prev = route.nodes.find((n) => n.id === c.visited[i - 1]);
    if (
      !node ||
      node.stage !== i ||
      (i === 0 ? node.id !== "entry" : !prev?.next.includes(node.id))
    )
      throw Error("Invalid checkpoint path");
  }
  const node = route.nodes.find((n) => n.id === c.visited.at(-1))!;
  const ready = c.phase === "ENCOUNTER_READY";
  if (c.next && !node.next.includes(c.next)) throw Error("Invalid next room");
  const rewardCount = STAGES.slice(0, node.stage).filter(
    (x) => x.reward,
  ).length;
  c.actors.forEach((actor, i) => {
    const currentPick = !!c.reward?.choices[actor.id];
    if (
      actor.id !== `mage-${i + 1}` ||
      !Number.isFinite(actor.hp) ||
      actor.hp <= 0 ||
      actor.hp > 100 ||
      !Array.isArray(actor.upgrades) ||
      new Set(actor.upgrades).size !== actor.upgrades.length ||
      actor.upgrades.some((id) => !UPGRADES[id]) ||
      actor.upgrades.length !== rewardCount + Number(currentPick) ||
      actor.upgrades.some(
        (id) =>
          UPGRADES[id].requires.length &&
          !UPGRADES[id].requires.some((k) => actor.upgrades.includes(k)),
      )
    )
      throw Error("Invalid carried actor state");
  });
  const sim = new Simulation({
    ...config,
    scene: "run",
    room: undefined,
    seed: c.seed,
  });
  try {
    if (c.actors.length === 2) sim.addPartner();
    const s = sim.state;
    route.visited = [...c.visited];
    route.boundary = c.boundary;
    s.run = {
      id: c.runId,
      route,
      upgrades: Object.fromEntries(
        c.actors.map((a) => [a.id, [...a.upgrades]]),
      ),
    };
    // Keep a future reset's identity different from the restored attempt.
    sim.runGeneration = Math.max(
      sim.runGeneration,
      Number(c.runId.split(":").at(-1)) || 0,
    );
    s.trial!.encounter = node.stage;
    s.trial!.status = ready ? "ready" : "between";
    if (!ready) {
      if (node.stage === 4)
        throw Error("No post-victory checkpoint in this contract");
      // Regenerate current offers from the carried pre-choice build, then replay choices.
      for (const a of c.actors)
        if (c.reward?.choices[a.id]) s.run.upgrades[a.id].pop();
      offerRewards(s);
      if (
        JSON.stringify(s.run.reward?.offers) !==
          JSON.stringify(c.reward?.offers) ||
        s.run.reward?.id !== c.reward?.id ||
        s.run.reward?.encounter !== c.reward?.encounter
      )
        throw Error("Checkpoint reward does not match deterministic offers");
      for (const a of c.actors) {
        const choice = c.reward?.choices[a.id];
        if (
          choice &&
          (choice !== a.upgrades.at(-1) ||
            !sim.chooseUpgrade(a.id, c.runId, c.reward!.id, choice))
        )
          throw Error("Invalid checkpoint choice");
      }
      openRoute(s);
      // The sole Warden destination is known even while its personal reward waits.
      // A genuine multi-option fork still requires completed rewards before agreement.
      if (c.next && node.next.length > 1 && !rewardsChosen(s))
        throw Error("Selection before rewards complete");
      if (c.next) route.decision!.selected = c.next;
    } else if (c.reward || c.next)
      throw Error("Ready checkpoint contains transition state");
    if (safePhase(s) !== c.phase) throw Error("Checkpoint phase mismatch");
    // New boundary incarnation invalidates pre-restore votes/readiness. No votes persist.
    if (ready) route.boundary++;
    if (s.party) {
      s.party.ready = [];
      s.party.epoch = route.boundary + 1;
    }
    for (const a of c.actors) s.entities.find((e) => e.id === a.id)!.hp = a.hp;
    prepareEncounter(s, sim.config);
    if (!ready) for (const e of s.entities) if (e.ai) e.hp = 0;
    sim.physics.dispose();
    sim.physics = new Physics(s);
    return sim;
  } catch (error) {
    sim.dispose();
    throw error;
  }
}
