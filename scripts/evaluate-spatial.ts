import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { initPhysics } from "../src/physics/world";
import { Simulation } from "../src/simulation/simulation";
import { configFromQuery } from "../src/experiments/config";
import { ROOMS } from "../src/simulation/rooms";
import { initializeRun, type UpgradeId } from "../src/simulation/run";
import {
  GuardianPolicy,
  GUARDIAN_BUILDS,
} from "../src/diagnostics/guardian-policy";
import { encodeSnapshot } from "../src/network/wire";
await initPhysics();
const out =
  process.argv.find((x) => x.startsWith("--output="))?.slice(9) ??
  `artifacts/spatial-0.3/raw/${Date.now()}`;
mkdirSync(out, { recursive: true });
const quick = process.argv.includes("--quick");
const rooms =
  process.argv
    .find((x) => x.startsWith("--rooms="))
    ?.slice(8)
    .split(",") ?? Object.keys(ROOMS);
const hash = createHash("sha256");
for (const file of [
  "src/simulation/rooms.ts",
  "src/simulation/simulation.ts",
  "src/physics/world.ts",
  "src/diagnostics/guardian-policy.ts",
  "src/diagnostics/build-policies.ts",
  "src/diagnostics/policies.ts",
  "scripts/evaluate-spatial.ts",
])
  hash.update(readFileSync(file));
const rows: any[] = [];
for (const room of rooms)
  for (const party of quick ? [1] : [1, 2])
    for (const build of quick
      ? ["base", "basin"]
      : ["base", "reaction", "field", "structure", "basin"])
      for (const motor of quick
        ? ["move", "stationary"]
        : ["move", "stationary", "back-wall", "corner"]) {
        const spec = ROOMS[room],
          boss = room === "warden" || room === "guardian-old";
        const sim = new Simulation(
          configFromQuery(
            `?scene=${boss ? "guardian" : "trial/mixed"}&room=${room}&seed=123`,
          ),
        );
        if (party === 2) sim.addPartner();
        for (const p of sim.players) sim.ready(p.id);
        initializeRun(sim.state, 1);
        const agents = sim.players.map((p, i) => {
          sim.state.run!.upgrades[p.id] = GUARDIAN_BUILDS[build] as UpgradeId[];
          if (motor === "back-wall" || motor === "corner") {
            p.pos.x =
              motor === "corner"
                ? -(spec?.width ?? 24) / 2 + 1.3 + i * 1.5
                : i
                  ? 3
                  : -3;
            p.pos.z = (spec?.depth ?? 22) / 2 - 1.3;
            p.pos.y =
              (sim.physics.surfaceAt({ ...p.pos, y: 5 })?.y ?? 0) + 0.75;
            sim.physics.teleport(p);
          }
          return new GuardianPolicy(build, "delayed-aim", 123 + i);
        });
        const traces: any[] = [],
          cells = new Set<string>(),
          fieldCells = new Set<string>();
        let travel = 0,
          stationary = 0,
          boundary = 0,
          exposure = 0,
          stalled = 0,
          close = 0,
          peakFields = 0,
          peakPacket = 0;
        let old = sim.players.map((p) => ({ ...p.pos }));
        const enemyOld = new Map<string, { x: number; z: number }>();
        for (
          let tick = 0;
          tick < 60 * 100 && sim.state.trial!.status === "active";
          tick++
        ) {
          const inputs = Object.fromEntries(
            sim.players.map((p, i) => {
              sim.actorId = p.id;
              const input = agents[i].input(sim);
              if (motor !== "move") {
                input.moveX = 0;
                input.moveZ = 0;
                input.dodge = false;
              }
              return [p.id, input];
            }),
          );
          sim.actorId = "mage-1";
          sim.stepParty(inputs);
          peakFields = Math.max(peakFields, sim.state.fields.length);
          for (const f of sim.state.fields)
            fieldCells.add(
              `${Math.floor(f.pos.x / 2)},${Math.floor(f.pos.z / 2)}`,
            );
          for (const [pIndex, p] of sim.players.entries()) {
            const d = Math.hypot(
              p.pos.x - old[pIndex].x,
              p.pos.z - old[pIndex].z,
            );
            travel += d;
            if (d < 0.005) stationary += 1 / 60;
            if (
              Math.abs(p.pos.x) > (spec?.width ?? 24) / 2 - 2 ||
              Math.abs(p.pos.z) > (spec?.depth ?? 22) / 2 - 2
            )
              boundary += 1 / 60;
            cells.add(`${Math.floor(p.pos.x / 2)},${Math.floor(p.pos.z / 2)}`);
            old[pIndex] = { ...p.pos };
          }
          if (tick % 15 === 0) {
            const enemies = sim.state.entities.filter((e) => e.ai && e.hp > 0);
            for (const e of enemies) {
              const prev = enemyOld.get(e.id);
              if (
                prev &&
                e.kind === "pursuer" &&
                e.stagger <= 0 &&
                e.ai!.phase !== "telegraph" &&
                Math.min(
                  ...sim.players
                    .filter((p) => p.hp > 0)
                    .map((p) =>
                      Math.hypot(p.pos.x - e.pos.x, p.pos.z - e.pos.z),
                    ),
                ) > 3 &&
                Math.hypot(e.pos.x - prev.x, e.pos.z - prev.z) < 0.04
              )
                stalled += 0.25;
              enemyOld.set(e.id, { ...e.pos });
            }
            if (
              enemies.some(
                (e) =>
                  e.kind === "sentinel" &&
                  sim.players.some(
                    (p) => p.hp > 0 && !sim.physics.terrainHit(e.pos, p.pos),
                  ),
              )
            )
              exposure += 0.25;
            if (
              party === 2 &&
              Math.hypot(
                sim.players[0].pos.x - sim.players[1].pos.x,
                sim.players[0].pos.z - sim.players[1].pos.z,
              ) < 1
            )
              close += 0.25;
            traces.push({
              t: +sim.state.time.toFixed(2),
              p: sim.players.map((p) => [p.pos.x, p.pos.z, p.hp]),
              e: enemies.map((e) => [e.id, e.pos.x, e.pos.z]),
              f: sim.state.fields.map((f) => [f.principle, f.pos.x, f.pos.z]),
            });
          }
          if (tick % 60 === 0) {
            const partyState = sim.state.party;
            sim.state.party ??= { ready: [], epoch: 1 };
            peakPacket = Math.max(
              peakPacket,
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
            sim.state.party = partyState;
          }
        }
        const m = sim.state.metrics;
        const row = {
          room,
          party,
          build,
          motor,
          status: sim.state.trial!.status,
          seconds: +sim.state.time.toFixed(2),
          damage: m.playerDamage,
          travel,
          stationary,
          boundary,
          cells: cells.size,
          fieldCells: fieldCells.size,
          exposure,
          stalled,
          close,
          falls: m.falls,
          casts: m.casts,
          reactions: m.transformations,
          outcomes: m.outcomes,
          damageRoutes: Object.values(m.damageRoutes),
          peakFields,
          peakPacket,
        };
        rows.push(row);
        writeFileSync(
          `${out}/${room}-${party}-${build}-${motor}.json`,
          JSON.stringify({ row, traces }),
        );
        console.log(
          room,
          party,
          build,
          motor,
          row.status,
          row.seconds,
          Math.round(row.damage),
          "stalled",
          stalled,
          "falls",
          m.falls,
        );
        sim.dispose();
      }
writeFileSync(
  `${out}/summary.json`,
  JSON.stringify(
    {
      version:
        "spatial-probe-1 / existing guardian-policy-1 and keyboard motor (legacy boundary attraction retained)",
      source: hash.digest("hex").slice(0, 12),
      note: "200ms delayed synthetic observations; unchanged legacy motor favours central 18x16, not validated human skill. Stalled is a suspicion metric, not proof. Static positions are labelled setup fixtures. Each case is unique; no identical repeat coverage.",
      rows,
    },
    null,
    2,
  ),
);
