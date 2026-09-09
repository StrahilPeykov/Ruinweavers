# Architecture

`src/simulation/` owns plain serializable state, fixed-step timing, actors, operations, events, materials, projectiles and AI. No DOM or Three.js imports. `lab.ts` defines physical layout and stable entity IDs.

`src/physics/` owns Rapier's world, capsule character controller, rigid bodies and slab colliders. It consumes movement/impulses and writes positions, velocities and rotations back to simulation state. Y is up; one unit is approximately one meter; entity positions are body centers. The character steps onto low forms and uses gravity over gaps.

`src/render/` adapts simulation into primitive meshes, state indicators, event VFX, lighting, camera and world cursor. Rendering never decides damage. Shared primitive geometry is retained; transient resources are disposed. `src/input/` maps multiple physical inputs into semantic commands. `src/ui/` contains a small DOM HUD and collapsible instruments. `src/experiments/` centralizes gameplay tunables and named presets.

`src/main.ts` is composition and fixed-step scheduling (60 Hz, catch-up capped at .1s). It installs the development-only `window.__RUINWEAVERS__` API. Production builds omit the inspection global. The Magic Lab UI remains available in the built experiment.

## Inspection

Read: `getState`, `getPlayerState`, `getActivePrinciple`, `getWorldStates`, `getMetrics`, `getExperimentConfig`, `getInputProfile`, `getBindings`, `projectWorld`.

Setup: `resetLab`, `resetCombatStation`, `setExperimentConfig`, `setCameraPreset`, `setInputProfile`, `setBinding`, `setPaused`. `step(n)` permits at most 600 fixed ticks while paused. Getters return copies. Export observations downloads a local JSON record.

Named states: `?scene=magic-lab/free|ergonomics|states|combat|traversal|input-compatibility`. Model, camera, tempo and seed also accept query parameters. All use the same Lab; states change start position and pressure. Ergonomics/input compatibility deliberately retain the normal input implementation.

## Future boundaries

There is one locally controlled actor now, but stable entity IDs, field ownership and actor-tagged operations avoid renderer-owned or anonymous state. No prediction, rooms, transports or replication. JSON is an inspection snapshot, not yet a complete restore format: a future save/network implementation must also capture Rapier contact state or rebuild it at a known boundary. Fixed inputs replay deterministically in the tested runtime; cross-browser physics determinism is not promised.

No external assets or accounts. The largest bundle dependency is embedded Rapier WASM. Dependencies are pinned by the lockfile.
