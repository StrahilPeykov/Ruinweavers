# Co-op smoothness and input — 2026-09-10

Started from clean `f7df5dd`, newer than reviewed `c22d8a1`; no reset. This is a local Protocol 2 change, **not deployed**. Cloudflare TURN, TLS/443, secrets and provider authorization are unchanged. Both clients must run the same source build; the handshake rejects incompatible versions/builds. Default trial, Model A, spells, damage, encounters, party rules and Standard/Lightweight device preferences are unchanged. Instruments stay collapsed.

## Reproduced and repaired

- At last-send 100 ms, Primary sampled pressed at 116 and released at 133 produced `primary:false` and no host cast. The host sampling mailbox lost the same press before a simulation step. A bounded press latch now captures aim/Principle separately from latest held state. It is retransmitted with a unique press ID until processed acknowledgement or 250 ms expiry; the host deduplicates it. This also repairs a reproduced jitter case where a newer release arrived first and invalidated the older tap packet. It is consumed once at the next eligible simulation boundary, **not saved until a cooldown ends**. Holds still repeat at existing cadence. Focus, stale input, death, epochs, reset and disconnect clear intent; delayed stale callbacks cannot reintroduce it.
- Guest bodies/projectiles previously stepped at snapshot arrival. Remote poses now use 12 timestamped snapshots and a 75 ms target buffer. Playback stays within received history, slows/catches up modestly, and holds at the newest pose when starved. It does not extrapolate indefinitely. Spawn/despawn and HP/state changes remain immediate; epoch/pause/teleport/death/revive reset history.
- Measured guest movement response justified a separate local path. Query-only walking prediction responds before the round trip; processed sample acknowledgements discard old inputs and replay at most 32 samples / 350 ms. No authority for casts, dodge, damage, reactions, enemies, revival or outcomes moves to the guest. Walking freezes after 350 ms without authority. Corrections return to host truth; no whole-world rollback exists.
- Snapshots now explicitly contain live query/presentation state and recent unacknowledged events. Static terrain/material/config data is sent until acknowledged per epoch. Full combat diagnostics stay on the host; guest exports say so. Event delivery remains bounded by the existing lifetime/180-event window, deduplicated by ID, with epoch reset. This is not durable event delivery across disconnects.
- Synthetic delay previously held the snapshot send gate during the delay timer, reducing rate. Timers now schedule independently with a 24-message bound and epoch/input-generation cancellation. Actual busy transport drops overlapping snapshots in favor of later fresh state. Target input/snapshot rates have not increased.

## Measurements and interpretation

Artifacts in `artifacts/smoothness/` retain the pre-change baseline, initial candidate iteration, final candidate and a browser launch without forced ANGLE flags. JSON includes source build/protocol, roles, renderer, viewport/drawing buffer and samples. The no-forced-flags run **also selected SwiftShader**; it is not GPU evidence. The main suite used Chromium 153 / SwiftShader; an additional successful headed Edge 152 run used this laptop's Intel UHD / Direct3D11 hardware renderer. Both used two clients on this one Windows PC with actual local WebRTC, not the other laptop or geographic TURN. Lightweight comparisons use 1440×900 CSS pixels and 1152×720 drawing buffers. Older full-suite cases retain Standard rendering.

The owner's existing observation export reported 43.18 ms mean / 50 ms p95 frames, but lacked renderer/arrival/apply measurements. It proves slow frames, not a GPU or TURN cause. New exports separate frame distribution, host tick pacing and step cost, serialization, accepted snapshot arrivals/application, input acknowledgement latency, bytes and app queue depth. Trystero does not expose transport buffered bytes through its action API. App queue counts and selected-channel bytes are not provider-billed usage.

Matched Node Simulation/Rapier batch, 600 ticks / 200 samples:

| Measure | Full-state packet | Compact packet |
| --- | ---: | ---: |
| Mean JSON bytes | 13,310 | 5,250 |
| p95 JSON bytes | 14,972 | 5,857 |
| Mean clone + JSON time | 0.638 ms | 0.284 ms |

This is about 61% fewer bytes. Sub-millisecond encoding was too small to explain the observed long graphical frames. Guest snapshot application may cost more with reconstruction, timeline and prediction; the pass does not claim every CPU measurement improved.

Initial matched browser iteration (preserved in `iterations/initial-candidate-browser.json`):

| Application delay | Guest auth response, before → after | Guest visible response, before → after | Tap successes, before → after |
| --- | ---: | ---: | ---: |
| None | 235 → 81 ms | 235 → 81 ms | 3/3 → 3/3 |
| 80 ±20 ms each direction | 397 → 334 ms | 397 → 41 ms | 2/3 → 3/3 |

These response values are individual real-key movement bursts, not latency population estimates. The delayed baseline also had reduced send frequency; it is **not a pure constant-rate propagation comparison**. Application timers can reorder input; sequence checks discard obsolete packets. Control/readiness is not delayed. Frame/main-thread noise and different test timing remain confounders. A later no-forced-flags run measured 482 ms authoritative versus 86 ms visible response with delay, showing both prediction's separation and unresolved slow-frame sensitivity. Do not summarize this as “lag fixed.”

## Final measured build: `f41661a873eb` (runtime commit `c7b9539`)

Final recovered-tap journey: 3/3 taps with no delay and 3/3 with 80 ±20 ms scheduling; three additional keyboard phases and three mouse taps each produced exactly one cast. Actual keyboard phases were recorded (Edge: 29.2, 13.8, 26.7 ms after last send), not assumed equal to requested sleep offsets. Holds, movement and remote-host movement also ran through real controls. Current Edge tests explicitly point at a valid floor position first; a prior headed attempt inherited the native cursor over unsupported geometry and timed out waiting for an invalid cast. Its screenshots are preserved. No targeting rule changed to make it pass.

| Measurement | Final software Chromium | Final hardware Edge on this laptop |
| --- | ---: | ---: |
| Guest authoritative / visible response, no delay | 207 / 58 ms | 44 / 28 ms |
| Guest authoritative / visible response, 80 ±20 ms | 247 / 99 ms | 254 / 19 ms |
| Host authoritative / visible response, no delay | 224 / 224 ms | 30 / 30 ms |
| Guest frame mean / p95, later window | 103 / 250 ms | 16.65 / 16.80 ms |
| Host frame mean / p95, later window | 81 / 217 ms | 16.65 / 16.80 ms |
| Accepted snapshot interval mean / p95, later window | 81 / 384 ms | 63.7 / 79.4 ms |
| Guest application mean / p95, later window | 1.67 / 7.60 ms | 0.39 / 0.70 ms |

No same-hardware pre-change baseline was collected. These columns are different rendering environments, not an optimization speedup comparison. Response is a single movement burst observed at animation frames, not display-photon latency. Rolling network statistics in the later sample can include the preceding no-delay phase; do not interpret their means as isolated propagation-delay estimates.

Edge's host tick mean/p95 was 16.0/17.6 ms, step 0.24/0.40 ms, encoding 0.21/0.40 ms. Input sample acknowledgement mean/p95 was 22/50 ms at the no-delay sample and 108/227 ms at the later mixed window. Packets averaged 3.67 KB in this sparse browser fixture. Peak app queue was 2 host / 4 guest, with zero dropped snapshots in that run; target minimum snapshot interval remains 50 ms, with measured effective rate about 15.7 Hz. The later Edge sample retained 12 replay frames with zero history drops; recorded position corrections had p95 0.075 m and maximum 0.254 m (rolling window), so reconciliation is not claimed invisible. Hardware remote-motion tracing found 42 frame-to-frame position changes while authoritative tick was unchanged, out of 97 observed frames. Presentation can still hold during a long arrival gap; latest authoritative outcomes are never interpolated.

Headed hardware reproduction: set `RUIN_BROWSER_CHANNEL=msedge`, `RUIN_HEADED=1`, `RUIN_RENDERER=native`, and a new `RUIN_SMOOTHNESS_LABEL`, then run the focused journey. No OS/driver preference changed. Both clients were on this PC, Lightweight 1440×900 / 1152×720; enemy attacks were disabled for the timing fixture. This is not a sustained dense-combat or remote hardware benchmark.

## Correctness, targeting and remaining limits

Simulation/Rapier still decide every collision/outcome once. Presented body picking follows displayed hulls; real terrain/conjured-surface queries and host range/occlusion decide execution. This avoids pointing at an invisible older body while keeping hit truth authoritative. A moving target can still move between pointing and host execution. Remote orientations, telegraphs, state cues and lifecycle follow latest truth rather than a delayed full-world reconstruction.

Prediction is walking/gravity only. Dodge and confirmed cast movement costs remain host decisions; correction can be visible. Moving props/other players are queried at latest authority, not predicted trajectories. Changing/losing temporary fields clears replay so old support is not reused. Near moving obstacles or during slab replacement, the host can correct a preview. No friendly projectile-interception rule was changed; compare that gameplay later. Cooperating bot policies also restrict defensive choices, so their old result does not justify bonus damage.

No physical trackpad comfort, remote laptop renderer, cross-country RTT or long-session relay stability claim follows from these tests. The hardware frame measurements above apply only to the stated local fixture. One-hour TURN credentials still lack in-session renewal. No provider/account changes, credential exposure, push or deployment occurred. Next intended milestone is the first small roguelite run/build loop; this pass does not start it.

## Reproduce and play

`npm test`, `npm run build`, `npm run test:e2e`. Focused measurements: `npx tsx scripts/measure-network.ts artifacts/smoothness/new-simulation.json`; set `RUIN_SMOOTHNESS_LABEL` to a new filename prefix before `npx playwright test tests/browser/smoothness.spec.ts`. `RUIN_RENDERER=native` removes forced SwiftShader flags but does not guarantee hardware selection. Clear environment overrides afterward. Optional `prediction=off` / `interpolation=off` query comparisons are retained without adding normal-play choices.

`npm run dev` → `http://127.0.0.1:5173/?scene=trial`. Same-machine co-op: both choose Local relay, Create/copy code/Join, then both Ready. Remote current checkout needs matching deployed clients, which this task does not publish. Public Nostr and direct-or-relay remain the normal remote settings. Use stronger laptop as host based on the owner's report, not a new remote measurement. Controls unchanged: WASD, pointer aim, LMB/J Primary, RMB/F/K Secondary, 1–4 or Tab/Q, Space dodge, hold E revive. Both Ready between encounters/restart.


## Validation record

Before runtime changes, all 50 existing unit tests passed. The exact host/guest tap regressions failed as expected and the baseline browser comparison captured one missing delayed tap. After initial changes, all existing browser journeys passed in the full run, but the new jitter comparison still lost one tap (25 passed / 1 failed / 1 opt-in relay test skipped). That failure led to a separately reproduced newer-release-overtakes-press regression and the acknowledged press-ID fix. A subsequent 2/3 result remained; a diagnostic trace then showed arrivals bunched inside the unchanged 320 ms Ember cooldown (one attempt at simulation time 6.583 s versus ready at 6.770 s). The final delivery journey waits for authoritative recovery and prior cast delivery, rather than treating 500 wall-clock milliseconds as guaranteed recovery. Early/cooldown taps remain covered by the unit rejection test. The diagnostic trace is retained; enabling `RUIN_INPUT_TRACE=1` adds observation-only mailbox/cast wrappers in the browser harness. Historical baseline and failed-iteration artifacts are retained.

An earlier lifecycle test waited for exact equality with a setup epoch; defeat could already advance it again before arrival. Both screenshots showed correct defeat. The wait now accepts reaching or passing the setup epoch and retains explicit outcome assertions. A later independent-actors/shared-fields run hit Windows PNG/JSON file-open errors after its gameplay assertions, not a gameplay failure; a dedicated artifact output directory avoids overwriting the historical image. No assertions were weakened to hide these failures.

Final validation: **59 unit tests and production build pass**, with the existing large Rapier chunk warning. All **26 non-opt-in browser journeys have passing results** across the full run and focused reruns; this is not a claim of one clean full-suite invocation. All five co-op cases were exercised again after the press-ID correction; the two file-output failures passed into `artifacts/smoothness/validated`. The updated tap/motion journey passed in software Chromium and headed hardware Edge. The live TURN test was deliberately skipped; no relay traffic or deployment was needed for this pass. Inspected paired cover/state captures and the final Edge guest screenshot. Historical generated captures were restored; selected new captures are sanitized in their own directory.
