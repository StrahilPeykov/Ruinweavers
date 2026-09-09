# Ruinweavers · Magic Lab 1.1

Local experimental pre-production for a systemic 3D action roguelite.

```sh
npm install
npm run dev
```

Open [the ready Lab](http://127.0.0.1:5173/?scene=states). No account or paid services are needed. Local testing only; the pre-existing Git remote has not been pushed.

WASD move · pointer aim · LMB / J Primary (hold repeats) · RMB / F / K Secondary · 1–4 select · Tab next / Q previous · Space dodge · E toggles sentinel pressure near the plate. Wheel cycling is an optional checkbox, off by default.

Open **Experiments** for both casting models, three cameras/tempos, input profiles, named scenes, selected tunables and reset. Start with **A · Primary / Secondary**, **balanced** camera/tempo. Try wetting timber then heating it; fracture a structure and push it; bridge the right-hand gap with a Stone slab.

Secondary buffering defaults to 120 ms; zero is available under Selected tunables. Thin footprints preview placement: amber means range-limited, red means invalid. Mute is in the top bar. See the three-minute sequence in the experiments document.

`npm test` · `npm run test:e2e` · `npm run benchmark` · `npm run build`. First-time browser installation: `npx playwright install chromium`.

See [experiments](docs/EXPERIMENTS.md) for evidence and open questions, [testing](docs/TESTING.md) for limitations, and [AGENTS.md](AGENTS.md) for the repository guide.

Cloudflare build settings and dry-run validation: [deployment configuration](docs/DEPLOYMENT.md).

