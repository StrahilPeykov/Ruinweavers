import { initPhysics } from "../src/physics/world";
import { Simulation } from "../src/simulation/simulation";
import { configFromQuery } from "../src/experiments/config";
import { ROOMS } from "../src/simulation/rooms";
import { idleInput, vec } from "../src/simulation/types";
import { writeFileSync, mkdirSync } from "node:fs";
await initPhysics();
const rows = [];
for (const room of [
  "split",
  "gallery",
  "rotunda",
  "terrace",
  "broken",
  "yard",
  "warden",
]) {
  const r = ROOMS[room];
  for (const [x, z] of [
    [0, 0],
    [-r.width / 2 + 1.5, r.depth / 2 - 1.5],
    [r.width / 2 - 1.5, r.depth / 2 - 1.5],
    [-r.width / 2 + 1.5, -r.depth / 2 + 1.5],
    [r.width / 2 - 1.5, -r.depth / 2 + 1.5],
    [0, r.depth / 2 - 1.5],
  ]) {
    const s = new Simulation(
      configFromQuery(`?scene=trial/pursuit&room=${room}`),
    );
    s.ready("mage-1");
    const support = s.physics.surfaceAt(vec(x, 5, z));
    if (!support || support.y > 1) {
      s.dispose();
      continue;
    }
    s.player.pos = vec(x, support.y + 0.75, z);
    s.player.hp = 100000;
    s.physics.teleport(s.player);
    const reached = new Set<string>();
    for (let t = 0; t < 60 * 25; t++) {
      s.step(idleInput());
      for (const e of s.state.entities.filter((e) => e.ai && e.hp > 0))
        if (Math.hypot(e.pos.x - x, e.pos.z - z) < 2.6) reached.add(e.id);
    }
    const enemies = s.state.entities.filter((e) => e.ai);
    const row = {
      room,
      target: [x, z],
      reached: reached.size,
      total: enemies.length,
      falls: s.state.metrics.falls,
      missing: enemies
        .filter((e) => !reached.has(e.id))
        .map((e) => ({ id: e.id, hp: e.hp, pos: e.pos })),
    };
    rows.push(row);
    console.log(JSON.stringify(row));
    s.dispose();
  }
}
const out = process.argv[2] ?? "artifacts/spatial-0.3/raw/navigation-v1.json";
mkdirSync(out.slice(0, out.lastIndexOf("/")), { recursive: true });
writeFileSync(
  out,
  JSON.stringify(
    {
      note: "Diagnostic stationary invulnerable target, 25s; every pursuer must approach. No combat performance claim.",
      rows,
    },
    null,
    2,
  ),
);
