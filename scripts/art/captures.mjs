// Package selected actual browser footage; originals remain ignored/local.
import { execFileSync } from "node:child_process";
import { readFileSync, mkdirSync, copyFileSync, writeFileSync } from "node:fs";
const dir = "artifacts/art-proof/motion",
  out = "public/art-study";
mkdirSync(out, { recursive: true });
for (const art of ["storybook", "ink"])
  copyFileSync(
    `artifacts/art-proof/${art}-landmark.png`,
    `${out}/${art}-landmark.png`,
  );
copyFileSync(
  "artifacts/art-proof/concept-targets.png",
  `${out}/concept-targets.png`,
);
const clips = [];
for (const art of ["storybook", "ink"])
  for (const loadout of ["flow-echo", "capacity-tether"]) {
    const key = `${art}-${loadout}`,
      e = JSON.parse(readFileSync(`${dir}/${key}.json`));
    if (!e.returnToPlay || e.errors.length)
      throw Error(`Refusing failed evidence: ${key}`);
    const start = Math.max(0, e.marks.sequence - 0.3),
      duration = Math.min(28, e.marks.reward - start);
    execFileSync("ffmpeg", [
      "-y",
      "-loglevel",
      "error",
      "-ss",
      String(start),
      "-i",
      `${dir}/raw/${key}.webm`,
      "-t",
      String(duration),
      "-vf",
      "scale=960:-2,fps=24",
      "-an",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "25",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      `${out}/${key}.mp4`,
    ]);
    execFileSync("ffmpeg", [
      "-y",
      "-loglevel",
      "error",
      "-i",
      `${out}/${key}.mp4`,
      "-vf",
      "fps=1/5,scale=480:-2,tile=2x2",
      "-frames:v",
      "1",
      `${dir}/${key}-filmstrip.jpg`,
    ]);
    for (const name of ["reaction", "alteration", "reward"])
      copyFileSync(`${dir}/${key}-${name}.png`, `${out}/${key}-${name}.png`);
    clips.push({
      file: `${key}.mp4`,
      build: e.captures[0].build,
      source: "Playwright video, actual WebGL and DOM, silent",
      wallStart: start,
      duration,
      fixture: e.fixture,
    });
  }
writeFileSync(`${out}/captures.json`, JSON.stringify(clips, null, 2) + "\n");
console.log("Packaged four labelled short gameplay clips and screenshots.");
