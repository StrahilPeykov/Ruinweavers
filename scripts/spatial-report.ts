import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { ROOMS, RUN_ROOMS } from "../src/simulation/rooms";
const input = process.argv[2] ?? "artifacts/spatial-0.3/raw/selected-v4";
const dest = "public/spatial";
const mediaFile = "artifacts/spatial-0.3/browser-validation.json";
const mediaBuild = existsSync(mediaFile)
  ? (JSON.parse(readFileSync(mediaFile, "utf8")).solo?.build ?? "unlabelled")
  : "unlabelled";
mkdirSync(dest, { recursive: true });
const colors = ["#258cba", "#ba538a"];
const esc = (s: string) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;");
function plan(id: string, traces: any[] = []) {
  const r = ROOMS[id],
    scale = 8,
    px = (x: number) => 150 + x * scale,
    pz = (z: number) => 178 + z * scale;
  let svg = `<rect width="300" height="340" fill="#f1eee4"/><text x="15" y="24" font-family="sans-serif" font-size="16" fill="#243c46">${r.name}</text><text x="15" y="44" font-family="sans-serif" font-size="11">${r.width} × ${r.depth} m · ${RUN_ROOMS.includes(id as any) ? "SELECTED" : "GREYBOX ONLY"}</text>`;
  for (const t of r.terrain) {
    svg += `<rect x="${px(t.x - t.w / 2)}" y="${pz(t.z - t.d / 2)}" width="${t.w * scale}" height="${t.d * scale}" fill="${["Floor", "Ramp", "Terrace"].includes(t.name ?? "") ? "#cfceb8" : "#586c70"}" stroke="#8f9c96" stroke-width=".6"/>`;
  }
  for (const p of r.props)
    svg += `<rect x="${px(p.x) - 4}" y="${pz(p.z) - 4}" width="8" height="8" fill="${p.kind === "wood" ? "#ac693b" : "#bd9a55"}"/>`;
  r.anchors.forEach((p) => {
    svg += `<circle cx="${px(p.x)}" cy="${pz(p.z)}" r="4" fill="#b34b31"/>`;
  });
  // A static negative control may start somewhere other than the authored spawn.
  // Trace diagrams show actual actors; plans show both available party starts.
  const starts = traces.length
    ? traces[0].p.map(([x, z]: number[]) => ({ x, z }))
    : r.starts;
  starts.forEach((p: { x: number; z: number }, i: number) => {
    svg += `<circle cx="${px(p.x)}" cy="${pz(p.z)}" r="5" fill="${colors[i]}"/>`;
  });
  if (traces.length) {
    for (let i = 0; i < traces[0].p.length; i++)
      svg += `<polyline fill="none" stroke="${colors[i]}" stroke-width="1.6" opacity=".8" points="${traces.map((t) => `${px(t.p[i][0])},${pz(t.p[i][1])}`).join(" ")}"/>`;
    const ids = [
      ...new Set<string>(traces.flatMap((t) => t.e.map((e: any) => e[0]))),
    ];
    for (const id of ids)
      svg += `<polyline fill="none" stroke="#b34b31" stroke-width=".7" opacity=".35" points="${traces.flatMap((t) => t.e.filter((e: any) => e[0] === id).map((e: any) => `${px(e[1])},${pz(e[2])}`)).join(" ")}"/>`;
    const fields = new Set<string>();
    for (const t of traces)
      for (const f of t.f) {
        const key = `${Math.round(f[1])},${Math.round(f[2])}`;
        if (fields.has(key)) continue;
        fields.add(key);
        svg += `<circle cx="${px(f[1])}" cy="${pz(f[2])}" r="4" fill="#9364a4" opacity=".3"/>`;
      }
  }
  svg += `<text x="15" y="320" font-family="sans-serif" font-size="10">Blue/rose: starts · red: anchors/paths · gold: props</text>`;
  return svg;
}
const svg = (w: number, h: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
writeFileSync(
  `${dest}/candidate-plans.svg`,
  svg(
    1200,
    680,
    Object.keys(ROOMS)
      .map(
        (id, i) =>
          `<g transform="translate(${(i % 4) * 300},${Math.floor(i / 4) * 340})">${plan(id)}</g>`,
      )
      .join(""),
  ),
);
const sections = [];
for (const id of RUN_ROOMS) {
  const plots = [];
  for (const build of ["base", "reaction", "field", "structure", "basin"]) {
    const file = `${input}/${id}-1-${build}-move.json`;
    if (!existsSync(file)) continue;
    const { row, traces } = JSON.parse(readFileSync(file, "utf8"));
    writeFileSync(
      `${dest}/${id}-${build}-trace.svg`,
      svg(300, 340, plan(id, traces)),
    );
    plots.push(
      `<figure><img src="${id}-${build}-trace.svg"><figcaption>${build}: ${row.status}, ${row.seconds}s, ${Math.round(row.damage)} damage; ${row.cells} visited 2m cells</figcaption></figure>`,
    );
  }
  for (const [party, build, motor, label] of [
    [1, "base", "corner", "Base corner / no movement"],
    ...(id === "rotunda" ? [[2, "field", "move", "Two field mages"]] : []),
  ] as const) {
    const file = `${input}/${id}-${party}-${build}-${motor}.json`;
    if (!existsSync(file)) continue;
    const { row, traces } = JSON.parse(readFileSync(file, "utf8")),
      name = `${id}-${party}-${build}-${motor}`;
    writeFileSync(`${dest}/${name}.svg`, svg(300, 340, plan(id, traces)));
    plots.push(
      `<figure><img src="${name}.svg"><figcaption>${label}: ${row.status}, ${row.seconds}s, ${Math.round(row.damage)} damage</figcaption></figure>`,
    );
  }
  sections.push(
    `<section><h2>${esc(ROOMS[id].name)}</h2><p>${esc(ROOMS[id].thesis)} <a href="/?scene=${id === "warden" ? "guardian" : "trial/mixed"}&room=${id}&art=illustrated&quality=lightweight">Play isolated room</a></p><div class="plots">${plots.join("")}</div></section>`,
  );
}
if (existsSync(`${input}/summary.json`)) {
  const summary = JSON.parse(readFileSync(`${input}/summary.json`, "utf8"));
  const compact = {
    ...summary,
    rows: summary.rows.map(
      ({ damageRoutes, outcomes, casts, reactions, ...row }: any) => ({
        ...row,
        casts: Object.values(casts).reduce((a: any, b: any) => a + b, 0),
        reactions,
        control: Object.fromEntries(
          Object.entries(outcomes).filter(
            ([k]) =>
              k.includes("warden:") ||
              k.includes("deflect") ||
              k.includes("block") ||
              k.includes("navigation:"),
          ),
        ),
      }),
    ),
  };
  mkdirSync("artifacts/spatial-0.3", { recursive: true });
  writeFileSync(
    "artifacts/spatial-0.3/selected-results.json",
    JSON.stringify(compact, null, 2),
  );
}
writeFileSync(
  `${dest}/index.html`,
  `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Ruinweavers · Spatial Design 0.3</title><style>body{font:16px/1.5 system-ui;background:#e8e6db;color:#233b42;max-width:1300px;margin:32px auto;padding:0 22px}a{color:#195c7a}img{max-width:100%;height:auto}.plots{display:flex;overflow:auto;gap:12px}figure{margin:0;min-width:240px;flex:1}figcaption{font-size:13px}section{margin:36px 0}video{max-width:100%}</style><h1>The Broken Court — spatial study</h1><p><a href="/?quality=lightweight">Play the five-court run</a> · <a href="/?scene=run-classic">Original Guardian run</a></p><p>Authored plans and synthetic trajectories are diagnostics, not gameplay captures or a layout score. Same mixed enemy composition for ordinary probes; identical Guardian rules for the final room. 200ms delayed observations, imperfect aim and the existing keyboard motor. Empty regions can reflect policy bias. Purple dots show field placement.</p><h2>Eight candidate plans</h2><img src="candidate-plans.svg" alt="Eight room plans">${sections.join("")}<section><h2>Actual gameplay</h2><p>Actual keyboard/mouse gameplay, normal health and enemies. Build ${esc(mediaBuild)}; Model A, balanced camera/tempo, Lightweight. Native Chrome 152 / Intel UHD, 1440×900 viewport, 1152×720 buffer. The contact sheet and recorded 26-second excerpt are separate runs of the same build, not concept art. Performance conditions and exceptions are recorded in the repository evidence.</p><img src="run-contact.png" alt="Actual gameplay in the five selected courts"><video controls preload="none" src="spatial-run.webm"></video></section><h2>Greybox comparisons</h2><p>${["terrace", "broken", "archive"].map((id) => `<a href="/?scene=trial/mixed&room=${id}&art=off">${ROOMS[id].name}</a>`).join(" · ")}</p></html>`,
);
