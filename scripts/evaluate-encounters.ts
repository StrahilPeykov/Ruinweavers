import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { initPhysics } from "../src/physics/world";
import { Simulation } from "../src/simulation/simulation";
import { configFromQuery, PRINCIPLES } from "../src/experiments/config";
import { SCENARIOS, TRIAL_TUNING } from "../src/simulation/trial";
import {
  ScriptedPolicy,
  POLICY_NAMES,
  POLICY_VERSION,
} from "../src/diagnostics/policies";
await initPhysics();
const args = process.argv.slice(2),
  version = args.includes("--baseline") ? "baseline" : "candidate";
const split = args.includes("--held-out") ? "held-out" : "development";
const headingMode = args.includes("--keyboard") ? "keyboard" : "continuous";
const output =
  args.find((a) => a.startsWith("--output="))?.slice(9) ??
  `artifacts/coop-trial/${version}-${split}-${headingMode}.json`;
const motor =
  args.find((a) => a.startsWith("--motor="))?.slice(8) ?? "reactive";
const fullTrial = args.includes("--trial");
const horizon = fullTrial ? 165 : 55;
const restricted = args.includes("--restrictions");
const rows: any[] = [];
for (const [scenario, layout] of Object.entries(SCENARIOS).filter(
  ([, v]) => v.split === split,
))
  for (const encounter of fullTrial
    ? ["full-trial"]
    : ["ranged", "pursuit", "mixed"])
    for (const mode of ["exact-state", "delayed-aim"] as const)
      for (const policy of POLICY_NAMES)
        for (const excluded of restricted &&
        policy === "state-aware" &&
        mode === "delayed-aim"
          ? [undefined, ...PRINCIPLES]
          : [undefined]) {
          const sim = new Simulation(
            configFromQuery(
              `?scene=${fullTrial ? "trial" : "trial/" + encounter}&scenario=${scenario}&encounterVersion=${version}`,
            ),
          );
          const agent = new ScriptedPolicy(
            policy,
            mode,
            123 + Object.keys(SCENARIOS).indexOf(scenario) * 71,
            excluded,
            headingMode,
          );
          sim.advanceTrial();
          for (
            let i = 0;
            i < 60 * horizon &&
            ["active", "between"].includes(sim.state.trial!.status);
            i++
          ) {
            const input = agent.input(sim);
            if (motor !== "reactive") input.dodge = false;
            if (motor === "standing") input.moveX = input.moveZ = 0;
            sim.step(input);
          }
          const s = sim.state,
            enemyIds = new Set(s.entities.filter((e) => e.ai).map((e) => e.id)),
            routes = Object.values(s.metrics.damageRoutes);
          rows.push({
            scenario,
            split: layout.split,
            encounter,
            policy,
            mode,
            excluded: excluded ?? null,
            result:
              s.trial?.status === "victory"
                ? "complete"
                : s.trial?.status === "defeat"
                  ? "defeat"
                  : "timeout",
            seconds: +s.trial!.elapsed.toFixed(2),
            playerDamage: +s.metrics.playerDamage.toFixed(2),
            health: +sim.player.hp.toFixed(2),
            enemyDamage: +routes
              .filter(
                (r) =>
                  r.source === sim.player.id &&
                  r.recipient.startsWith("encounter-"),
              )
              .reduce((n, r) => n + r.amount, 0)
              .toFixed(2),
            collateralDamage: +routes
              .filter(
                (r) =>
                  r.source === sim.player.id &&
                  !r.recipient.startsWith("encounter-"),
              )
              .reduce((n, r) => n + r.amount, 0)
              .toFixed(2),
            enemiesRemaining: s.entities
              .filter((e) => e.ai && e.hp > 0)
              .map((e) => ({ id: e.id, hp: e.hp, pos: e.pos })),
            casts: s.metrics.casts,
            switches: s.metrics.switches,
            dodges: s.metrics.dodges,
            reactions: s.metrics.transformations,
            outcomes: s.metrics.outcomes,
            damageRoutes: s.metrics.damageRoutes,
            decisions: agent.decisions,
          });
          sim.dispose();
        }
mkdirSync("artifacts/coop-trial", { recursive: true });
writeFileSync(
  output,
  JSON.stringify(
    {
      schema: 1,
      headingMode,
      motor,
      policyVersion: POLICY_VERSION,
      runtimeCommit: execFileSync("git", ["rev-parse", "HEAD"])
        .toString()
        .trim(),
      version,
      tuning: TRIAL_TUNING[version],
      split,
      seedRule: "123 + scenario index * 71",
      horizonSeconds: horizon,
      sourceHashes: Object.fromEntries(
        [
          "src/simulation/trial.ts",
          "src/simulation/simulation.ts",
          "src/diagnostics/policies.ts",
          "scripts/evaluate-encounters.ts",
        ].map((p) => [
          p,
          createHash("sha256").update(readFileSync(p)).digest("hex"),
        ]),
      ),
      observation:
        "10 Hz decisions; exact current state or 200ms delayed enemies/fields/bolts with deterministic 0.6-unit aim error. No AI timers. Shared reactive movement probes and dodge rules. Synthetic sensitivity, not human skill.",
      rows,
    },
    null,
    2,
  ),
);
console.table(
  POLICY_NAMES.flatMap((policy) =>
    ["exact-state", "delayed-aim"].map((mode) => {
      const selected = rows.filter(
          (r) => r.policy === policy && r.mode === mode && !r.excluded,
        ),
        complete = selected.filter((r) => r.result === "complete");
      return {
        policy,
        mode,
        cleared: `${complete.length}/${selected.length}`,
        damage: +(
          selected.reduce((n, r) => n + r.playerDamage, 0) / selected.length
        ).toFixed(1),
        secondsOnClear: complete.length
          ? +(
              complete.reduce((n, r) => n + r.seconds, 0) / complete.length
            ).toFixed(1)
          : null,
      };
    }),
  ),
);
console.log(output);
