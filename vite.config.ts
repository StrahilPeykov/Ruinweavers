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
export default defineConfig({
  define: { __BUILD_ID__: JSON.stringify(hash.digest("hex").slice(0, 12)) },
  server: { host: "127.0.0.1", port: 5173, strictPort: true },
  build: { chunkSizeWarningLimit: 900 },
});
