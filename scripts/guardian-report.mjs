// Compact, explicitly allowlisted evidence; raw WebRTC diagnostics stay local.
// Run after browser jobs: node scripts/guardian-report.mjs
import { readFileSync, writeFileSync } from "node:fs";
const read = (p) => JSON.parse(readFileSync(p, "utf8"));
const root = "artifacts/guardian-0.1";
const take = (o, keys) =>
  Object.fromEntries(
    keys.filter((k) => o?.[k] !== undefined).map((k) => [k, o[k]]),
  );
const render = (r) => ({
  ...take(r, [
    "quality",
    "browser",
    "renderer",
    "viewport",
    "drawingBuffer",
    "pixelRatio",
    "drawCalls",
    "triangles",
    "activeVfx",
    "geometries",
    "textures",
    "contextLost",
  ]),
  art: take(r.art, [
    "active",
    "ready",
    "loadMs",
    "downloadBytes",
    "assets",
    "sharedGeometries",
  ]),
});
const network = (n) =>
  take(n, [
    "build",
    "protocol",
    "role",
    "status",
    "snapshotsSent",
    "snapshotsReceived",
    "scheduledSnapshotJsonBytes",
    "snapshotIntervals",
    "snapshotApply",
    "hostTickPacing",
    "hostStep",
    "serialization",
    "wireBytes",
    "inputAcknowledgement",
    "scheduled",
    "peakScheduled",
    "snapshotsScheduled",
    "droppedSnapshots",
  ]);
const isolated = (path, name) => {
  const d = read(`${root}/raw/${path}/${name}.json`);
  return {
    fixture: d.fixture,
    wallSeconds: d.wallSeconds,
    seen: d.seen,
    reports: d.reports.map((r) => ({
      build: r.build,
      frames: r.frames,
      render: render(r.metrics.render),
      network: network(r.network),
      status: r.state.trial.status,
      seconds: r.state.trial.elapsed,
      // Host telemetry only; guest counters are deliberately not replicated.
      playerDamage: r.network.role !== "guest" ? r.metrics.playerDamage : null,
      outcomes: r.network.role !== "guest" ? r.metrics.outcomes : undefined,
    })),
  };
};
const run = (name, sweep = "full-suite-final") => {
  const d = read(`${root}/raw/${sweep}/run/${name}.json`);
  return {
    ...take(d, [
      "wallSeconds",
      "combatSeconds",
      "status",
      "results",
      "upgrades",
      "casts",
      "reactions",
      "outcomes",
    ]),
    build: d.environment.build,
    measurements: d.measurements.map((m) => ({
      ...m,
      render: render(m.render),
    })),
    transport: d.transport.map(network),
  };
};
const datasets = ["final", "held-out"].map((n) => read(`${root}/${n}.json`));
const rows = datasets.flatMap((d) => d.rows);
const mean = (a, key) =>
  +(a.reduce((sum, r) => sum + r[key], 0) / a.length).toFixed(2);
const comparisons = [...new Set(rows.map((r) => r.name))].map((name) => ({
  name,
  cases: [1, 2].map((party) => {
    const a = rows.filter(
      (r) => r.name === name && r.party === party && r.mode === "delayed-aim",
    );
    return {
      party,
      count: a.length,
      victories: a.filter((r) => r.result === "victory").length,
      seconds: mean(a, "seconds"),
      damage: mean(a, "damage"),
    };
  }),
}));
const report = {
  runtime: "9dd14b9dcd8f",
  protocol: 3,
  conditions:
    "Windows, installed headless Chrome 152, ANGLE Intel UHD D3D11, 1440x900 CSS; no video/encoding/batches during these frame samples. Same-machine clients/local signaling, not remote laptop or TURN validation.",
  limits:
    "Scripted policies are not human skill models. Isolated builds and initial downed state are fixtures; casts, movement, dodge, revive and complete-run reward choices use real browser inputs. Network summaries are rolling bounded windows, not entire-run distributions.",
  policy: datasets[0].policy,
  evaluationSource: datasets[0].source,
  evaluatedCases: rows.length,
  victories: rows.filter((r) => r.result === "victory").length,
  comparisons,
  isolatedLightweight: Object.fromEntries(
    ["base", "reaction", "field", "structure", "basin", "pair"].map((n) => [
      n,
      isolated("full-suite-final/guardian", n),
    ]),
  ),
  isolatedStandard: {
    base: isolated("standard", "base"),
    pair: isolated("standard", "pair"),
  },
  earlierCurrentRuntimePair: isolated("full-suite-clean/guardian", "pair"),
  completeRuns: { solo: run("solo"), coop: run("coop") },
  earlierCompleteRuns: {
    solo: run("solo", "full-suite-clean"),
    coop: run("coop", "full-suite-clean"),
  },
  resetResources: read(
    `${root}/raw/full-suite-final/guardian/reset-resources.json`,
  ),
  standardResetResources: read(`${root}/raw/standard/reset-resources.json`),
};
writeFileSync(
  `${root}/validation.json`,
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  "Wrote sanitized Guardian evidence. Raw connection paths and identifiers omitted.",
);
