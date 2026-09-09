# Experiments / current recommendation

**Start with A · Primary/Secondary, balanced camera (51°), balanced tempo, capacity 1.** Keep direct 1–4 selection; use Tab/Q as an alternate route. Default Secondary remains RMB with F as its discoverable fallback, and K as an additional right-hand option. Optional wheel cycling is available but off by default. Both mouse bindings stay enabled in the laptop profile.

These are provisional design recommendations from implemented mechanics, automated real-input journeys and screenshot inspection. They are not a claim that an agent can establish subjective human fun or finger comfort.

## What was compared

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

## Useful human playtest, about five minutes

1. In **states**, wet timber with Tide, then heat it. Quench burning material. Compare B cooling after outgoing bolts finish.
2. Try B fracture on the column or ballast, then Gale. Try Stone binding before pushing and observe the opposite effect.
3. In **traversal**, place an A Stone slab across the gap and walk over it. Replace it and observe the capacity cost.
4. Reset **combat**. Strafe, hold Primary, place a basin or updraft, and dodge after the red telegraph locks. Try standing on and behind cover.
5. Repeat a short sequence with faster tempo, lower camera, then keyboard cycling and F Secondary. Decide which operations feel worth choosing, which keys cause finger conflicts, and whether the single sentinel provides enough pressure to judge the magic.

Do not begin Phase 2 until the human playtest answers those questions. No classes, content or visual polish should conceal weak base actions.
