import { defineConfig } from "vitest/config";
// Each simulation suite owns a WASM physics world. Bound concurrent workers to
// avoid memory/CPU contention on the same laptop used for browser validation.
export default defineConfig({
  test: { include: ["tests/unit/**/*.test.ts"], maxWorkers: 2 },
});
