import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { initPhysics } from "../src/physics/world";
import { Simulation } from "../src/simulation/simulation";
import { configFromQuery } from "../src/experiments/config";
import {
  generateRoute,
  ORDINARY_ROOMS,
  STAGES,
} from "../src/simulation/topology";
import {
  GuardianPolicy,
  GUARDIAN_BUILDS,
} from "../src/diagnostics/guardian-policy";
import { captureCheckpoint } from "../src/simulation/checkpoint";
import { encodeSnapshot } from "../src/network/wire";
const out =
  process.argv.find((x) => x.startsWith("--output="))?.slice(9) ??
  `artifacts/topology-0.3/raw/evaluation-${Date.now()}`;
mkdirSync(out, { recursive: true });
const frequencies: Record<string, number[]> = Object.fromEntries(
  [...ORDINARY_ROOMS, "warden"].map((r) => [r, [0, 0, 0, 0, 0]]),
);
const paths = new Set<string>(),
  graphs = new Set<string>(),
  transitions: Record<string, number> = {};
let count = 0;
for (let seed = 0; seed < 5000; seed++) {
  const r = generateRoute(seed);
  graphs.add(JSON.stringify(r.nodes));
  const walk = (id: string, visited: string[]) => {
    const n = r.nodes.find((n) => n.id === id)!;
    if (!n || visited.includes(n.room) || n.stage !== visited.length)
      throw Error("Invalid graph");
    const rooms = [...visited, n.room];
    if (n.next.length) for (const child of n.next) walk(child, rooms);
    else {
      if (
        n.room !== "warden" ||
        rooms.length !== 5 ||
        STAGES.filter((s) => s.reward).length !== 3
      )
        throw Error("Invalid ending");
      count++;
      paths.add(rooms.join("/"));
      rooms.forEach((r, i) => {
        frequencies[r][i]++;
        if (i) {
          const key = `${rooms[i - 1]} -> ${r}`;
          transitions[key] = (transitions[key] ?? 0) + 1;
        }
      });
    }
  };
  walk("entry", []);
}
writeFileSync(
  `${out}/seeds.json`,
  JSON.stringify(
    {
      seeds: 5000,
      pathsChecked: count,
      uniqueGraphs: graphs.size,
      uniqueVisitedSequences: paths.size,
      frequencies,
      transitions,
      errors: 0,
    },
    null,
    2,
  ),
);
if (!process.argv.includes("--structure-only")) {
  await initPhysics();
  const rows = [];
  for (const seed of [123, 415, 777])
    for (const path of ["000", "111", "010"])
      for (const party of [1, 2])
        for (const build of [
          "base",
          "reaction",
          "field",
          "structure",
          "basin",
        ]) {
          const sim = new Simulation(
            configFromQuery(`?scene=run&seed=${seed}`),
          );
          if (party === 2) sim.addPartner();
          const ids = sim.players.map((p) => p.id),
            agents = ids.map(
              (_, i) => new GuardianPolicy(build, "delayed-aim", seed + i),
            );
          ids.forEach((id) => sim.ready(id));
          let maxPacket = 0,
            maxFields = 0,
            maxPending = 0,
            checkpoints = 0;
          let guardianHp: number[] = [];
          for (
            let tick = 0;
            tick < 60 * 300 &&
            !["victory", "defeat"].includes(sim.state.trial!.status);
            tick++
          ) {
            const s = sim.state,
              r = s.run!,
              stage = s.trial!.encounter;
            if (s.trial!.status === "between") {
              checkpoints++;
              captureCheckpoint(s);
              if (r.reward)
                for (const id of ids) {
                  const options = r.reward.offers[id];
                  // Legal offers only: use a preferred compatible upgrade when present, else first.
                  const choice =
                    GUARDIAN_BUILDS[build].find((x) =>
                      options.includes(x as any),
                    ) ?? options[0];
                  sim.chooseUpgrade(id, r.id, r.reward.id, choice);
                }
              const d = r.route!.decision!;
              if (!d.selected)
                for (const id of ids)
                  sim.voteRoute(
                    id,
                    r.id,
                    d.id,
                    r.route!.boundary,
                    d.options[Number(path[stage])],
                  );
              ids.forEach((id) => sim.ready(id));
              if (s.trial!.encounter === 4)
                guardianHp = sim.players.map((p) => p.hp);
            }
            sim.stepParty(
              Object.fromEntries(
                ids.map((id, i) => [
                  id,
                  sim.withActor(id, () => agents[i].input(sim)),
                ]),
              ),
            );
            maxFields = Math.max(maxFields, s.fields.length);
            maxPending = Math.max(maxPending, s.pending.length);
            if (party === 2 && tick % 30 === 0)
              maxPacket = Math.max(
                maxPacket,
                JSON.stringify(
                  encodeSnapshot(s, sim.config, tick, false, false, s.serial),
                ).length,
              );
          }
          const s = sim.state;
          const row = {
            seed,
            path,
            party,
            policy: build,
            status: s.trial!.status,
            seconds: +s.trial!.elapsed.toFixed(2),
            rooms: s.run!.route!.visited.map(
              (id) => s.run!.route!.nodes.find((n) => n.id === id)!.room,
            ),
            health: sim.players.map((p) => +p.hp.toFixed(1)),
            guardianEntryHp: guardianHp,
            upgrades: s.run!.upgrades,
            results: s.trial!.results,
            damage: s.metrics.playerDamage,
            casts: s.metrics.casts,
            reactions: s.metrics.transformations,
            maxFields,
            maxPending,
            maxLivePacketBytes: maxPacket,
            checkpoints,
          };
          rows.push(row);
          console.log(
            seed,
            path,
            party,
            build,
            row.status,
            row.seconds,
            row.health.join("/"),
          );
          sim.dispose();
        }
  const hash = createHash("sha256");
  for (const f of [
    "src/simulation/topology.ts",
    "src/simulation/rooms.ts",
    "src/simulation/simulation.ts",
    "scripts/evaluate-topology.ts",
  ])
    hash.update(readFileSync(f));
  writeFileSync(
    `${out}/runs.json`,
    JSON.stringify(
      {
        version: "topology-policies-1",
        sourceHash: hash.digest("hex"),
        method:
          "Real Simulation/Rapier; existing guardian-policy-1 with 200ms observations and imperfect aim, same motor. Normal HP, legal offers prioritized toward build. Base is a simple policy with legal upgrades, not an unupgraded fixture. Three matched paths per seed; 300s cap. Synthetic diagnostics, not human skill.",
        rows,
      },
      null,
      2,
    ),
  );
}
console.log(out);
