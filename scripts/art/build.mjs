import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
const installed = "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe";
const blender =
  process.env.BLENDER_BIN || (existsSync(installed) ? installed : "blender");
const finish = process.argv.includes("--finish");
execFileSync(
  blender,
  [
    "--background",
    "--python",
    finish ? "scripts/art/finish-author.py" : "scripts/art/author.py",
  ],
  {
    stdio: "inherit",
  },
);
execFileSync(
  process.execPath,
  ["scripts/art/package.mjs", ...(finish ? ["illustrated"] : [])],
  {
    stdio: "inherit",
  },
);
