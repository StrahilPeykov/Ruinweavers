# Architecture

`src/simulation/` owns plain serializable state, fixed-step timing, actors, operations, events, materials, projectiles and AI. No DOM or Three.js imports. `lab.ts` defines physical layout and stable entity IDs.

`trial.ts` defines six reproducible arena configurations, two small enemy lineups plus their mixed encounter, and baseline/candidate enemy tuning. Trial enemies each own `Entity.ai`; the legacy singleton is retained only for the old Lab sentinel. `State.trial` owns ready/active/between/victory/defeat, stage results and elapsed combat time. Between encounters, positions and temporary manifestations reset while player health carries. Physics is rebuilt only at that boundary. Lab-only water/plate behavior is excluded from the trial.

Default scene is `trial`; isolated scenes are `trial/ranged`, `trial/pursuit`, `trial/mixed`. Query `scenario=cross-cover` and `encounterVersion=baseline|candidate` reproduce variations. Changing either through the inspection API validates and resets the encounter. `advanceTrial()` uses the same transition as E/the DOM button; paused `setupTestState` also accepts existing-entity HP for explicitly labelled lifecycle fixtures.

`diagnostics/policies.ts` supplies local scripted inputs; `scripts/evaluate-encounters.ts` steps the actual Simulation/Rapier without rendering. Damage routes retain source, recipient and reason. Projectile counters distinguish original emitter from current damage owner after deflection. These counters are observations, not counterfactual damage prevention.

`src/physics/` owns Rapier's world, capsule character controller, rigid bodies and slab colliders. It consumes movement/impulses and writes positions, velocities and rotations back to simulation state. Y is up; one unit is approximately one meter; entity positions are body centers. The character steps onto low forms and uses gravity over gaps.

`src/render/` adapts simulation into primitive meshes, state indicators, event VFX, lighting, camera and world cursor. Rendering never decides damage. Shared primitive geometry is retained; transient resources are disposed. `src/input/` maps multiple physical inputs into semantic commands. `src/ui/` contains a small DOM HUD and collapsible instruments. `src/experiments/` centralizes gameplay tunables and named presets.

`src/main.ts` is composition and fixed-step scheduling (60 Hz, catch-up capped at .1s). It installs the development-only `window.__RUINWEAVERS__` API. Production builds omit the inspection global. The Magic Lab UI remains available in the built experiment.

## Inspection

Read: `getState`, `getPlayerState`, `getActivePrinciple`, `getWorldStates`, `getMetrics`, `getExperimentConfig`, `getInputProfile`, `getBindings`, `projectWorld`, `getTargeting`.

Setup: `resetLab`, `resetCombatStation`, `setExperimentConfig`, `setCameraPreset`, `setInputProfile`, `setBinding`, `setPaused`. `step(n)` permits at most 600 fixed ticks while paused. `setupTestState` requires pause and only adjusts existing entity positions/states, remaining recovery or field lifetime for reproducible browser conditions. It cannot cast. Getters return copies. Export observations downloads a local JSON record.

Named states: `?scene=magic-lab/free|ergonomics|states|combat|traversal|input-compatibility`. Model, camera, tempo and seed also accept query parameters. All use the same Lab; states change start position and pressure. Ergonomics/input compatibility deliberately retain the normal input implementation.

## Future boundaries

There is one locally controlled actor now, but stable entity IDs, field ownership and actor-tagged operations avoid renderer-owned or anonymous state. No prediction, rooms, transports or replication. JSON is an inspection snapshot, not yet a complete restore format: a future save/network implementation must also capture Rapier contact state or rebuild it at a known boundary. Fixed inputs replay deterministically in the tested runtime; cross-browser physics determinism is not promised.

## Reliability boundaries (1.1)

`Physics.pick` and `surfaceAt` query actual colliders. `Simulation.targeting` supplies both the renderer footprint and cast execution; range/support checks are not duplicated in the view. Directional collision and field contact bands remain small, explicit methods in Simulation. `bufferedCast` is one serializable Secondary intent, separate from delayed Stone eruptions (`pending`). Input clearing cancels it through a callback; DOM state never decides cast correctness.

`render/audio.ts` consumes event IDs after a user gesture. Its conservative WebAudio voices and mute state have no simulation authority. Diagnostics include audio context/cue counts. `?buffer=0` selects the unbuffered comparison; otherwise 120 ms is the default.

No external assets or accounts. The largest bundle dependency is embedded Rapier WASM. Dependencies are pinned by the lockfile.
