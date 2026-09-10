# Architecture

`src/simulation/` owns plain serializable state, fixed-step timing, actors, operations, events, materials, projectiles and AI. No DOM or Three.js imports. `lab.ts` defines physical layout and stable entity IDs.

`trial.ts` defines six reproducible arena configurations, two small enemy lineups plus their mixed encounter, and baseline/candidate enemy tuning. Trial enemies each own `Entity.ai`; the legacy singleton is retained only for the old Lab sentinel. `State.trial` owns ready/active/between/victory/defeat, stage results and elapsed combat time. Between encounters, positions and temporary manifestations reset while player health carries. Physics is rebuilt only at that boundary. Lab-only water/plate behavior is excluded from the trial.

Default scene is `run`; `State.run` owns actor upgrades and validated personal rewards, explicitly replicated in Protocol 3. See [run contract](RUN.md). The old `trial` remains unchanged; isolated scenes are `trial/ranged`, `trial/pursuit`, `trial/mixed`. Query `scenario=cross-cover` and `encounterVersion=baseline|candidate` reproduce variations. Changing either through the inspection API validates and resets the encounter. `ready(actorId)` gates party transitions on both actors; `advanceTrial()` is the internal transition primitive; paused `setupTestState` also accepts existing-entity HP for explicitly labelled lifecycle fixtures.

`diagnostics/policies.ts` supplies local scripted inputs; `scripts/evaluate-encounters.ts` steps the actual Simulation/Rapier without rendering. Damage routes retain source, recipient and reason. Projectile counters distinguish original emitter from current damage owner after deflection. These counters are observations, not counterfactual damage prevention.

`src/physics/` owns Rapier's world, capsule character controller, rigid bodies and slab colliders. It consumes movement/impulses and writes positions, velocities and rotations back to simulation state. Y is up; one unit is approximately one meter; entity positions are body centers. The character steps onto low forms and uses gravity over gaps.

`src/render/` adapts simulation into primitive meshes, state indicators, event VFX, lighting, camera and world cursor. Rendering never decides damage. Shared primitive geometry is retained; transient resources are disposed. `src/input/` maps multiple physical inputs into semantic commands. `src/ui/` contains a small DOM HUD and collapsible instruments. `src/experiments/` centralizes gameplay tunables and named presets.

`src/main.ts` is composition and fixed-step scheduling (60 Hz, catch-up capped at .1s). It installs the development-only `window.__RUINWEAVERS__` API. Production builds omit the inspection global. The Magic Lab UI remains available in the built experiment.

## Inspection

Read: `getState`, `getPlayerState`, `getActivePrinciple`, `getWorldStates`, `getMetrics`, `getExperimentConfig`, `getInputProfile`, `getBindings`, `projectWorld`, `getTargeting`.

Setup: `resetLab`, `resetCombatStation`, `setExperimentConfig`, `setCameraPreset`, `setInputProfile`, `setBinding`, `setPaused`. `step(n)` permits at most 600 fixed ticks while paused. `setupTestState` requires pause and only adjusts existing entity positions/states, remaining recovery or field lifetime for reproducible browser conditions. It cannot cast. Getters return copies. Export observations downloads a local JSON record.

Named states: `?scene=magic-lab/free|ergonomics|states|combat|traversal|input-compatibility`. Model, camera, tempo and seed also accept query parameters. All use the same Lab; states change start position and pressure. Ergonomics/input compatibility deliberately retain the normal input implementation.

## Actor and network boundaries

`State.actors` owns per-player selection, aim, cast/buffer/dodge timings, vertical velocity and revive progress; entity HP/position/material state remains keyed by stable actor ID. `withActor(id, fn)` supplies synchronous simulation context and restores it afterward. Legacy root-level accessors alias mage-1 only for old solo inspection/tests; no gameplay uses `entities[0]` as player identity. Party readiness and epoch are serializable. Field capacity is per source. AI retains a living target through telegraph; shown melee areas test every living recipient.

`network/session.ts` adapts Trystero 0.25.4 actions to one host/one guest. Host runs Simulation once; guest sends semantic input and accepts snapshots. `network/input-mailbox.ts` validates bounded finite aim, actual WASD directions, action enums/booleans, sequence/epoch/rate. It preserves one discrete Secondary intent and one Primary press latch with captured aim/Principle, alongside the latest held Primary state. Primary press IDs are repeated until processed acknowledgement or bounded expiry and deduplicated by the host, so a reordered release cannot erase the edge. Each latch is consumed once; normal cooldown rules still apply. Stale/focus/transition clearing never queues a future burst. `network/wire.ts` explicitly carries live entities/actors/fields/projectiles and bounded acknowledged events/provenance; epoch bootstrap carries static terrain/materials/configuration. Full diagnostic history remains host-local. Guest fixed Rapier colliders serve targeting and local walk-preview queries only. `Simulation.stepParty` rejects replica advancement.

Network inspection: `getNetworkState`, `getNetworkDiagnostics`, `getPresentation`, `getRtcStats`, `setNetworkProfile`, `silenceNetworkInput`. Production Export observations includes sanitized diagnostics without requiring this development API. Host-only paused fixtures can arrange existing entity HP/position/states/AI; guest cannot step/setup/reset the shared simulation. Profile delays affect inputs/snapshots, not readiness/control messages. Local cameras and controls are separate from authority. See COOP for connection/error semantics and explicitly untested remote-network paths. No migration, matchmaking or durable saves. `network/presentation.ts` samples bounded timestamped remote poses; `network/prediction.ts` replays only unacknowledged local walking inputs against query colliders (32 frames / 350 ms). Corrections return to authoritative position; HP, casts, dodge and world outcomes are never predicted. Snapshot reconstruction is for presentation; it is not a host migration or exact Rapier contact restore implementation.

## Reliability boundaries (1.1)

`Physics.pick` and `surfaceAt` query actual colliders. `Simulation.targeting` supplies both the renderer footprint and cast execution; range/support checks are not duplicated in the view. Directional collision and field contact bands remain small, explicit methods in Simulation. `bufferedCast` is one serializable Secondary intent, separate from delayed Stone eruptions (`pending`). Input clearing cancels it through a callback; DOM state never decides cast correctness.

`render/audio.ts` consumes event IDs after a user gesture. Its conservative WebAudio voices and mute state have no simulation authority. Diagnostics include audio context/cue counts. `?buffer=0` selects the unbuffered comparison; otherwise 120 ms is the default.

`preferences.ts` wraps fallible local browser storage. Versioned mute/controls keys store only device preferences, never room codes or credentials. Input restores only complete, conflict-free bindings; Ctrl/Cmd/Alt are reserved for shortcuts (including the previously API-accepted ControlLeft binding). Shift bindings remain supported. UI feedback selects events/buffers by local actor; rejection throttling is per source. Configuration trims newest-per-owner capacity only when capacity itself changes, never during camera configuration.

No external art assets. Cloudflare TURN uses the separately authorized existing account; see TURN.md. The largest bundle dependency is embedded Rapier WASM. Dependencies are pinned by the lockfile.

## Current presentation contract (Protocol 3)

Snapshot sequence/tick/time drive a 12-frame remote timeline; no extrapolation. Spawn/despawn and HP/state changes use latest truth. Epoch/pause reset all history. Death/revive/teleport reset only the affected entity. Only genuine local-player lifecycle or epoch/pause transitions clear local held intent. Local aim/selection are immediate; local walking preview reconciles using host processed-sample acknowledgements. Focus loss, disconnect and temporary-field changes clear prediction. A 350 ms authority gap freezes prediction. `Physics.previewMove` temporarily positions the query capsule, runs the existing Rapier controller without impulses, then restores the collider; it never steps a second gameplay world.

Body cursor queries intersect the displayed body hulls, terrain queries use current real colliders, and host cast range/occlusion stays authoritative. See SMOOTHNESS.md for moving-cover/dodge and visual-latency limits. Device-local rendering quality and all balance values are unchanged.

Application delay queues are capped at 24; input generations and epochs cancel obsolete work. Snapshot scheduling does not wait for the synthetic propagation timer. An actual busy transport drops an overlapping snapshot; the next sends fresh truth. Rolling measurements distinguish host ticks/steps, encoding, arrival/application, input acknowledgements and rendering. The Trystero action API does not expose a reliable transport buffered-byte backlog; app queue depth is labelled separately.
