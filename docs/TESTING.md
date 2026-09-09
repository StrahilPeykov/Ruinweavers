# Validation and limitations

## Reproduce

```sh
npm test
npm run build
npm run test:e2e
npm run benchmark
# With npm run dev already running:
npx tsx scripts/play-session.ts
```

The browser suite installs no accounts/services and connects only to localhost. `npx playwright install chromium` prepares its free browser if missing. Screenshot/state evidence is in `artifacts/`. The normal app browser was also opened and operated through computer-use tooling.

## Coverage

- **9 Vitest cases:** thermal/moisture transformation and provenance; flammability/cooling; fracture-force consequences; manifestation replacement and inverse removal; deterministic fixed-input replay/reset/serialization; normalized movement and dodge recovery; bidirectional physical cover; recovery from repeated stagger; actual physics bridge crossing from a clear spawn.
- **5 Playwright journeys:** boot; diagonal WASD movement with independent world aim; direct 1–4 and Tab/Q; repeated LMB; RMB Secondary; held F produces one Secondary; held J repeats Primary; dodge; scene/reset; resize to 860×640; real target wetness and thermal transformation; inverse cooling; camera/model switching; combat under pressure; bridge traversal; E interact; rebound R/C actions during movement; optional wheel off/on; pause immediately after reset with queued inputs cleared on resume. Errors are checked in the main journey and representative session.
- **Representative 1080p session:** same strafe/switch/cast/dodge sequence through all three tempos; inverse fracture/force on world objects; three-field stress setup; screenshots and final simulation/renderer JSON. The session records counterfactual limits as observations rather than asserting subjective feel.
- **Agent visual review:** balanced/cinematic/tactical cameras, wet/thermal effects, telegraphs, fracture indicators, compact layout, bridge traversal, three tempos and a dense-effects setup. Screenshots are checked alongside simulation state.

The cooling journey waits for already-launched heat bolts before asserting cooling. Those bolts remain authoritative and can reheat a cooled target. Browser setup APIs establish deterministic starts; casts, movement and selection use actual keyboard/pointer events.

## Performance observations

The normal Codex app browser at a requested **1920×1080 viewport** displayed **16.7 ms/frame** in the Lab, first at 73 draws and then at 86 draws after a Tide basin / Ember sequence with two vaporization events. This is a short local observation, not a guarantee across laptops. GPU identity was not captured in that browser.

The headless Playwright 1080p session identified **ANGLE SwiftShader (software rendering)**. Its final three-field snapshot measured approximately **171 ms average / 233 ms p95**, 83 draw calls and 2,348 triangles. These figures do not establish GPU performance. Input journeys count simulation ticks so they can run under software rendering; real wall-time slowdown is retained in frame metrics. At sustained >100 ms frames, capped catch-up slows simulated time to avoid a runaway backlog.

Default quality uses a 1024 shadow map, no post-processing, primitive geometry and capped pixel ratio. The bundled build is approximately 3.44 MB raw / 1.25 MB gzip, largely Rapier's embedded WASM. Vite reports a chunk-size warning; it is not a build failure. No render resource growth was evident in the short recorded session; a long soak test has not been performed.

## Known limits for the human test

1. **Trackpad hardware is not validated.** Browser pointer events cannot emulate palm rejection, gesture recognition, click-drag comfort or keyboard rollover. J Primary and F/K Secondary were exercised with real keyboard input; neither needs a physical right mouse button. Pointing must still work while typing on your device. Test sensitivity/settings on the actual laptop.
2. The cursor currently intersects terrain and casts toward the ground point. Aim at a target's footprint, particularly behind tall objects. There is no lock-on. Low camera pitch makes this distinction more noticeable. Fully surface-aware elevated aiming remains a refinement.
3. The kinematic player receives thermal/wet state but does not react to Gale impulses like dynamic props. This is a deliberate limitation of character movement in this phase; universal force responses are not complete. B Stone binds/fractures existing structures; it has no persistent traversal creation.
4. Tide jets and Gale cones use coarse planar target tests with terrain occlusion; Ember has swept movement/terrain collision and vertical aim adjustment. This is not a general collision-shape spell engine. Field effects are simple proximity operations. No fluid cells, propagation across touching materials, or arbitrary destructible geometry.
5. Sentinel is a single deterministic pressure instrument. The scripted dodge policy avoided all damage. Human encounter pressure and the possible dominance of Basin + Ember remain unresolved. No wider balance claim is justified.
6. No audio, final animation, gamepad/touchscreen controls, saved profiles or complete snapshot restore. Bindings and tunables last for the current page; use query parameters for repeatable model/camera/tempo/scene starts. WebGL 2 is required. Context loss is handled but forced context-loss recovery was not separately tested.
7. The experiment panel stays live during combat. Use Pause to inspect safely. Casts during dodge are rejected rather than buffered. Primary repeats; Secondary is discrete across both mouse and keyboard.

## Bugs found and fixed

Continuous burn hit flashes; repeat-stagger suppression of sentinel attacks; stale camera projection immediately after reset; collision mismatch between rendered cover and blocked bolts; traversal spawn overlap with ballast; tiny station labels; per-frame telegraph object churn; clipped frame-time instrumentation; fallback device attribution on short key taps; rebound control hints displaying default keys.

Human play remains necessary for responsiveness, motion comfort, real finger conflicts, best selection method, baseline enjoyment and whether each Principle earns its complexity. The lab is ready for that judgment; Phase 2 is not authorized by passing these checks.

