import { defineConfig } from "vite";
import { readdirSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
const hash = createHash("sha256");
for (const path of (readdirSync("src", { recursive: true }) as string[])
  .filter((p) => /\.(ts|css)$/.test(p))
  .sort())
  hash
    .update(path.replaceAll("\\", "/"))
    .update(readFileSync(`src/${path}`, "utf8").replaceAll("\r\n", "\n"));
// Art and runtime must share one build identity; stable GLB paths are versioned
// on fetch with this hash so a rollout cannot reuse the previous asset cache.
for (const path of (readdirSync("public/art", { recursive: true }) as string[])
  .filter((p) => p.endsWith(".glb"))
  .sort())
  hash
    .update(path.replaceAll("\\", "/"))
    .update(readFileSync(`public/art/${path}`));
export default defineConfig({
  define: { __BUILD_ID__: JSON.stringify(hash.digest("hex").slice(0, 12)) },
  server: { host: "127.0.0.1", port: 5173, strictPort: true },
  build: { chunkSizeWarningLimit: 900 },
});
