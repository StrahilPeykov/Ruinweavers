import type { State } from "./types";
import { rewardsChosen } from "./run";

export const ROUTE_VERSION = 2;
export const ORDINARY_ROOMS = [
  "split",
  "gallery",
  "rotunda",
  "yard",
  "approach",
  "diagonal",
] as const;
// Stable progression identities, independent of the selected physical room.
export const STAGES = [
  {
    id: "threshold",
    package: 0,
    reward: "first",
    pressure: "Ranged crossfire",
  },
  { id: "pursuit", package: 1, reward: null, pressure: "Pursuing constructs" },
  {
    id: "convergence",
    package: 2,
    reward: "second",
    pressure: "Ranged and pursuit",
  },
  {
    id: "approach",
    package: 3,
    reward: "final",
    pressure: "Pursuit with ranged support",
  },
  { id: "warden", package: 4, reward: null, pressure: "The Bound Warden" },
] as const;
export interface RouteNode {
  id: string;
  room: string;
  stage: number;
  next: string[];
}
export interface RouteState {
  version: number;
  nodes: RouteNode[];
  visited: string[];
  boundary: number;
  decision?: {
    id: string;
    options: string[];
    votes: Record<string, string>;
    selected?: string;
  };
}
export function generateRoute(seed: number): RouteState {
  let rng = (seed ^ 0x726f7574) >>> 0;
  const random = () => {
    // Mix the full uint32; using the low LCG bits biased early fork availability.
    let t = (rng = (rng + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const nodes: RouteNode[] = [];
  function add(id: string, room: string, stage: number, used: string[]) {
    const node: RouteNode = { id, room, stage, next: [] };
    nodes.push(node);
    if (stage === 3) {
      node.next = ["ward"];
      return;
    }
    const pool = ORDINARY_ROOMS.filter((r) => !used.includes(r));
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    // A whole authored room is selected. Geometry and build ownership never enter the roll.
    for (const [i, next] of pool.slice(0, 2).entries()) {
      const child = `${id}${i}`;
      node.next.push(child);
      add(child, next, stage + 1, [...used, next]);
    }
  }
  add("entry", "split", 0, ["split"]);
  nodes.push({ id: "ward", room: "warden", stage: 4, next: [] });
  return { version: ROUTE_VERSION, nodes, visited: ["entry"], boundary: 0 };
}
export const currentNode = (s: State) => {
  const r = s.run?.route;
  return r?.nodes.find((n) => n.id === r.visited.at(-1));
};
export const currentStage = (s: State) => {
  const node = currentNode(s);
  return node ? STAGES[node.stage] : undefined;
};
export function openRoute(s: State) {
  const r = s.run?.route,
    node = currentNode(s);
  if (!r || !node?.next.length) return;
  r.boundary++;
  r.decision = {
    id: `${s.run!.id}:route:${r.boundary}:${node.id}`,
    options: [...node.next],
    votes: {},
  };
  if (node.next.length === 1) r.decision.selected = node.next[0];
}
export function voteRoute(
  s: State,
  actor: string,
  runId: string,
  decisionId: string,
  boundary: number,
  nodeId: string,
): boolean {
  const r = s.run?.route,
    d = r?.decision;
  if (
    !r ||
    !d ||
    s.run!.id !== runId ||
    d.id !== decisionId ||
    r.boundary !== boundary ||
    s.trial?.status !== "between" ||
    !s.actors[actor] ||
    !rewardsChosen(s) ||
    d.selected ||
    !d.options.includes(nodeId)
  )
    return false;
  d.votes[actor] = nodeId;
  if (Object.keys(s.actors).every((id) => d.votes[id] === nodeId))
    d.selected = nodeId;
  return true;
}
export function enterSelectedRoute(s: State): boolean {
  const r = s.run?.route;
  if (!r) return true;
  if (!r.decision?.selected) return false;
  r.visited.push(r.decision.selected);
  r.decision = undefined;
  return true;
}
