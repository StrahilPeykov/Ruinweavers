# Cloudflare deployment configuration

Gameplay runs in the browser. `wrangler.jsonc` serves Vite's `dist` output with SPA fallback. A small `worker.ts` handles only `/api/turn` for optional relay credentials; all other requests use the ASSETS binding. No Cloudflare Vite plugin is required. Keeping a Wrangler config in the repository prevents automatic framework setup from attempting to rewrite `vite.config.ts`.

Cloudflare Workers Builds settings:

- Root directory: repository root.
- Build command: `npm run build`.
- Deploy command: `npx wrangler deploy`.
- Install development dependencies: TypeScript, Vite and Wrangler are build tools.

Set the build command explicitly in the dashboard: Workers Builds does not honor Wrangler custom-build settings. The configuration's `build.command` additionally supports ordinary CLI use outside Workers Builds.

Local validation, without publishing:

```sh
npm run deploy:check
```

This builds the game and runs Wrangler in dry-run mode. Standing workflow (2026-09-10): every checked commit is immediately pushed to the existing upstream and verified. Those pushes may trigger the existing Workers Builds pipeline. Do not disable it or perform unrelated direct deployments. Never commit credentials.

The reported `Cannot modify Vite config: could not find a valid plugins array` error came from Wrangler automatic configuration, not TypeScript or the game. The preceding esbuild install-script warning was not the failure shown in that log.

Wrangler is pinned to 4.130.0 for reproducible CI. Its Miniflare dependency pins sharp 0.35.2; a scoped override selects the patched 0.35.4 release for GHSA-rgj7-g3m4-5g8c. Remove the override when upstream includes the fix.

References: [Cloudflare static assets](https://developers.cloudflare.com/workers/static-assets/), [Workers Builds configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/).

Remote co-op may need TURN when direct WebRTC fails. See [TURN setup](TURN.md). Serving the game on Cloudflare does not itself relay WebRTC traffic. The existing deployed Cloudflare TURN configuration and its narrow authorization are retained; secrets remain server-side.
