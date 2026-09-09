# Magic Lab 1.1 validation — 2026-09-09

Gameplay runtime: **de7563e**. Final compact-label spacing: **c3e0d5f**. Documentation/evidence commits do not change those rules.

- Unit: **22/22 passed**. Production build passed; existing large-chunk warning remains.
- Browser: **8/8 passed** on de7563e (2.3 minutes). After the CSS-only spacing correction, the complete movement/input/reset/resize journey passed again, followed by another successful production build.
- Benchmark: final `combat-benchmark.json` matches all baseline defeat times, health outcomes and reported block counts. No tuning changes were made from it.
- Screenshots 01–09 pair with state/config/renderer JSON. Screenshot 10 is the original combat journey on de7563e: default A, balanced camera/tempo, combat scene, 1440×900. Screenshot 11 is the compact rerun on c3e0d5f: A/balanced/input-compatibility, 860×640. Both use the same Playwright Chromium 153.0.8010.12 / ANGLE SwiftShader software renderer, DPR 1. These are not hardware GPU benchmarks.

Inspected: visible steam with recorded vaporization; upper Tide hit and Wet state; basin on the actual raised surface; mouse/keyboard buffering and no held repeats; red invalid-support footprint over the outgoing slab; slab removal/fall; visible expiring slab; red attack line through player effects; target-state label separate from compact placement feedback. Audio context was running, cue counts increased, and mute toggled successfully. Human loudness/timbre and physical trackpad comfort remain unvalidated.

The incorrectly accepted intermediate center-ray observation is preserved and explained in `../iterations/`. The original pre-pass evidence is in `../baseline/`.

Play: `http://127.0.0.1:5173/?scene=states` after `npm run dev`. Defaults are A, balanced camera/tempo, 120 ms Secondary buffer, one field, wheel off. The panel stays collapsed. See `docs/EXPERIMENTS.md` for the short move/reaction/force-cover sequence and three human questions.
