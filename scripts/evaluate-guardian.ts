import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { initPhysics } from "../src/physics/world";
import { Simulation } from "../src/simulation/simulation";
import { configFromQuery } from "../src/experiments/config";
import type { UpgradeId } from "../src/simulation/run";
import {
  GuardianPolicy,
  GUARDIAN_BUILDS,
  GUARDIAN_POLICY_VERSION,
} from "../src/diagnostics/guardian-policy";
import { encodeSnapshot } from "../src/network/wire";
const source = createHash("sha256");
for (const file of [
  "src/simulation/guardian.ts",
  "src/simulation/simulation.ts",
  "src/simulation/trial.ts",
  "src/physics/world.ts",
  "src/diagnostics/guardian-policy.ts",
  "src/diagnostics/build-policies.ts",
  "src/diagnostics/policies.ts",
])
  source.update(readFileSync(file));
const sourceId = source.digest("hex").slice(0, 12);
await initPhysics();
const output =
  process.argv.find((a) => a.startsWith("--output="))?.slice(9) ??
  `artifacts/guardian-0.1/evaluation-${Date.now()}.json`;
const quick = process.argv.includes("--quick"),
  held = process.argv.includes("--held-out");
const stationary = process.argv.includes("--stationary");
const rows = [];
for (const scenario of held
  ? ["held-diagonal", "held-offset"]
  : quick
    ? ["cross-cover"]
    : ["open-near", "cross-cover"])
  for (const mode of quick
    ? (["delayed-aim"] as const)
    : (["delayed-aim", "exact-state"] as const))
    for (const party of quick ? [1] : [1, 2])
      for (const name of Object.keys(GUARDIAN_BUILDS)) {
        const sim = new Simulation(
          configFromQuery(`?scene=guardian&scenario=${scenario}&seed=123`),
        );
        if (party === 2) sim.addPartner();
        // Observation only: delegate every operation to the real rule, including
        // recursive non-propagating transfers. No simulated substitute or bonus.
        const vapour = {
          applications: 0,
          immediateReactions: 0,
          primedDryTargets: 0,
          waterOffered: 0,
          targets: {} as Record<string, number>,
        };
        const apply = sim.apply.bind(sim);
        sim.apply = (...args: Parameters<Simulation["apply"]>) => {
          const [entity, operation, , reason] = args,
            oldWet = entity.wet;
          const before = sim.state.metrics.transformations.vaporize ?? 0;
          apply(...args);
          if (reason === "shared vapour") {
            vapour.applications++;
            vapour.waterOffered += operation.water ?? 0;
            vapour.immediateReactions +=
              (sim.state.metrics.transformations.vaporize ?? 0) - before;
            if (oldWet <= 0.16 && entity.wet > 0.16) vapour.primedDryTargets++;
            vapour.targets[entity.id] = (vapour.targets[entity.id] ?? 0) + 1;
          }
        };
        const agents = sim.players.map((p, i) => {
          sim.state.run!.upgrades[p.id] = GUARDIAN_BUILDS[name] as UpgradeId[];
          // Matched starting configurations; only fixture position, never future timing.
          p.pos.x += (held ? 2 : 0) + i * 2;
          p.pos.z += scenario === "open-near" ? -2 : 0;
          sim.physics.teleport(p);
          sim.ready(p.id);
          return new GuardianPolicy(name, mode, 123 + i);
        });
        let fields = 0,
          bolts = 0,
          pending = 0,
          packet = 0,
          travel = 0;
        let old = {
          ...sim.state.entities.find((e) => e.kind === "warden")!.pos,
        };
        for (
          let tick = 0;
          tick < 60 * 150 && sim.state.trial!.status === "active";
          tick++
        ) {
          const inputs = Object.fromEntries(
            sim.players.map((p, i) => {
              sim.actorId = p.id;
              const input = agents[i].input(sim);
              return [
                p.id,
                stationary
                  ? { ...input, moveX: 0, moveZ: 0, dodge: false }
                  : input,
              ];
            }),
          );
          sim.actorId = "mage-1";
          sim.stepParty(inputs);
          const core = sim.state.entities.find((e) => e.kind === "warden")!;
          travel += Math.hypot(core.pos.x - old.x, core.pos.z - old.z);
          old = { ...core.pos };
          fields = Math.max(fields, sim.state.fields.length);
          bolts = Math.max(bolts, sim.state.bolts.length);
          pending = Math.max(pending, sim.state.pending.length);
          if (tick % 60 === 0) {
            const original = sim.state.party;
            sim.state.party ??= { ready: [], epoch: 1 };
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
            sim.state.party = original;
          }
        }
        const m = sim.state.metrics;
        rows.push({
          scenario,
          mode,
          party,
          name,
          result: sim.state.trial!.status,
          seconds: +sim.state.time.toFixed(2),
          damage: +m.playerDamage.toFixed(2),
          remaining: sim.state.entities.find((e) => e.kind === "warden")!.hp,
          travel: +travel.toFixed(2),
          casts: m.casts,
          reactions: m.transformations,
          outcomes: m.outcomes,
          damageRoutes: Object.values(m.damageRoutes),
          vapour,
          peaks: { fields, bolts, pending, packet },
        });
        sim.dispose();
      }
mkdirSync(output.slice(0, output.lastIndexOf("/")), { recursive: true });
writeFileSync(
  output,
  JSON.stringify(
    {
      policy: GUARDIAN_POLICY_VERSION,
      source: sourceId,
      held,
      stationary,
      rows,
    },
    null,
    2,
  ),
);
console.table(
  rows.map(
    ({ name, party, scenario, mode, result, seconds, damage, remaining }) => ({
      name,
      party,
      scenario,
      mode,
      result,
      seconds,
      damage,
      remaining,
    }),
  ),
);
console.log(output);
