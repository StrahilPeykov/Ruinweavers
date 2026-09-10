import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/browser",
  timeout: 60000,
  workers: 1,
  use: {
    channel: process.env.RUIN_BROWSER_CHANNEL || undefined,
    headless: process.env.RUIN_HEADED !== "1",
    baseURL: "http://127.0.0.1:5173",
    viewport: { width: 1440, height: 900 },
    screenshot: "only-on-failure",
    launchOptions: {
      args:
        process.env.RUIN_RENDERER === "native"
          ? ["--enable-webgl"]
          : [
              "--enable-webgl",
              "--use-gl=angle",
              "--use-angle=swiftshader",
              "--enable-unsafe-swiftshader",
            ],
    },
  },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: true,
  },
  reporter: "list",
});
