# Ruinweavers — The Broken Court

The default is the complete illustrated five-encounter solo/co-op run. [Play](https://ruinweavers.strahil-peykov.workers.dev/). Build Identity 0.2 gives three personal choices after encounters one, three and four: ten Alterations and three prerequisite-gated Theorems. [Build design and catalogue](docs/BUILD-DESIGN.md).

[Three builds in the same final encounter: actual frames and clips](https://ruinweavers.strahil-peykov.workers.dev/build-identity/index.html). These are normal-health input-driven runs, not concept art. [Historical five-room/co-op captures](https://ruinweavers.strahil-peykov.workers.dev/broken-court/index.html) remain available.

`npm install` then `npm run dev` → http://127.0.0.1:5173/. New run obtains a fresh host-owned seed; Retry same seed reproduces offers given the same choices. Both clear health/build/effects and retain fresh run identity. Explicit `?scene=run&seed=123` remains reproducible. Co-op readies together again.

Development links: `?scene=free`, `?scene=trial`, `?scene=run&art=off`, `?scene=trial/mixed&art=storybook|ink|illustrated`. Historical comparison pages remain at `/art-study/index.html` and `/art-finish/index.html`. Controls/settings and instruments stay collapsed during normal play.

Both remote players refresh the same deployed build. Create co-op → copy the six-character code → partner enters it and presses Enter → both Ready. Keep Public Nostr selected. Existing TURN arrangement is unchanged; [connection limits](docs/COOP.md).

WASD move; pointer aim; LMB/J Primary (hold repeats); RMB/F/K Secondary; 1–4 select; Tab/Q cycle; Space dodge; E continue/revive. Optional wheel remains off by default. Mute, Pause and device-local Standard/Lightweight settings remain available. Instruments stay collapsed.

[Art rules, references and recommendation](docs/ART.md). `npm run art:finish` regenerates the current Blender source/GLBs/shared pigment; `npm run art:build` preserves the two historical recipes. Set BLENDER_BIN if needed. Runtime builds use committed GLBs and do not need Blender. `python scripts/art/finish-captures.py` packages current local browser recordings/contact sheets using free ffmpeg and Pillow; `npm run art:captures` retains the old packaging. Never encode clips concurrently with performance tests.

Validation: `npm test`, `npm run test:e2e`, `npm run build`. Run tests and historical evaluators remain available; [run rules](docs/RUN.md), [validation evidence](docs/TESTING.md). Browser automation does not prove human comfort, fun or hardware GPU performance.

After every checked coherent commit, immediately push to the existing upstream and verify it. Existing Cloudflare integration may deploy that push. No force-push, new providers/accounts, billing changes or unrelated direct deployment. See AGENTS.md.

Stop at Build Identity 0.2. A systemic Guardian is a possible next milestone, not authorization to add one now.
