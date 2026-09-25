import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { ROOMS } from "../src/simulation/rooms";
import { ORDINARY_ROOMS, generateRoute } from "../src/simulation/topology";
const dest = "public/topology";
mkdirSync(dest, { recursive: true });
function plan(id: string, traces: any[] = []) {
  const r = ROOMS[id],
    x = (v: number) => 150 + v * 8,
    z = (v: number) => 170 + v * 8;
  let body = `<rect width="300" height="310" fill="#ede6d1"/><text x="12" y="22" font-size="16" fill="#263c41">${r.name}</text>`;
  for (const t of r.terrain)
    body += `<rect x="${x(t.x - t.w / 2)}" y="${z(t.z - t.d / 2)}" width="${t.w * 8}" height="${t.d * 8}" fill="${t.name === "Floor" ? "#c9c9ae" : "#536b70"}" stroke="#80908b" stroke-width=".5"/>`;
  r.props.forEach(
    (p) =>
      (body += `<circle cx="${x(p.x)}" cy="${z(p.z)}" r="5" fill="#bc843a"/>`),
  );
  r.anchors.forEach(
    (p) =>
      (body += `<circle cx="${x(p.x)}" cy="${z(p.z)}" r="4" fill="#b45242"/>`),
  );
  r.starts.forEach(
    (p, i) =>
      (body += `<circle cx="${x(p.x)}" cy="${z(p.z)}" r="5" fill="${i ? "#a54886" : "#287daa"}"/>`),
  );
  if (traces.length) {
    for (let i = 0; i < traces[0].p.length; i++)
      body += `<polyline fill="none" stroke="${i ? "#a54886" : "#287daa"}" stroke-width="1.2" points="${traces.map((t) => `${x(t.p[i][0])},${z(t.p[i][1])}`).join(" ")}"/>`;
    const fields = new Set<string>();
    for (const t of traces)
      for (const f of t.f) {
        const key = `${Math.round(f[1])},${Math.round(f[2])}`;
        if (fields.has(key)) continue;
        fields.add(key);
        body += `<circle cx="${x(f[1])}" cy="${z(f[2])}" r="4" fill="#935e9f" opacity=".4"/>`;
      }
  }
  return body;
}
const svg = (w: number, h: number, b: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" font-family="sans-serif">${b}</svg>`;
writeFileSync(
  `${dest}/room-pool.svg`,
  svg(
    1200,
    620,
    [...ORDINARY_ROOMS, "warden"]
      .map(
        (id, i) =>
          `<g transform="translate(${(i % 4) * 300},${Math.floor(i / 4) * 310})">${plan(id)}</g>`,
      )
      .join(""),
  ),
);
for (const room of ["approach", "diagonal"]) {
  const { traces } = JSON.parse(
    readFileSync(
      `artifacts/topology-0.3/raw/candidates-v3/${room}-2-field-move.json`,
      "utf8",
    ),
  );
  writeFileSync(`${dest}/${room}-trace.svg`, svg(300, 310, plan(room, traces)));
}
const r = generateRoute(123);
const routes = ["000", "111"].map((path) => {
  let n = r.nodes[0];
  const names = [ROOMS[n.room].name];
  for (const bit of path) {
    n = r.nodes.find((x) => x.id === n.next[Number(bit)])!;
    names.push(ROOMS[n.room].name);
  }
  return [...names, "Warden crossing"].join(" → ");
});
writeFileSync(
  `${dest}/index.html`,
  `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Broken Court — authored paths</title><style>body{margin:0;background:#263b40;color:#eee4cd;font:16px/1.6 system-ui}main{max-width:1180px;margin:auto;padding:32px}h1,h2{font-family:Georgia,serif}a{color:#eac27f}img,video{width:100%;border-radius:8px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:20px}figure{margin:16px 0}small,figcaption{color:#b9cdcb}code{color:#eac27f}@media(max-width:650px){.pair{grid-template-columns:1fr}}</style><main><p><a href="/?quality=lightweight">Play Ruinweavers</a> · <a href="/?scene=run-spatial">Previous fixed route</a> · <a href="/spatial/index.html">Spatial Design evidence</a></p><h1>One court complex. Different paths.</h1><p>Four ordinary fights, three personal upgrades, three shared forks, one Bound Warden. No generated walls and no additional enemies. The host owns the seeded route; two mages agree before moving on.</p><h2>The authored room pool</h2><img src="room-pool.svg" alt="Six ordinary authored rooms and Warden crossing"><p>Blue/rose: player starts. Red: spawn anchors. Ochre: material props. Leaning approach and Oblique court are the two new spaces. The old rejected vertical/gap studies remain diagnostics.</p><h2>Same seed, different choices</h2><p>Generator 2, seed 123, left forks: ${routes[0]}</p><p>Right forks: ${routes[1]}</p><div class="pair"><figure><img src="route-disagreement.jpg" alt="Actual co-op route disagreement"><figcaption>Actual local WebRTC clients: each mage has a different vote. Combat waits for agreement.</figcaption></figure><figure><img src="route-agreed.jpg" alt="Actual agreed next destination"><figcaption>Agreement locks one destination; both still ready to begin.</figcaption></figure></div><h2>Actual gameplay</h2><video src="route-gameplay.mp4" controls muted playsinline preload="metadata"></video><p><small>Recorded real keyboard/mouse input with active enemies. Local Chrome/Intel UHD; recording affects frame cost. No concept imagery.</small></p><div class="pair"><img src="approach-gameplay.jpg" alt="Actual combat in Leaning approach"><img src="diagonal-gameplay.jpg" alt="Actual combat in Oblique court"></div><h2>Spatial diagnostic traces</h2><div class="pair"><img src="approach-trace.svg" alt="Two field policies moving in Leaning approach"><img src="diagonal-trace.svg" alt="Two field policies moving in Oblique court"></div><p>Same delayed-observation field policies; blue/rose paths and purple field placements. These show opportunities and possible blind spots, not a layout score or human skill.</p><h2>What is and is not proved</h2><p>5,000 seeds / 40,000 paths checked; no repeats or malformed endings. Ninety matched synthetic runs completed. Base unupgraded room probes also completed both new rooms. Real solo and two-client runs exercise personal rewards and route agreement. Basin/Ember remains strong; no spell/Guardian tuning was changed.</p><p>Checkpoint schema 1 stores seed, visited path, builds, health and boundary choices only. Restore rebuilds an encounter; it is not mid-combat physics migration. Cloud persistence, reconnect, host leases and hosted signaling are not implemented.</p></main></html>`,
);
