import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { initPhysics } from "../src/physics/world";
import { Simulation } from "../src/simulation/simulation";
import { configFromQuery } from "../src/experiments/config";
import { ScriptedPolicy, type PolicyName } from "../src/diagnostics/policies";
await initPhysics();
const rows = [];
for (const seed of [123, 456])
  for (const count of [1, 2])
    for (const policy of [
      "attack-move",
      "basin-ember",
      "state-aware",
    ] as PolicyName[]) {
      const sim = new Simulation(configFromQuery(`?scene=run&seed=${seed}`));
      if (count === 2) sim.addPartner();
      const ids = Object.keys(sim.state.actors),
        agents = ids.map(
          (_, i) =>
            new ScriptedPolicy(
              policy,
              "delayed-aim",
              seed + i * 71,
              undefined,
              "keyboard",
            ),
        );
      ids.forEach((id) => sim.ready(id));
      let maxFields = 0,
        maxPending = 0;
      for (
        let tick = 0;
        tick < 60 * 360 &&
        !["victory", "defeat"].includes(sim.state.trial!.status);
        tick++
      ) {
        if (sim.state.trial!.status === "between") {
          const r = sim.state.run!;
          if (r.reward)
            for (const id of ids)
              sim.chooseUpgrade(id, r.id, r.reward.id, r.reward.offers[id][0]);
          ids.forEach((id) => sim.ready(id));
        }
        sim.stepParty(
          Object.fromEntries(
            ids.map((id, i) => [
              id,
              sim.withActor(id, () => agents[i].input(sim)),
            ]),
          ),
        );
        maxFields = Math.max(maxFields, sim.state.fields.length);
        maxPending = Math.max(maxPending, sim.state.pending.length);
      }
      rows.push({
        seed,
        players: count,
        policy,
        result: sim.state.trial!.status,
        seconds: +sim.state.trial!.elapsed.toFixed(2),
        clears: sim.state.trial!.results.length,
        health: sim.players.map((p) => +p.hp.toFixed(1)),
        upgrades: sim.state.run!.upgrades,
        maxFields,
        maxPending,
        casts: sim.state.metrics.casts,
        damage: sim.state.metrics.playerDamage,
        reactions: sim.state.metrics.transformations,
      });
      sim.dispose();
    }
const output =
  process.argv.find((a) => a.startsWith("--output="))?.slice(9) ??
  `artifacts/build-0.2/whole-run-${Date.now()}.json`;
mkdirSync(output.slice(0, output.lastIndexOf("/")), { recursive: true });
writeFileSync(
  output,
  JSON.stringify(
    {
      method:
        "run-policies-1; existing policies-1 delayed-aim, keyboard motor, 360s cap, first offered choice; synthetic diagnostics, not human skill",
      sourceHash: createHash("sha256")
        .update(readFileSync("src/simulation/run.ts"))
        .digest("hex"),
      rows,
    },
    null,
    2,
  ),
);
console.table(
  rows.map(({ seed, players, policy, result, seconds, clears, health }) => ({
    seed,
    players,
    policy,
    result,
    seconds,
    clears,
    health: health.join("/"),
  })),
);
