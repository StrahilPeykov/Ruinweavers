Current milestone: [Run Prototype 0.1](RUN.md). Default is the five-beat run; previous trial and networking sections below are dated evidence, not restrictions on this authorized milestone. Current controls remain accepted; no claim of solved balance.

# Experiments / current recommendation

**Current: Co-op Trial 0.1.** Solo remains the default Start path; Create/Join adds one independent mage using host-authoritative WebRTC. Model A, balanced camera/tempo, capacity 1 per mage and 120 ms buffer remain unchanged. Public and loopback signaling passed same-machine real-browser tests, not remote-network validation. [COOP](COOP.md) records shared-world rules, connection steps and matched exploratory results. No tuning was changed. Earlier Lab and Combat Trial evidence below is historical.

The keyboard-faithful motor preserves clears but removes the old control policy's zero-damage result (delayed mean 3.5 HP versus 0 with continuous headings). The current chase steering setting of 6 yields about 2.56 units/s in the measured damped lane; retreating/casting still increases the gap. Stone exclusion remains inadequate evidence about Stone: that heuristic never uses slabs. See EVALUATION corrections.

**Magic Lab 1.1: start with A · Primary/Secondary, balanced camera (51°), balanced tempo, capacity 1 and 120 ms Secondary buffering.** Keep direct 1–4 selection; use Tab/Q as an alternate route. Default Secondary remains RMB with F as its discoverable fallback, and K as an additional right-hand option. Optional wheel cycling is available but off by default. Both mouse bindings stay enabled in the laptop profile.

These are provisional design recommendations from implemented mechanics, automated real-input journeys and screenshot inspection. They are not a claim that an agent can establish subjective human fun or finger comfort.

## Bounded 1.1 findings

No catalogue, damage, movement, dodge or preset rebalance. Baseline at c612606 passed 9 unit tests, 5 browser journeys and build before changes. The recoverable branch is `codex/magic-lab-1.1-baseline`; original evidence remains in `artifacts/lab-1.1/baseline/`.

- Fixed: partial cursor surfaces; stale-height range clamp; missing footprint; Gale's rear/occluded projectile deflection; Tide/persistent-field vertical leakage; near-recovery Secondary losses. The explicit rules are in MAGIC.
- Visual review caught an upper jet visibly clearing a ledge while a target-center obstruction check rejected its hit. The actual jet height now governs both. A separate low-shot regression still confirms ledge blocking.
- Added quiet local sound/mute, state-onset cues, distinct heated/burning response and invalid/queued/replacement feedback. Thin previews remain visible over cover; slab geometry stays visible until physical expiry.
- Already correct and retained: residual states survive replacement; keyboard Secondary is discrete; Primary holds repeat; mouse/keyboard alternatives coexist; capacity remains one. Removing support over the gap still causes a fall. This is a playtest concern, not a hidden capacity redesign.
- 120 ms accepts presses near recovery completion; zero rejects them. Both mouse and keyboard were exercised. This proves execution consistency, not an optimal human buffer duration.
- All eight benchmark times and health outcomes are unchanged, including Basin + Ember at 2.68 s. No universal verdict between A and B: they contain different abilities as well as different semantics.

## What was compared in 1.0

| Experiment                      | Observed evidence                                                                                                                                                                                                                  | Judgment / next human question                                                                                                                                                                                     |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A versus B                      | Both run on the same operations and scene. B cooling extinguishes heat after in-flight bolts finish; B fracture → Gale produces extra force damage. A offers physical cover, bridging and residual states after field replacement. | Prefer A. Inverse Ember is coherent but often reactive; inverse Tide drains a condition usually worth keeping. B loses persistent bridge creation. Does its simpler verbal grammar outweigh lost tactical options? |
| Tactical / balanced / cinematic | Real-input casts and screenshots at 64°/51°/37°. Lower view preserves volume but compresses depth and lets taller props hide floor space. Tactical exposes floor geometry but flattens silhouettes.                                | Balanced is the best initial compromise. Compare on your full-size display, not just a screenshot.                                                                                                                 |
| Deliberate / balanced / faster  | The same strafe, switch, Primary, F Secondary and dodge sequence ran in all three presets. Each retained independent aim and three switches.                                                                                       | Balanced retains readable action separation. Faster reduces positioning time and the deliberate preset gives more reading time. Neither variant is removed. Human latency/comfort judgment remains open.           |
| Direct / cycle selection        | 1–4, Tab and Q exercised through real keyboard events. Diagonal movement and switching/casting coexist in the simulation.                                                                                                          | Direct selection is precise; Tab avoids reaching across WASD when cycling is acceptable. Q and number keys still share movement fingers. No claim that automation proves ergonomic comfort.                        |
| Desktop / laptop alternatives   | LMB, RMB, held J, discrete F and keyboard cycling tested. Secondary does not repeat when F is held. Rebinding keeps shared semantics.                                                                                              | F is a sensible default to assess, not a proven universal choice. K can suit right-hand key access. Trackpad palm rejection and hardware rollover remain untested.                                                 |
| Field capacity                  | Replacement at capacity 1 verified; capacity 3 exercised in a dense-effects pass. Residual target wetness/heat remains after the old field dissolves.                                                                              | Keep 1. It creates a readable opportunity cost; three fields make unattended thermal combinations easier.                                                                                                          |

## Structural dominance probe

`npm run benchmark` uses the same seeded sentinel, deterministic aim and simple lateral dodge policy for eight strategies, for at most 45 simulated seconds. It is a structural probe, not a competitive balance model. It has perfect target coordinates and no human reaction delay. The reference results are stored in `artifacts/combat-benchmark.json`.

| Strategy           | Defeat time, simulated seconds |
| ------------------ | -----------------------------: |
| Ember Primary      |                           6.87 |
| Tide Primary       |                          12.97 |
| Gale Primary       |                          15.72 |
| Stone Primary      |                           5.45 |
| Tide → Ember       |                           4.45 |
| B: fracture → Gale |                           4.47 |
| Basin + Ember      |                           2.68 |
| Slab + Ember       |                           6.87 |

Switching and Secondary can outperform the best naked Primary; there are no elemental immunities. **Basin + Ember is itself a possible dominant routine** against this simple target. Do not infer solved balance. All strategies preserved player health under the scripted evasion policy; that exposes the policy/sentinel's limited challenge rather than proving equal safety for a person. Cover can stop both actors' bolts; standing on the raised form can shoot over it. Distinguish cover utility from damage output.

## Principle assessment

| Principle | Distinct identity without color                 | Shared world relevance                                                  | Unresolved concern                                                                                                                         |
| --------- | ----------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Ember     | Fast travelling bolt / narrow heat seam         | Ignites timber; vaporizes saturation; thermal change                    | Still the most conventional attack. Cooling has limited proactive combat use in B.                                                         |
| Tide      | Piercing jet / persistent current basin         | Saturates, quenches, moves mass gradually, primes steam                 | Strong as preparation; low standalone damage. B drain/pull overlaps Gale and can remove your own useful prime.                             |
| Gale      | Immediate broad impulse / vertical updraft      | Moves props according to mass, exploits fracture, redirects/slows bolts | Damage alone is weak; physical utility must feel rewarding. Grounded kinematic player is not lifted by force in this phase.                |
| Stone     | Delayed local eruption / traversable solid form | Binds mass, resists force, bridges gaps, interrupts low fire            | Binding a target makes subsequent pushing harder. This is consistent but may be counterintuitive. B lacks a useful created traversal form. |

## Iterations that changed the result

- Shared stagger recovery prevents repeated steam from indefinitely suppressing sentinel attacks.
- Continuous burn ticks no longer produce continuous white hit flashes.
- Reset/config changes update camera projection immediately; tests no longer aim using the previous camera.
- Cooling test now lets already-launched heat bolts arrive first. An incoming bolt can legitimately reheat a cooled target; this was a test-order problem, not a cooling immunity.
- Stone cover uses physical collision queries, stops low shots from both sides and has a low surrounding step. The traversal spawn was moved clear of the ballast after a real crossing test exposed overlap/pinning. A unit regression now checks the whole route.
- Station labels enlarged after screenshot inspection; telegraph geometry is reused rather than rebuilt each frame. Frame metrics report uncapped wall time, while only simulation catch-up is capped.

## Three-minute 1.1 handoff

Open `http://127.0.0.1:5173/?scene=states` (A/balanced/120 ms defaults, pressure initially off, panel collapsed).

1. Strafe and dodge while aiming at timber on the left. **2 + Primary** wets it; **1 + held Primary** produces steam. Try its body and feet. Switching retains normal Primary recovery.
2. Walk to the circular ballast plate on the right; **E** toggles sentinel pressure. Move, dodge a red telegraph, then press **F** near dodge completion. Compare the footprint with the result.
3. **3 + Primary** pushes loose stones/ballast. **4 + Secondary** creates cover; shoot from behind and above it. Over the gap, replacing/losing the slab removes your support. Reset freely.

Experiments retains model/camera/tempo choices; Selected tunables contains the buffer slider, including zero. No configuration is required before playing.

Human questions: Does 120 ms feel forgiving without unwanted late casts? Can the cursor/footprint and state/danger cues be read during movement? Is the warning sufficient before replacing or losing the slab underfoot? Trackpad comfort, palm rejection and keyboard rollover remain unvalidated.

## Earlier exploratory sequence (optional)

1. In **states**, wet timber with Tide, then heat it. Quench burning material. Compare B cooling after outgoing bolts finish.
2. Try B fracture on the column or ballast, then Gale. Try Stone binding before pushing and observe the opposite effect.
3. In **traversal**, place an A Stone slab across the gap and walk over it. Replace it and observe the capacity cost.
4. Reset **combat**. Strafe, hold Primary, place a basin or updraft, and dodge after the red telegraph locks. Try standing on and behind cover.
5. Repeat a short sequence with faster tempo, lower camera, then keyboard cycling and F Secondary. Decide which operations feel worth choosing, which keys cause finger conflicts, and whether the single sentinel provides enough pressure to judge the magic.

The old questionnaire is no longer a gate. Co-op Trial 0.1 is explicitly authorized; completion does not authorize another phase. No classes, progression or visual polish should conceal weak base actions.


## Device rendering comparison (2026-09-09)

Owner-reported remote co-op is smooth on the stronger host but choppy on the weaker laptop. Retain all gameplay defaults. Add one optional local Lightweight rendering mode (reduced resolution, shadows off); Standard remains default. This tests rendering cost without confounding combat or authority rules. Current export proves slow frames (~23 FPS), not a GPU, CPU or TURN diagnosis. New observation exports separate rendering context and selected ICE/snapshot statistics. Local structural/browser checks pass; remote FPS benefit remains unvalidated. See `TESTING.md` and `COOP.md`.


## Co-op smoothness and input (2026-09-10)

Keep gameplay defaults and device quality preferences. Protocol 2 enables bounded remote interpolation and separate local guest walking prediction; Primary press intent survives sample/send boundaries and reordered release packets without bypassing cooldown. Measured local Edge/Intel UHD input and presentation evidence, software limits and failed iterations are in [SMOOTHNESS](SMOOTHNESS.md). No balance or allied-interference change. This finite pass ends here; the next intended milestone is the first small roguelite run/build loop, not further open-ended networking work.
