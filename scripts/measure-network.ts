import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { initPhysics } from "../src/physics/world";
import { Simulation } from "../src/simulation/simulation";
import { configFromQuery } from "../src/experiments/config";
import { CoopSession } from "../src/network/session";
import { encodeSnapshot } from "../src/network/wire";
import { idleInput } from "../src/simulation/types";
await initPhysics();
const sim = new Simulation(configFromQuery("?scene=trial/mixed"));
sim.addPartner();
sim.ready("mage-1");
sim.ready("mage-2");
const session = new CoopSession(
  sim,
  () => {},
  () => {},
);
session.role = "guest";
session.peerId = "test";
session.lastSend = 100;
const packets: any[] = [];
session.inputAction = {
  send: async (p: any) => {
    packets.push(p);
  },
} as any;
session.submit({ ...idleInput(), primary: true }, 116);
session.submit(idleInput(), 133);
const tap = packets[0];
const timings: number[] = [],
  sizes: number[] = [],
  compactTimes: number[] = [],
  compactSizes: number[] = [];
let eventAck = 0;
for (let i = 0; i < 600; i++) {
  sim.stepParty({
    "mage-1": { ...idleInput(), primary: true },
    "mage-2": { ...idleInput(), primary: true, select: "Tide" },
  });
  if (i % 3 === 0) {
    const t = performance.now();
    const packet = {
      version: 1,
      seq: i,
      state: structuredClone(sim.state),
      config: { ...sim.config },
      paused: false,
    };
    sizes.push(new TextEncoder().encode(JSON.stringify(packet)).byteLength);
    timings.push(performance.now() - t);
    const start = performance.now();
    const compact = encodeSnapshot(
      sim.state,
      sim.config,
      i,
      false,
      i === 0,
      eventAck,
    );
    compactSizes.push(
      new TextEncoder().encode(JSON.stringify(compact)).byteLength,
    );
    compactTimes.push(performance.now() - start);
    eventAck = Math.max(eventAck, ...sim.state.events.map((e) => e.id));
  }
}
const summary = (a: number[]) => ({
  mean: a.reduce((x, y) => x + y, 0) / a.length,
  p95: [...a].sort((x, y) => x - y)[Math.floor(a.length * 0.95)],
  max: Math.max(...a),
});
const out = process.argv[2] ?? "artifacts/smoothness/candidate-simulation.json";
mkdirSync("artifacts/smoothness", { recursive: true });
writeFileSync(
  out,
  JSON.stringify(
    {
      build: execFileSync("git", ["rev-parse", "HEAD"]).toString().trim(),
      protocol: 2,
      sourceHashes: Object.fromEntries(
        [
          "src/network/wire.ts",
          "src/network/input-mailbox.ts",
          "src/network/session.ts",
          "src/simulation/simulation.ts",
          "src/physics/world.ts",
          "src/experiments/config.ts",
        ].map((path) => [
          path,
          createHash("sha256").update(readFileSync(path)).digest("hex"),
        ]),
      ),
      environment:
        "Node, actual Simulation/Rapier; mocked input transport; not WebRTC or GPU",
      tapAt116Released133AfterSend100: tap,
      fullStateBytes: summary(sizes),
      fullStateCloneAndJsonMs: summary(timings),
      compactBytes: summary(compactSizes),
      compactCloneAndJsonMs: summary(compactTimes),
      samples: sizes.length,
    },
    null,
    2,
  ),
);
sim.dispose();
console.log(out);
