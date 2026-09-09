import { mkdirSync, writeFileSync } from "node:fs";
import { initPhysics } from "../src/physics/world";
import { Simulation } from "../src/simulation/simulation";
import { configFromQuery, type Principle } from "../src/experiments/config";
import { idleInput, vec } from "../src/simulation/types";
await initPhysics();
const results = [];
for (const strategy of [
  "Ember",
  "Tide",
  "Gale",
  "Stone",
  "Tide → Ember",
  "Fracture → Gale",
  "Basin + Ember",
  "Slab + Ember",
]) {
  const sim = new Simulation(
    configFromQuery(
      `?scene=combat${strategy === "Fracture → Gale" ? "&model=weave-unweave" : ""}`,
    ),
  );
  sim.player.pos = vec(5, 0.75, -2);
  sim.physics.teleport(sim.player);
  for (let i = 0; i < 60 * 45; i++) {
    const s = sim.state,
      e = s.entities.find((e) => e.id === "sentinel")!;
    const f = idleInput(vec(e.pos.x, 0, e.pos.z));
    f.primary = true;
    f.select = (
      ["Ember", "Tide", "Gale", "Stone"].includes(strategy) ? strategy : "Ember"
    ) as Principle;
    if (strategy === "Tide → Ember") f.select = i % 120 < 30 ? "Tide" : "Ember";
    if (strategy === "Fracture → Gale") {
      f.select = i % 120 < 20 ? "Stone" : "Gale";
      f.secondary = i % 120 === 0;
      f.primary = i % 120 >= 20;
    }
    if (strategy === "Basin + Ember" && i % 600 === 0) {
      f.select = "Tide";
      f.secondary = true;
      f.primary = false;
    }
    if (strategy === "Slab + Ember" && i % 600 === 0) {
      f.select = "Stone";
      f.secondary = true;
      f.primary = false;
      f.aim = vec(5, 0, -4);
    }
    // Identical simple lateral evasion policy. This is a structural probe, not a skilled-player balance estimate.
    if (s.sentinel.phase === "telegraph" && s.sentinel.timer < 0.45) {
      f.moveX = sim.player.pos.x > 5 ? -1 : 1;
      f.dodge = s.time >= s.dodgeReady;
    }
    const d = Math.hypot(
      e.pos.x - sim.player.pos.x,
      e.pos.z - sim.player.pos.z,
    );
    if (d > 5.5) {
      f.moveZ = Math.sign(e.pos.z - sim.player.pos.z);
      f.moveX = Math.sign(e.pos.x - sim.player.pos.x);
    }
    sim.step(f);
    if (e.hp <= 0 || sim.player.hp <= 0) break;
  }
  const enemy = sim.state.entities.find((e) => e.id === "sentinel")!;
  results.push({
    strategy,
    seconds: +sim.state.time.toFixed(2),
    defeated: enemy.hp <= 0,
    sentinelHp: +enemy.hp.toFixed(1),
    playerHp: +sim.player.hp.toFixed(1),
    casts: sim.state.metrics.casts,
    transforms: sim.state.metrics.transformations,
    damage: sim.state.metrics.damage,
    blocked: sim.state.metrics.blockedBolts,
  });
  sim.dispose();
}
mkdirSync("artifacts", { recursive: true });
writeFileSync(
  "artifacts/combat-benchmark.json",
  JSON.stringify(results, null, 2),
);
console.table(results.map(({ casts, transforms, damage, ...r }) => r));
