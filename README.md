# Ruinweavers · Co-op Trial 0.1

Local experimental pre-production for a systemic 3D action roguelite.

```sh
npm install
npm run dev
```

Open [the combat trial](http://127.0.0.1:5173/). Press **E / Start trial**. Clear ranged pressure, pursuit pressure, then both; health carries between encounters. E continues after a clear. **Restart trial** restores the starting state after victory/defeat or from the top bar. No account or paid services; nothing has been pushed, published or redeployed.

For two players, each runs this same build locally. Leave **Public Nostr** selected; one clicks **Create co-op**, uses **Copy code** to share the six-character room code, and the other clicks **Join co-op**. Both press **Ready** at each transition. Hold **E** near a downed partner to revive; encounter clears also restore them. See [connection steps and limits](docs/COOP.md). Actual WebRTC was tested on this machine; remote-network connectivity is not yet verified.

WASD move · pointer aim · LMB / J Primary (hold repeats) · RMB / F / K Secondary · 1–4 select · Tab next / Q previous · Space dodge · E start/continue. Wheel cycling is optional, off by default. Mute and Pause are in the top bar.

Keep the default **A · Primary / Secondary**, **balanced** camera/tempo and collapsed instruments. Try moving and dodging while holding Ember; place a **Tide Basin (2 + RMB/F)** and follow with **Ember (1 + LMB)**; use **Gale (3 + LMB)** to gain space or **Stone (4 + RMB/F)** for cover. Cover stops your low bolts too.

Secondary buffering remains 120 ms. Thin footprints preview placement: amber means range-limited, red means invalid. **Experiments** retains Model B, presets and the original Lab scenes. Isolated diagnostics: `?scene=trial/ranged`, `trial/pursuit`, `trial/mixed`. The original Lab remains at `?scene=states`.

`npm test` · `npm run test:e2e` · `npm run benchmark` · `npm run evaluate` · `npm run build`. First-time browser installation: `npx playwright install chromium`.

See [evaluation](docs/EVALUATION.md) for matched strategy results and limitations, [testing](docs/TESTING.md) for validation, and [AGENTS.md](AGENTS.md) for the repository guide. Scripted play does not establish balance, physical trackpad comfort or subjective fun. This milestone ends here. No roguelite, progression or classes; no public push/deployment.

Cloudflare build settings and dry-run validation: [deployment configuration](docs/DEPLOYMENT.md).

