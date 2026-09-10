import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
const installed = "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe";
const blender =
  process.env.BLENDER_BIN || (existsSync(installed) ? installed : "blender");
execFileSync(blender, ["--background", "--python", "scripts/art/author.py"], {
  stdio: "inherit",
});
execFileSync(process.execPath, ["scripts/art/package.mjs"], {
  stdio: "inherit",
});
