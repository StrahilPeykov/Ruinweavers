# Ruinweavers — The Broken Court

Current milestone: **Run Topology 0.3**. Play four authored courts selected through three shared route choices, then face the Bound Warden. Personal build rewards remain after fights 1, 3 and 4. Root opens the illustrated route run; `?scene=run-spatial` preserves the prior fixed sequence. [Route rules and validation](docs/RUN-TOPOLOGY.md); [room plans and actual route gameplay](https://ruinweavers.strahil-peykov.workers.dev/topology/index.html). Session recovery is not implemented.


Historical Spatial Design 0.3 replaced the repeated physical layouts with **Split court, Offset gallery, Rotunda, Repair yard and Warden crossing**. Five beats, enemies, magic, builds and co-op rules stay fixed. [Historical room plans and trajectories](https://ruinweavers.strahil-peykov.workers.dev/spatial/index.html); [spatial decisions and limitations](docs/SPATIAL-DESIGN.md). `?scene=run-classic` preserves the previous Guardian run; `?scene=guardian&room=warden` practices the new finale. Rejected candidates remain explicit greybox comparisons, never normal progression.

The default is the complete illustrated five-encounter solo/co-op run. [Play](https://ruinweavers.strahil-peykov.workers.dev/). Build Identity 0.2 gives three personal choices after encounters one, three and four: ten Alterations and three prerequisite-gated Theorems. [Build design and catalogue](docs/BUILD-DESIGN.md).

[Current gameplay, video and route comparisons](https://ruinweavers.strahil-peykov.workers.dev/topology/index.html) were captured after the wall-flicker fix. [Selected visual history](https://ruinweavers.strahil-peykov.workers.dev/history/index.html) retains two useful comparison sheets; obsolete clips and repeated art captures are recoverable from Git, rather than shipped as current media. See [media policy](docs/MEDIA.md).

`npm install` then `npm run dev` → http://127.0.0.1:5173/. New run obtains a fresh host-owned seed; Retry same seed reproduces route options, visited rooms and offers given the same route/build choices. Both clear health/build/effects and retain fresh run identity. Explicit `?scene=run&seed=123` remains reproducible. Co-op readies together again.

Development links: `?scene=free`, `?scene=trial`, `?scene=run&art=off`, `?scene=trial/mixed&art=storybook|ink|illustrated`. Historical gallery URLs now explain their retirement and link to current media. The historical playable proof scenes remain. Controls/settings and instruments stay collapsed during normal play.

Both remote players refresh the same deployed build. Create co-op → copy the six-character code → partner enters it and presses Enter → both Ready. Keep Public Nostr selected. Existing TURN arrangement is unchanged; [connection limits](docs/COOP.md).

WASD move; pointer aim; LMB/J Primary (hold repeats); RMB/F/K Secondary; 1–4 select; Tab/Q cycle; Space dodge; E continue/revive. Optional wheel remains off by default. Mute, Pause and device-local Standard/Lightweight settings remain available. Instruments stay collapsed.

[Art rules, references and recommendation](docs/ART.md). `npm run art:finish` regenerates the current Blender source/GLBs/shared pigment; `npm run art:build` preserves the two historical recipes. Set BLENDER_BIN if needed. Runtime builds use committed GLBs and do not need Blender. `python scripts/topology-captures.py` packages the current showcase using free ffmpeg and Pillow. Historical capture recipes write only to the ignored media archive, not the public site. Never encode clips concurrently with performance tests.

Validation: `npm test`, `npm run test:e2e`, `npm run build`. Run tests and historical evaluators remain available; [run rules](docs/RUN.md), [validation evidence](docs/TESTING.md). Browser automation does not prove human comfort, fun or hardware GPU performance.

After every checked coherent commit, immediately push to the existing upstream and verify it. Existing Cloudflare integration may deploy that push. No force-push, new providers/accounts, billing changes or unrelated direct deployment. See AGENTS.md.

The fifth court now culminates in **The Bound Warden**, with physical ward plates, Shard Volley, Bound March and Furnace Pulse. [Guardian rules and validation](docs/GUARDIAN.md); [current run footage](https://ruinweavers.strahil-peykov.workers.dev/topology/index.html). `?scene=guardian` opens the isolated fight; `?scene=run-legacy` preserves the ordinary-enemy five-court regression.

Guardian 0.1 was closed at 4deeb7a: 117 unit tests, production build and 58 browser tests passed; one opt-in live TURN probe was skipped. Its historical matched development/held-out evidence remains. Current validation and remaining limitations are in TESTING and RUN-TOPOLOGY; SPATIAL-DESIGN preserves the room study.
