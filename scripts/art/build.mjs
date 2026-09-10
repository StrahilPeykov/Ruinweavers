import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
const installed = "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe";
const blender =
  process.env.BLENDER_BIN || (existsSync(installed) ? installed : "blender");
const finish = process.argv.includes("--finish");
const guardian = process.argv.includes("--guardian");
execFileSync(
  blender,
  [
    "--background",
    "--python",
    guardian
      ? "scripts/art/warden-author.py"
      : finish
        ? "scripts/art/finish-author.py"
        : "scripts/art/author.py",
  ],
  {
    stdio: "inherit",
  },
);
execFileSync(
  process.execPath,
  [
    "scripts/art/package.mjs",
    ...(guardian ? ["illustrated", "guardian"] : finish ? ["illustrated"] : []),
  ],
  {
    stdio: "inherit",
  },
);
