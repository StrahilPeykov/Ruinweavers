# Ruinweavers — Art Direction Proof

The current default is a playable visual study of one existing mixed encounter. [Play the fitted court](https://ruinweavers.strahil-peykov.workers.dev/) or [compare the in-engine captures](https://ruinweavers.strahil-peykov.workers.dev/art-study/index.html). The existing solo/co-op run remains at `?scene=run`.

`npm install` then `npm run dev` → http://127.0.0.1:5173/. Root opens the recommended Sculptural Storybook proof. `?scene=trial/mixed&art=ink` selects Ink & Pigment. Explicit Lab/trial/run links without `art` retain the old visuals. With `?scene=run&art=storybook`, only the third court receives the study, including its reward stop. No five-room reskin.

Both remote players refresh the same deployed build. Create co-op → copy the six-character code → partner enters it and presses Enter → both Ready. Keep Public Nostr selected. Existing TURN arrangement is unchanged; [connection limits](docs/COOP.md).

WASD move; pointer aim; LMB/J Primary (hold repeats); RMB/F/K Secondary; 1–4 select; Tab/Q cycle; Space dodge; E continue/revive. Optional wheel remains off by default. Mute, Pause and device-local Standard/Lightweight settings remain available. Instruments stay collapsed.

[Art rules, references and recommendation](docs/ART.md). Original Blender source and generation script are retained. `npm run art:build` authors/exports/optimizes/validates both asset sets; set BLENDER_BIN if Blender is not on PATH or at the documented Windows location. Runtime builds use the committed GLBs and do not need Blender. `npm run art:captures` packages selected local browser recordings; it requires free ffmpeg on PATH. Do not encode clips concurrently with performance tests.

Validation: `npm test`, `npm run test:e2e`, `npm run build`. Run tests and historical evaluators remain available; [run rules](docs/RUN.md), [validation evidence](docs/TESTING.md). Browser automation does not prove human comfort, fun or hardware GPU performance.

After every checked coherent commit, immediately push to the existing upstream and verify it. Existing Cloudflare integration may deploy that push. No force-push, new providers/accounts, billing changes or unrelated direct deployment. See AGENTS.md.

Stop at the visual proof. Applying the winner across the run is a separate bounded rollout, not authorization for more gameplay systems.
