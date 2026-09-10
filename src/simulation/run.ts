import type { State } from "./types";

const ALTERATIONS = {
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
  "cross-seam": {
    name: "Crosswise inscription",
    family: "Ember Secondary",
    description:
      "Lay the cinder seam across your aim instead of along it. Draw pursuers through a burning threshold.",
  },
  "forked-tide": {
    name: "Divided stream",
    family: "Tide Primary",
    description:
      "Split the jet into two diverging branches. Saturate a wider group, but leave a gap at distance. Each target is hit once per cast.",
  },
  "focused-gale": {
    name: "Long breath",
    family: "Gale Primary",
    description:
      "Reach 9 metres with the same impulse in a narrower 40-degree fan. Deflection uses that same fan; flanks are exposed.",
  },
  "fault-line": {
    name: "Walking fault",
    family: "Stone Primary",
    description:
      "The eruption advances through three points, 0.16 seconds apart. Each body is hit once per wave; Stone remembers adds an echo wave. Terrain stops the line.",
  },
} as const;
export type AlterationId = keyof typeof ALTERATIONS;
const THEOREMS = {
  "shared-vapour": {
    name: "Shared vapour",
    family: "Heat + moisture reactions",
    description:
      "Your steam transfers a little moisture to nearby bodies within 2 metres. Those transfers can react, but cannot spread again. Cover blocks the transfer.",
    requires: ["forked-tide", "piercing-ember", "undertow"] as AlterationId[],
  },
  "break-seal": {
    name: "Break the seal",
    family: "Cohesion + force",
    description:
      "Your force releases a positively bound structure into fracture before the impulse lands. Erupt, then use a jet, gust or updraft to break the binding. Only structural bodies bind.",
    requires: [
      "stone-echo",
      "fault-line",
      "focused-gale",
      "undertow",
    ] as AlterationId[],
  },
  "migrating-inscriptions": {
    name: "Migrating inscriptions",
    family: "Gale Primary + manifestations",
    description:
      "A gust redirects your visible seams, basins and updrafts at 2.4 metres per second. Slabs stay solid. Fields keep their lifetime and stop at terrain; tethering ends.",
    requires: [
      "double-inscription",
      "cross-seam",
      "travelling-basin",
      "tethered-updraft",
    ] as AlterationId[],
  },
} as const;
export type UpgradeId = AlterationId | keyof typeof THEOREMS;
export interface Upgrade {
  name: string;
  family: string;
  description: string;
  kind: "Alteration" | "Theorem";
  requires: readonly AlterationId[];
}
export const UPGRADES = Object.fromEntries([
  ...Object.entries(ALTERATIONS).map(([id, data]) => [
    id,
    { ...data, kind: "Alteration", requires: [] },
  ]),
  ...Object.entries(THEOREMS).map(([id, data]) => [
    id,
    { ...data, kind: "Theorem" },
  ]),
]) as Record<UpgradeId, Upgrade>;
export const requirementText = (id: UpgradeId) =>
  UPGRADES[id].requires.length
    ? `Requires one: ${UPGRADES[id].requires.map((key) => UPGRADES[key].name).join(", ")}. Offered at the final choice.`
    : "No prerequisite.";
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
export function eligible(s: State, actor: string, id: UpgradeId): boolean {
  const u = UPGRADES[id];
  return (
    !!s.run &&
    !!s.actors[actor] &&
    !!u &&
    !hasUpgrade(s, actor, id) &&
    (s.run.upgrades[actor]?.length ?? 0) < 3 &&
    (u.kind === "Alteration" ||
      (s.trial?.encounter === 3 &&
        u.requires.some((key) => hasUpgrade(s, actor, key))))
  );
}
export function initializeRun(s: State, generation: number) {
  s.run = {
    id: `${s.seed}:${generation}`,
    upgrades: Object.fromEntries(Object.keys(s.actors).map((id) => [id, []])),
  };
}
export function offerRewards(s: State) {
  if (!s.run || ![0, 2, 3].includes(s.trial!.encounter)) return;
  const encounter = s.trial!.encounter;
  if (s.run.reward?.id === `${s.run.id}:reward:${encounter}`) return;
  const offers: Reward["offers"] = {};
  for (const [i, actor] of Object.keys(s.actors).sort().entries()) {
    let seed =
      (s.seed ^ ((encounter + 1) * 2654435761) ^ ((i + 1) * 2246822519)) >>> 0;
    const pool = (Object.keys(UPGRADES) as UpgradeId[]).filter((id) =>
      eligible(s, actor, id),
    );
    for (let j = pool.length - 1; j > 0; j--) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const k = seed % (j + 1);
      [pool[j], pool[k]] = [pool[k], pool[j]];
    }
    // Final choice offers one compatible rule alongside two action alternatives.
    // Shuffle still selects which eligible theorem; no named build is guaranteed.
    const theorem = pool.find((id) => UPGRADES[id].kind === "Theorem");
    offers[actor] = theorem
      ? [
          theorem,
          ...pool
            .filter((id) => UPGRADES[id].kind === "Alteration")
            .slice(0, 2),
        ]
      : pool.slice(0, 3);
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
    !reward.offers[actor]?.includes(upgrade as UpgradeId) ||
    !eligible(s, actor, upgrade as UpgradeId)
  )
    return false;
  reward.choices[actor] = upgrade as UpgradeId;
  (run.upgrades[actor] ??= []).push(upgrade as UpgradeId);
  return true;
}
export const rewardsChosen = (s: State) =>
  !s.run?.reward ||
  Object.keys(s.actors).every((id) => !!s.run!.reward!.choices[id]);
