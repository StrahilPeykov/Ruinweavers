import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { initPhysics } from "../src/physics/world";
import { Simulation } from "../src/simulation/simulation";
import { configFromQuery } from "../src/experiments/config";
import { initializeRun, type UpgradeId } from "../src/simulation/run";
import {
  BuildPolicy,
  BUILD_NAMES,
  BUILD_POLICY_VERSION,
} from "../src/diagnostics/build-policies";
import { ScriptedPolicy } from "../src/diagnostics/policies";
import { encodeSnapshot } from "../src/network/wire";
await initPhysics();
const builds: Record<string, string[]> = {
  "basin-ember": ["travelling-basin", "piercing-ember", "shared-vapour"],
  reaction: ["forked-tide", "undertow", "shared-vapour"],
  field: ["double-inscription", "cross-seam", "migrating-inscriptions"],
  structure: ["stone-echo", "fault-line", "break-seal"],
};
const held = process.argv.includes("--held-out");
const routine = process.argv.includes("--routine-check");
const output =
  process.argv.find((a) => a.startsWith("--output="))?.slice(9) ??
  `artifacts/build-0.2/evaluation-${Date.now()}.json`;
const rows = [];
for (const scenario of held
  ? ["held-diagonal", "held-offset"]
  : ["open-near", "cross-cover"])
  for (const encounter of ["ranged", "pursuit", "mixed"])
    for (const mode of ["delayed-aim", "exact-state"] as const)
      for (const name of routine
        ? (["basin-ember"] as const)
        : ([...BUILD_NAMES, "basin-ember"] as const))
        for (const count of routine
          ? [0, 3]
          : name === "basin-ember"
            ? [0]
            : [0, 1, 2, 3]) {
          const sim = new Simulation(
            configFromQuery(
              `?scene=trial/${encounter}&scenario=${scenario}&seed=123`,
            ),
          );
          initializeRun(sim.state, 1);
          sim.state.run!.upgrades["mage-1"] = (builds[name] ?? []).slice(
            0,
            count,
          ) as UpgradeId[];
          const agent =
            name === "basin-ember"
              ? new ScriptedPolicy(name, mode, 123, undefined, "keyboard")
              : new BuildPolicy(name, mode);
          sim.ready("mage-1");
          let fields = 0,
            bolts = 0,
            pending = 0,
            packet = 0;
          for (
            let tick = 0;
            tick < 60 * 90 && sim.state.trial!.status === "active";
            tick++
          ) {
            sim.step(agent.input(sim));
            fields = Math.max(fields, sim.state.fields.length);
            bolts = Math.max(bolts, sim.state.bolts.length);
            pending = Math.max(pending, sim.state.pending.length);
            // Sample compact packet with a synthetic epoch only; no second actor/AI world.
            if (tick % 60 === 0) {
              sim.state.party = { ready: [], epoch: 1 };
              packet = Math.max(
                packet,
                JSON.stringify(
                  encodeSnapshot(
                    sim.state,
                    sim.config,
                    tick,
                    false,
                    false,
                    sim.state.serial,
                  ),
                ).length,
              );
              sim.state.party = undefined;
            }
          }
          const m = sim.state.metrics;
          rows.push({
            scenario,
            encounter,
            mode,
            name,
            count,
            upgrades: sim.state.run!.upgrades["mage-1"],
            result: sim.state.trial!.status,
            seconds: +sim.state.time.toFixed(2),
            damage: +m.playerDamage.toFixed(2),
            casts: m.casts,
            switches: m.switches,
            reactions: m.transformations,
            outcomes: m.outcomes,
            damageRoutes: Object.values(m.damageRoutes),
            peaks: { fields, bolts, pending, packet },
          });
          sim.dispose();
        }
mkdirSync(output.slice(0, output.lastIndexOf("/")), { recursive: true });
writeFileSync(
  output,
  JSON.stringify(
    {
      policy: BUILD_POLICY_VERSION,
      source: createHash("sha256")
        .update(readFileSync("src/simulation/simulation.ts"))
        .update(readFileSync("src/simulation/run.ts"))
        .update(readFileSync("src/diagnostics/build-policies.ts"))
        .digest("hex"),
      held,
      method:
        "Matched real Simulation/Rapier; 90s cap; same motor/dodge, no AI timers; exact-state diagnostic separate from 200ms delayed observation with imperfect aim. Incremental upgrade ablations use same deliberate policy; not human skill or optimized builds. Packet peaks exclude events/static bootstrap and use a synthetic epoch; no remote-network claim.",
      rows,
    },
    null,
    2,
  ),
);
console.table(
  rows
    .filter((r) => r.mode === "delayed-aim" && [0, 3].includes(r.count))
    .map(({ scenario, encounter, name, count, result, seconds, damage }) => ({
      scenario,
      encounter,
      name,
      count,
      result,
      seconds,
      damage,
    })),
);
