import type { State } from "./types";

export const UPGRADES = {
  "double-inscription": {
    name: "Double inscription",
    family: "All Secondaries",
    description: "Keep two major manifestations. A third replaces your oldest.",
  },
  "piercing-ember": {
    name: "Through the embers",
    family: "Ember Primary",
    description:
      "Heat bolts continue through one additional creature or prop. Cover still stops them.",
  },
  "stone-echo": {
    name: "Stone remembers",
    family: "Stone Primary",
    description:
      "Each eruption repeats once at the same spot after 0.65 seconds. Lure enemies into its echo.",
  },
  undertow: {
    name: "Undertow",
    family: "Tide Primary",
    description:
      "The jet draws wet targets toward you instead of pushing them away. Gather enemies; mind your distance.",
  },
  "travelling-basin": {
    name: "Travelling basin",
    family: "Tide Secondary",
    description:
      "Your basin travels away from you at 1.2 metres per second until terrain stops it.",
  },
  "tethered-updraft": {
    name: "Tethered updraft",
    family: "Gale Secondary",
    description:
      "An updraft placed within 3 metres follows your footsteps. Distant updrafts stay where placed.",
  },
} as const;
export type UpgradeId = keyof typeof UPGRADES;
export interface Reward {
  id: string;
  encounter: number;
  offers: Record<string, UpgradeId[]>;
  choices: Partial<Record<string, UpgradeId>>;
}
export interface RunState {
  id: string;
  upgrades: Record<string, UpgradeId[]>;
  reward?: Reward;
}
type Enemy = ["sentinel" | "pursuer", number, number];
export const RUN_BEATS: { name: string; scenario: string; enemies: Enemy[] }[] =
  [
    {
      name: "The threshold",
      scenario: "open-near",
      enemies: [
        ["sentinel", -5, -5],
        ["sentinel", 5, -6],
      ],
    },
    {
      name: "Footsteps in the court",
      scenario: "cross-cover",
      enemies: [
        ["pursuer", -6, -5],
        ["pursuer", 6, -5],
        ["pursuer", 0, -8],
      ],
    },
    {
      name: "The divided hall",
      scenario: "side-cover",
      enemies: [
        ["sentinel", -6, -6],
        ["sentinel", 6, -6],
        ["pursuer", -5, 2],
        ["pursuer", 5, 3],
      ],
    },
    {
      name: "The closing circle",
      scenario: "open-near",
      enemies: [
        ["pursuer", -7, -5],
        ["pursuer", 7, -5],
        ["pursuer", 0, -8],
        ["sentinel", 0, -5],
      ],
    },
    {
      name: "The last ward",
      scenario: "cross-cover",
      enemies: [
        ["sentinel", -7, -7],
        ["sentinel", 7, -7],
        ["pursuer", -6, 1],
        ["pursuer", 6, 1],
        ["pursuer", 0, -7],
      ],
    },
  ];
export const hasUpgrade = (s: State, actor: string, upgrade: UpgradeId) =>
  s.run?.upgrades[actor]?.includes(upgrade) ?? false;
export const fieldCapacity = (s: State, actor: string, base: number) =>
  base + (hasUpgrade(s, actor, "double-inscription") ? 1 : 0);
export function initializeRun(s: State, generation: number) {
  s.run = {
    id: `${s.seed}:${generation}`,
    upgrades: Object.fromEntries(Object.keys(s.actors).map((id) => [id, []])),
  };
}
export function offerRewards(s: State) {
  if (!s.run || ![0, 2].includes(s.trial!.encounter)) return;
  const encounter = s.trial!.encounter;
  const offers: Reward["offers"] = {};
  for (const [i, actor] of Object.keys(s.actors).sort().entries()) {
    let seed =
      (s.seed ^ ((encounter + 1) * 2654435761) ^ ((i + 1) * 2246822519)) >>> 0;
    const pool = (Object.keys(UPGRADES) as UpgradeId[]).filter(
      (id) => !hasUpgrade(s, actor, id),
    );
    for (let j = pool.length - 1; j > 0; j--) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const k = seed % (j + 1);
      [pool[j], pool[k]] = [pool[k], pool[j]];
    }
    offers[actor] = pool.slice(0, 3);
  }
  s.run.reward = {
    id: `${s.run.id}:reward:${encounter}`,
    encounter,
    offers,
    choices: {},
  };
}
export function chooseUpgrade(
  s: State,
  actor: string,
  runId: string,
  rewardId: string,
  upgrade: string,
): boolean {
  const run = s.run,
    reward = run?.reward;
  if (
    !run ||
    run.id !== runId ||
    !reward ||
    reward.id !== rewardId ||
    s.trial?.status !== "between" ||
    reward.encounter !== s.trial.encounter ||
    !s.actors[actor] ||
    reward.choices[actor] ||
    !reward.offers[actor]?.includes(upgrade as UpgradeId)
  )
    return false;
  reward.choices[actor] = upgrade as UpgradeId;
  (run.upgrades[actor] ??= []).push(upgrade as UpgradeId);
  return true;
}
export const rewardsChosen = (s: State) =>
  !s.run?.reward ||
  Object.keys(s.actors).every((id) => !!s.run!.reward!.choices[id]);
