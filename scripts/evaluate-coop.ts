import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { initPhysics } from "../src/physics/world";
import { Simulation } from "../src/simulation/simulation";
import { configFromQuery } from "../src/experiments/config";
import { ScriptedPolicy } from "../src/diagnostics/policies";
import { idleInput, type FrameInput } from "../src/simulation/types";
await initPhysics();
const rows: {
  scenario: string;
  encounter: string;
  policy: string;
  result: string;
  seconds: number;
  health: Record<string, number>;
  playerDamage: number;
  crossReactions: number;
  metrics: import("../src/simulation/types").Metrics;
}[] = [];
for (const scenario of ["open-near", "cross-cover", "side-cover"])
  for (const encounter of ["ranged", "pursuit", "mixed"])
    for (const policy of ["solo", "independent-pair", "cooperating-pair"]) {
      const sim = new Simulation(
        configFromQuery(`?scene=trial/${encounter}&scenario=${scenario}`),
      );
      if (policy !== "solo") sim.addPartner();
      const ids = Object.keys(sim.state.actors),
        agents = ids.map(
          (id, i) =>
            new ScriptedPolicy(
              "state-aware",
              "delayed-aim",
              123 + i * 71,
              undefined,
              "keyboard",
              policy === "cooperating-pair"
                ? i
                  ? "striker"
                  : "primer"
                : "independent",
            ),
        );
      ids.forEach((id) => sim.ready(id));
      for (
        let tick = 0;
        tick < 60 * 55 && sim.state.trial!.status === "active";
        tick++
      ) {
        const inputs: Record<string, FrameInput> = {};
        ids.forEach((id, i) => {
          inputs[id] = sim.withActor(id, () => agents[i].input(sim));
          const p = sim.players.find((p) => p.id === id)!,
            down = sim.players.find((p) => p.hp <= 0);
          if (
            down &&
            p.hp > 0 &&
            Math.hypot(p.pos.x - down.pos.x, p.pos.z - down.pos.z) < 2.2
          )
            inputs[id] = { ...idleInput(inputs[id].aim), revive: true };
        });
        sim.stepParty(inputs);
      }
      const s = sim.state;
      rows.push({
        scenario,
        encounter,
        policy,
        result:
          s.trial!.status === "victory"
            ? "complete"
            : s.trial!.status === "defeat"
              ? "defeat"
              : "timeout",
        seconds: s.trial!.elapsed,
        health: Object.fromEntries(sim.players.map((p) => [p.id, p.hp])),
        playerDamage: s.metrics.playerDamage,
        crossReactions: Object.entries(s.metrics.outcomes)
          .filter(
            ([k]) =>
              k.startsWith("cross-reaction:") && k.includes(":encounter-"),
          )
          .reduce((n, [, v]) => n + v, 0),
        metrics: s.metrics,
      });
      sim.dispose();
    }
mkdirSync("artifacts/coop-trial", { recursive: true });
writeFileSync(
  "artifacts/coop-trial/party-comparison.json",
  JSON.stringify(
    {
      runtime: execFileSync("git", ["rev-parse", "HEAD"]).toString().trim(),
      sourceHashes: Object.fromEntries(
        [
          "src/simulation/simulation.ts",
          "src/physics/world.ts",
          "src/diagnostics/policies.ts",
          "scripts/evaluate-coop.ts",
        ].map((p) => [
          p,
          createHash("sha256").update(readFileSync(p)).digest("hex"),
        ]),
      ),
      policyVersion: "policies-1 + coop-roles-1",
      seedRule: "123 + actorIndex * 71, matched across conditions",
      horizonSeconds: 55,
      observationDelaySeconds: 0.2,
      headingMode: "keyboard",
      model: "primary-secondary",
      encounterVersion: "candidate",
      method:
        "Matched 3 layouts x 3 isolated encounters. Keyboard 8-direction movement, same delayed observations and aim error as policies-1. Pair roles choose a common midpoint target: primer Basin/Tide then binding Stone; striker Ember. No networking in this simulation batch. No HP scaling or Resonance.",
      rows,
    },
    null,
    2,
  ),
);
console.table(
  ["solo", "independent-pair", "cooperating-pair"].map((policy) => {
    const r = rows.filter((r) => r.policy === policy);
    return {
      policy,
      clears: r.filter((r) => r.result === "complete").length,
      cases: r.length,
      seconds: r.reduce((n, r) => n + r.seconds, 0) / r.length,
      partyDamage: r.reduce((n, r) => n + r.playerDamage, 0) / r.length,
      crossReactions: r.reduce((n, r) => n + r.crossReactions, 0),
    };
  }),
);
