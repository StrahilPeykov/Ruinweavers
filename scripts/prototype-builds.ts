// Rejected-candidate laboratory. Wraps real Simulation operations; never loaded by the game.
import { mkdirSync, writeFileSync } from "node:fs";
import { initPhysics } from "../src/physics/world";
import { Simulation, distance } from "../src/simulation/simulation";
import { configFromQuery } from "../src/experiments/config";
import { ScriptedPolicy } from "../src/diagnostics/policies";
await initPhysics();
const rows = [];
for (const candidate of [
  "baseline",
  "baseline-control",
  "converging-gust",
  "impact-splash",
  "automatic-infusion",
]) {
  for (const scene of ["trial/ranged", "trial/pursuit", "trial/mixed"]) {
    const sim = new Simulation(
      configFromQuery(`?scene=${scene}&scenario=cross-cover&seed=123`),
    );
    const original = sim.apply.bind(sim);
    let descendants = false,
      activations = 0;
    sim.apply = (e, operation, source, reason) => {
      let op = { ...operation };
      if (
        candidate === "converging-gust" &&
        reason === "pressure" &&
        op.force
      ) {
        op.force = { x: -op.force.x, y: op.force.y, z: -op.force.z };
        activations++;
      }
      if (
        candidate === "automatic-infusion" &&
        reason === "heat bolt" &&
        sim.state.fields.some(
          (f) =>
            f.source === source &&
            f.principle === "Tide" &&
            distance(e.pos, f.pos) < f.radius,
        )
      ) {
        op.water = 0.7;
        activations++;
      }
      original(e, op, source, reason);
      if (
        !descendants &&
        candidate === "impact-splash" &&
        reason === "heat bolt"
      ) {
        descendants = true;
        for (const other of sim
          .nearby(e.pos, 2, source)
          .filter((t) => t.id !== e.id)) {
          original(other, { heat: 24 }, source, "candidate splash");
          activations++;
        }
        descendants = false;
      }
    };
    const agent = new ScriptedPolicy(
      ["converging-gust", "baseline-control"].includes(candidate)
        ? "control-cover"
        : "basin-ember",
      "delayed-aim",
      123,
      undefined,
      "keyboard",
    );
    sim.ready("mage-1");
    for (
      let tick = 0;
      tick < 60 * 65 && sim.state.trial!.status === "active";
      tick++
    )
      sim.step(agent.input(sim));
    rows.push({
      candidate,
      scene,
      policy: agent.name,
      activations,
      status: sim.state.trial!.status,
      time: +sim.state.time.toFixed(2),
      damage: sim.state.metrics.playerDamage,
      reactions: sim.state.metrics.transformations,
    });
    sim.dispose();
  }
}
mkdirSync("artifacts/build-0.2", { recursive: true });
writeFileSync(
  "artifacts/build-0.2/rejected-prototypes.json",
  JSON.stringify(
    {
      method:
        "prototype wrappers-1, real Simulation/Rapier; cross-cover seed123; 200ms observation delay; no production rules changed; converging-gust uses control-cover, other candidates matched basin-ember",
      rows,
    },
    null,
    2,
  ),
);
console.table(rows.map(({ reactions, ...r }) => r));
