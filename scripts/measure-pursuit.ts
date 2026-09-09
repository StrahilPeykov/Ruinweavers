import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { initPhysics } from "../src/physics/world";
import { Simulation, distance } from "../src/simulation/simulation";
import { configFromQuery } from "../src/experiments/config";
import { idleInput, vec } from "../src/simulation/types";
await initPhysics();
const rows = [];
for (const version of ["baseline", "candidate"])
  for (const mode of ["stationary", "retreat", "retreat-casting"]) {
    const s = new Simulation(
      configFromQuery(
        `?scene=trial/pursuit&scenario=open-near&encounterVersion=${version}`,
      ),
    );
    s.advanceTrial();
    const e = s.state.entities.find((e) => e.ai)!;
    for (const other of s.state.entities.filter((x) => x.ai && x !== e))
      s.damage(other, 1000, "fixture", "isolate");
    s.player.pos = vec(0, 0.75, -1);
    e.pos = vec(0, 0.6, -9);
    s.physics.teleport(s.player);
    s.physics.teleport(e);
    const startGap = distance(s.player.pos, e.pos),
      samples = [];
    let travel = 0,
      n = 0,
      previous = { ...e.pos };
    for (let i = 0; i < 120; i++) {
      s.step({
        ...idleInput({ ...e.pos, body: true }),
        moveZ: mode === "stationary" ? 0 : 1,
        primary: mode === "retreat-casting",
      });
      if (i >= 30 && e.ai!.phase !== "telegraph") {
        travel += distance(e.pos, previous);
        n++;
      }
      previous = { ...e.pos };
      if (i % 6 === 0)
        samples.push({
          time: s.state.time,
          player: { ...s.player.pos },
          enemy: { ...e.pos },
          velocity: { ...e.velocity },
          phase: e.ai!.phase,
          gap: distance(s.player.pos, e.pos),
        });
    }
    rows.push({
      version,
      mode,
      startGap,
      endGap: distance(s.player.pos, e.pos),
      chaseSpeedAfterHalfSecond: travel / (n / 60),
      sampleSeconds: n / 60,
      enemyHp: e.hp,
      samples,
    });
    s.dispose();
  }
mkdirSync("artifacts/coop-trial", { recursive: true });
writeFileSync(
  "artifacts/coop-trial/pursuit-measurement.json",
  JSON.stringify(
    {
      runtime: execFileSync("git", ["rev-parse", "HEAD"]).toString().trim(),
      sourceHashes: Object.fromEntries(
        [
          "scripts/measure-pursuit.ts",
          "src/simulation/simulation.ts",
          "src/physics/world.ts",
        ].map((f) => [
          f,
          createHash("sha256").update(readFileSync(f)).digest("hex"),
        ]),
      ),
      method:
        "Actual displacement in a 2s unobstructed Rapier trial. First .5s and telegraph periods excluded from chase speed; gap includes all motion. Two other enemies removed as an isolation fixture. No tuning change.",
      rows,
    },
    null,
    2,
  ),
);
console.table(rows.map(({ samples, ...r }) => r));
