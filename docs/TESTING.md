# Validation and limits

Current pass: [Co-op smoothness evidence](SMOOTHNESS.md). Sections below retain dated milestone history; older statements about full snapshots, missing interpolation or inactive TURN do not describe Protocol 2 / the currently authorized provider.

## Co-op Trial 0.1

Started from clean main at **10477de**, preserving the accepted Combat Trial baseline. Recoverable pointer: `codex/coop-trial-0.1-baseline`. Initial 30 unit tests and production build passed with the existing Rapier chunk warning; the earlier 11-browser pass was accepted from the reviewed milestone, not rerun before editing. Runtime checkpoints: **65102af** (actors/network), **0dd3b37** (lifecycle/evaluation/connection documentation).

Final validation: **40 unit tests pass; all 16 browser journeys pass** (five new co-op plus eleven solo regressions); production build passes. The co-op set includes four two-client journeys over actual loopback-signaled WebRTC and one missing-room recovery journey. The public Nostr path also passed independent movement/selection/casting through actual WebRTC on this same machine. The full browser suite took 6.3 minutes in this software-rendered test environment.

Coverage includes distinct actors/cameras/input, mouse and keyboard casting, independent cooldowns/dodges/fields, residual states, cross-player prime/transform and allied damage suppression, actual hostile targeting/down, held-E revive, encounter-clear restoration, both-ready transitions through all three encounters, victory/defeat/restart, shared Stone cover and guest Gale deflection. Paused host/guest state comparisons agree exactly on damage routes, metrics and event IDs; guests cannot advance gameplay simulation. Lifecycle tests explicitly reduce HP/disable extra enemies to reach transitions, then use real casts; these fixtures are not claims of human trial completion. Normal-pressure and normal-health browser cases are retained.

Networking coverage: real ICE/DTLS/data-channel statistics; captured identity/role; 250 ms stale-input stop during an actual held keyboard action; focus release; disconnect freeze; missing-host 25-second timeout and return to solo. The synthetic case delays outbound input/snapshots by 80 ms ±20 ms with seed 42, then compares authoritative/replica events and metrics. Control messages are not delayed. This is application scheduling over WebRTC, not validated Internet latency or packet-loss emulation. Unit tests reject malformed/non-finite input, arbitrary movement headings, replayed sequences and stale encounter epochs.

The old eight-strategy benchmark is byte-identical. All **96 matched continuous-motor solo rows** retain their historical result, time, damage, casts, routes, reactions, decisions and existing outcome counters; only new actor-tagged counters are added. Keyboard-motor results, pursuit measurements and 27 party comparison cases are separate files under `artifacts/coop-trial/`. Historical Combat Trial and Lab results are preserved. No tuning change followed these corrections.

Iterations: the first WebRTC test exposed a relay lifetime problem during Vite configuration reload; a single development runner now owns relay/server. A test sent input before the guest received the new encounter epoch; it now waits for both clients to enter the encounter. Global AI fixture setup initially overwrote per-enemy enable overrides, causing two expected-shot waits to time out; setup now applies explicit per-enemy overrides last, and both journeys passed. Screenshot review prompted lowering the flattened downed model to the floor. These are transport/setup/presentation fixes, not balance changes.

Evidence: `artifacts/coop-trial/browser/local`, `browser/public`, and `solo-regression`. Co-op capture JSON records build/source hashes, configuration, user agent, viewport, renderer, simulation, metrics and actual RTC stats. Earlier exploratory captures without this metadata are kept separately and are not final performance evidence. Chromium 153 at 1440×900, DPR 1, WebGL 2 / ANGLE SwiftShader on Windows: inspected shared/cover frames used 55–80 draw calls and roughly 1,040–2,986 triangles. Concurrent software-rendered frame means were roughly 149–260 ms; these are slow software test contexts, not recent-laptop GPU or 60 FPS claims.

No physical second computer, remote-network reachability, human guest-latency judgment, trackpad comfort or keyboard rollover was validated. No TURN, migration, reconnect continuation, prediction or pose interpolation. Keep the host browser foreground to avoid background throttling. No OS settings changes, paid tooling, deployment or push. Connection instructions and remaining limitations: [COOP](COOP.md).


## Combat Trial 0.1

Started from clean main at **b0590c2**, preserving the actual tree. Recoverable pointer: `codex/combat-trial-0.1-baseline`. Initial validation passed 22 unit tests, eight browser journeys and production build; no pre-existing failures. Stable runtime checkpoints: a68ff9c (trial/evaluator), 0341a00 (lifecycle/pursuit), a23f175 (dry-arena correction).

Final validation: **30 unit tests pass; all 11 browser journeys pass** (six reliability/trial journeys and five legacy journeys rerun after separating capture paths); production build passes with the existing Rapier bundle-size warning.

Current unit coverage adds Gale deflection-only feedback, explicit trial transitions/health carry/restart, independent enemy AI, pursuing telegraphs and damage, cover-blocked melee, separate damage recipients, restricted policy adaptation/repeatability, and exclusion of Lab-only water. Real browser journeys add default start, collapsed UI, keyboard/mouse casts during pressure, all three transitions using labelled reduced-health fixtures, defeat/restart, and a normal-health reaction/control sequence with positions arranged through the existing setup API. Casts/movement use actual browser inputs.

Current evidence is under `artifacts/combat-trial/`: evaluator JSON with runtime/source hashes, labelled browser screenshots with state/config/renderer, and separate legacy-regression captures under `validation/`. Historical 1.1 artifacts remain preserved. Two initial full-suite failures were Windows screenshot overwrite errors, not failed gameplay assertions; the capture directories were separated before rerunning. A lifecycle fixture initially aimed Stone outside its range; a wait also needed to recognize that simulation stops at encounter clear. Both were test corrections, not timing/range changes.

The initial trial inherited invisible Lab water. Its regression now confirms the arena stays dry; affected evaluation results are retained in `iterations/pre-dry-arena`, superseded by corrected root-level files. Tuning and policies froze before the held-out check; that check was repeated after this correctness fix and is not claimed to remain completely unseen. The legacy eight-strategy benchmark is byte-identical before/after. See EVALUATION for isolated/full-trial distinctions, motor ablations and restrictions.

Captures use Chromium 153, 1440×900, WebGL 2 / ANGLE SwiftShader on Windows. A reaction/control frame reported 89 draw calls and 2,998 triangles; concurrent software-rendering times are not hardware GPU estimates. The original compact resize journey remains. No claim of physical trackpad comfort, hardware rollover, human skill modelling, universal Model A superiority or solved balance. No OS input changes, paid service, push or deployment.

The following sections retain the historical 1.1 validation record.

## Reproduce

`npm test` · `npm run build` · `npm run test:e2e` · `npm run benchmark`

`npm run dev` serves localhost:5173; the browser harness starts/reuses it. Free browser installation if absent: `npx playwright install chromium`. The existing optional `npx tsx scripts/play-session.ts` runs the broader tempo/dense-effects comparison; it is not required for this bounded pass.

## Baseline and evidence

Started from clean main at c612606 without checkout/reset. Before edits: **9 unit tests, 5 browser journeys, build and benchmark passed**. No pre-existing failures. Original artifacts were copied before reruns to `artifacts/lab-1.1/baseline/`; local branch `codex/magic-lab-1.1-baseline` is recoverable.

New screenshots in `artifacts/lab-1.1/validated/` have JSON containing runtime commit, URL, config, browser, viewport/DPR, renderer, simulation, targeting and metrics. Top-level artifacts from the original five journeys are regenerated by the existing harness. Superseded observations are labelled in `iterations/`.

## Coverage

**22 unit tests** retain the original nine and add rear/occluded Gale deflection; actual body/stair/slab picking; support resampling at range limits; outgoing-slab exclusion and per-source capacity; pitched Tide height/cover, including an upper hit over an obscured target center; cross-floor basin exclusion; captured buffer Principle/aim and cooldown; zero/too-early/cancel/reset/death paths; residual states and support expiry.

**8 real-input browser journeys** retain movement, independent aim, 1–4/Tab/Q, LMB/RMB/J/F, rebindings, optional wheel, dodge, reset, resize and models. Three new journeys cover body/feet aiming and thermal reaction, raised jets/basins with preview equality, mouse/keyboard buffering near recovery, held discrete actions, mute, focus cancellation/OS repeats, model transitions, slab-top targeting, invalid replacement support, replacement followed by a gap fall, and expiry. Setup APIs only arrange positions/states/timers; tested actions use keyboard/pointer events.

Agent screenshot review checks thermal/wet cues, pitched beams, footprints versus active fields, invalid preview on slabs, support loss, combat danger and compact layout. State-only assertions initially missed an upper jet rejected by a target-center ray. The regression and implementation now use beam height. An initially too-short Ember hold ended before Tide's existing recovery; the test changed, not the cadence.

## Benchmark

All eight defeat times are unchanged: Ember 6.87, Tide 12.97, Gale 15.72, Stone 5.45, Tide→Ember 4.45, B fracture→Gale 4.47, Basin+Ember 2.68, Slab+Ember 6.87 seconds. All retain 100 scripted player HP. Baseline and final JSON are preserved. Perfect coordinates/scripted evasion cannot establish human balance, challenge or fun. No nerf was made.

## Rendering and audio context

1.1 captures use Playwright Chromium, **1440×900, DPR 1, WebGL 2 / ANGLE SwiftShader (software rendering)**; the compact journey checks 860×640. Each capture records browser/renderer and rolling frame statistics. Software times vary with concurrent local work and are not laptop GPU measurements. Inspected frames have roughly 75–90 draws and 1,600–2,800 triangles. No new post-processing or external assets. Build remains about 3.45 MB raw / 1.25 MB gzip, dominated by embedded Rapier WASM; the existing large-chunk warning is non-fatal.

WebAudio activation, cue counts and mute are inspected. Speaker/headphone loudness and timbre need hands-on judgment. Historical 1.0 in-app 1080p observations reported 16.7 ms without GPU identity; these are not validated 1.1 hardware performance or a 60 FPS guarantee. No long soak or forced context-loss recovery test was added.

## Remaining limits

- Physical trackpad gestures, palm rejection, finger comfort and keyboard rollover are **not** validated by Playwright. Keyboard alternatives work; simultaneous typing/pointing depends on the laptop. No OS settings changed.
- Targeting uses coarse body hulls and generous documented contact bands, not arbitrary 3D targeting. B retains earlier coarse inverse-area operations; it was preserved rather than perfected. No snapping/lock-on.
- Removing/expiring Stone over the gap still causes a fall; warning sufficiency needs human judgment. Residual states remain. The kinematic player still does not receive Gale lift like dynamic props.
- No controller/touchscreen support, complete snapshot restore or final animation. WebGL 2 required. The live experiment panel clears input but does not pause combat; use Pause to inspect safely. Local control preferences are now saved (see usability follow-up below).
- Passing checks demonstrates repeatable execution in this runtime, not subjective fun, comfortable ergonomics, universal A-over-B superiority, balanced combat or cross-browser physics determinism.


## Room-sharing usability follow-up

Reproduced disappearing selection with a real browser double-click on the lobby copy: unconditional HUD `textContent` writes cleared it before it could be copied. Labels now compose their final solo/party/network value and only update the DOM when that value changes. Room code lives in a stable read-only field with an explicit Copy code button and clipboard-denial/manual-copy fallback. New codes have six characters; legacy 12-character RW codes remain accepted. No gameplay or transport strategy changed.

Focused regression: text selection across live updates, actual clipboard copy/paste into another browser client, six-character WebRTC join/start, lowercase/whitespace acceptance, and simulated clipboard permission denial followed by native Ctrl+C. Compact 860×640 and connected-lobby screenshots are in `artifacts/room-sharing/`. All three focused browser journeys and 40 unit tests pass; production build passes with the existing chunk warning. No public deployment or push is part of this fix.

## TURN configuration follow-up (2026-09-09)

After the owner explicitly accepted Cloudflare overage terms and activated Realtime, encrypted Worker runtime secrets were configured and deployed. Live credential endpoint and TLS/443-only transport probe pass. Two remote laptops reportedly connect in relay-only mode, but both are choppy while solo is smooth; remote RTT/selected-candidate and frame measurements remain pending. See `docs/TURN.md` for scoped evidence and provider usage. Production has no development inspection API: an initial live game test incorrectly waited for it and timed out; this is not a network failure. The replacement opt-in transport probe does not render the game or claim remote performance.

**Historical pre-activation free-only account review:** Cloudflare provisioning requires payment details and explicitly bills overages; not activated. After owner signup, Open Relay's account offers ongoing 20 GB/month with no overages and states TURN stops at exhaustion while automatic payments are disabled. Activation nevertheless requires a credit card for identity verification; this violates the separate no-payment-method constraint. Its no-card 500 MB trial is excluded. The unactivated dashboard's `0GB / NaNGB` quota is not a valid allocation or measured remote usage. See `docs/TURN.md`. No remote relay session, RTT or usage result is claimed. This review changed documentation only.

45 unit tests pass, including five new credential/Worker tests. Five focused browser journeys pass (the three room-sharing regressions plus missing-relay/error handling). Production build and Wrangler deploy dry-run pass; existing Rapier bundle-size warning remains. Actual local Wrangler serves HTML 200, unconfigured POST `/api/turn` 200 with `configured:false` and no-store, GET 405, and cross-origin POST 403. No secret, account or public deployment was created.

Inspected `artifacts/turn-setup/missing-credentials.png` and network state: the error is readable, and Return to solo permits starting the trial. Chromium, 1440×900, software WebGL; these are UI correctness checks, not performance claims. Provider-success responses are unit fixtures, not a live relay test. At this pre-activation checkpoint, authenticated TURN and the two remote laptops remained unverified. The activation record above supersedes that status. Historical room-sharing captures are preserved.


## Weak-laptop rendering follow-up (2026-09-09)

47 unit tests and production build pass (existing large-chunk warning). New RTC summary tests confirm only the selected ICE pair is reported and missing RTT stays null; addresses/credentials are omitted. The real-input rendering journey verifies quality selection, unchanged paused entities/Stone field, saved preference, restoring shadows and the downloaded observation export. The existing two-client independent-actor journey also verifies a guest's quality setting leaves the host unchanged, with selected live WebRTC path and snapshot application/arrival measurements. A separate production-preview browser check confirms Lightweight startup and the real Export button work without the development global or page errors (`production-export-check.json`).

Inspected Lab and connected guest screenshots in `artifacts/render-quality/`: targeting footprint, Stone surface, players and red sentinel danger remain visible without shadows. Historical co-op captures were preserved. Source hashes identify the working build used in captures. One headless Chromium 153 / ANGLE SwiftShader client, 1440×900 CSS pixels, DPR 1.5: standard rendered 2160×1350 at 84 draws; lightweight 1152×720 at 55 draws in the same frozen scene. A 60-frame window after 2.5-second warm-up measured 188.3/350 ms mean/p95 for standard and 42.8/83.4 ms for lightweight. These noisy software-renderer numbers show only this run; they do not predict either remote laptop's performance. An earlier sample was contaminated by shader-switch startup and is not evidence of steady performance.

No gameplay tuning, tick/snapshot-rate change, interpolation, OS setting change, public push or deployment is included. The new controls and export require this client build; an older deployed client cannot expose them. Remote improvement and real hardware renderer identity still require a fresh user observation.


## Co-op usability fixes (2026-09-09)

Started clean at c22d8a1; 47 baseline unit tests passed. Real browser regressions reproduced shortcut-driven movement (~3 units), lost mute after reload, Enter doing nothing, and two fields becoming one on camera change. Cast feedback also read the host alias/unfiltered events; rejection throttling shared its timer across actors. Fixes preserve fields during camera changes, scope feedback/throttling per actor, reserve Ctrl/Cmd/Alt for shortcuts, allow Enter to join, and persist mute/profile/bindings/optional wheel locally. Held and buffered actions clear when invoking a shortcut. Shift fallback remains; ControlLeft is no longer an accepted custom gameplay binding.

50 unit tests and production build pass. Three new browser journeys pass: shortcuts and return to casting, restored settings plus actual C/R/wheel use after reload, and Enter joining two real clients followed by independent camera changes with Basin + Stone preserved and local rejection text. Unit coverage includes guest buffering, simultaneous differently worded rejections, conflicting/corrupt saved bindings and unavailable storage. The shortcut position check allows 0.001 units for idle Rapier settling; the original multi-unit unwanted movement still fails it.

Eleven existing Lab/reliability/lobby journeys were exercised. Nine passed on the initial run. The older Model B cooling journey once found zero heat before cooling and passed unchanged on rerun. The clipboard lobby journey twice timed out before its share code appeared, then passed without runtime changes; a diagnostic-only catch added for that run produced no errors because it passed, and was removed. These intermittent failures are recorded, not established as pre-existing or assigned an unproven cause. Total unique journeys with passing results: 14. No claim of a clean single full-suite run, physical shortcut/trackpad ergonomics, remote performance or live deployment.

Inspected `artifacts/usability/guest-fields.png` with state and source hashes: both fields, Stone geometry and local guest feedback survive the tactical camera switch. Also reviewed connected copy/selection and existing solo-buffer captures. Chromium 153 / WebGL2 ANGLE SwiftShader, 1440×900 CSS pixels; new focused tests use local Lightweight rendering, older tests Standard. No hardware FPS inference. Historical regenerated artifacts were restored; selected new evidence has its own directory.
