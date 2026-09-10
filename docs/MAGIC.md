# Magic: baseline catalogue and run alterations

The table below remains the unmodified Lab/trial baseline. Build Identity 0.2 adds ten actor-owned Alterations and three prerequisite-gated Theorems described in [RUN.md](RUN.md); no global damage or cadence changes. New outcomes are run-owned and absent from baseline scenes.

## Operations and delivery

| Principle | Primary (both models)                                | A: tactical Secondary                       | B: inverse Secondary                                  |
| --------- | ---------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------- |
| Ember     | Fast heat bolt; first intersecting target            | Narrow persistent cinder seam               | Remove 100 heat in an aimed area                      |
| Tide      | Piercing saturating jet with modest impulse          | Saturating basin with directional current   | Drain saturation and draw targets toward caster       |
| Gale      | Immediate pressure fan; deflect visible forward hostile bolts | Updraft: lift and gather bodies, slow bolts | Pull bodies toward cursor                             |
| Stone     | Delayed local eruption; damage and bind structures   | Traversable slab, cover and bridge          | Reduce cohesion, chip structure; dissolve nearby slab |

Model B is a pragmatic comparison, not a perfectly symmetric algebra. Its Stone Primary binds existing structure rather than creating a persistent bridge. The variants contain different abilities as well as different semantics; this comparison cannot establish that one grammar is universally better. Retain both for human comparison.

## Small rule vocabulary

- **Thermal:** heat 0–150, decays 4/s. Flammable material above 65 heat and below .15 wetness burns. Cooling and wetting quench through these properties.
- **Moisture:** 0–1; slow decay. At ≥45 heat and >.16 wetness, consume heat/water to make steam, damage and briefly stagger. Thermal shock reduces structural cohesion. The rule operates on target properties, not spell names.
- **Cohesion:** −1 to 1. Positive values resist impulse. Values below −.25 make force damaging, consuming the fracture. Fixed brittle structures can shatter; loose bodies move. Stone binds structures.
- **Momentum:** Rapier mass, velocity and impulses. Heavy objects need more force. Moving loose/heavy bodies can damage structural targets. The plate senses mass occupying its area. Anchored objects retain fixed physical form until destroyed.

All target operations carry actor/source IDs. Heat and wetness retain distinct provenance. Steam events identify the transforming actor and `primedBy`; damage routes identify recipient and source. Co-op uses the same operations with no cross-player bonus. See COOP for allied damage, down/revive and environmental interference rules.

## Cadence and commitment

No mana. Primary repeat uses the same action/cadence as tapping. Secondary is edge-triggered, including keyboard input. Dodge overrides casting. Secondary presses in the final 120 ms of dodge/Secondary recovery are buffered once; the instrument slider (0–150 ms) includes zero. The most recent press replaces pending intent and captures its Principle and world point, not a tracked target. Execution revalidates support/range from the current player position. Pending intent clears on expiry, reset, death, focus loss, input-profile/binding changes, pause, experiment-panel toggle and configuration changes. Held Secondary never repeats, including OS key repeats after cancellation. Cast movement is 78% for .12 seconds. Primaries have .32/.42/.50/.64-second base cadences. Secondary recovery is .65 seconds. The balanced dodge travels 3.5 units over .22 seconds with .17 seconds of invulnerability and .8 seconds between starts.

One major field per actor by default, configurable 1–3; new fields replace the oldest. Fields expire after 12 seconds; residual target states survive replacement. A slab blocks low bolts from either side, including yours. Updraft slows hostile and friendly bolts. Heat seams can hurt the caster. Consistency creates costs worth testing.

Repeated stagger is capped at .4 seconds with 1.4 seconds between accepted staggers per entity. Without this gate, repeated steam suppressed the sentinel indefinitely. This is a general interrupt recovery rule, not elemental immunity.

## Targeting contract (1.1)

- The camera ray queries Rapier terrain, stairs, slabs and coarse body hulls; never VFX, labels or state indicators. The small cursor marks the hit point. No target lock or center snapping. Pointing at a body aims bolts/jets at that height; pointing at terrain aims .75 units above its surface so aiming at feet remains useful.
- The thin Secondary footprint is the execution position and shape. Horizontal range clamps to the visible amber footprint and resamples support there. Red means unsupported/invalid: rejection costs no cast recovery and preserves the old field. Vertical faces are invalid placements. No arbitrary airborne placement.
- Ground placement uses support beneath the aimed body point. At capacity, preview and execution exclude the outgoing slab: a new field cannot depend on a surface it removes. Stone alone retains the original zero-height construction plane across the existing gap. Ground manifestations can be created at a visible supported point beyond cover; their pulses cannot pass through it.
- Tide is a pitched, terrain-clipped jet with a generous .4-unit hit margin and terrain visibility at the actual jet height. Gale is a horizontal 6-unit forward fan, cosine half-angle .72 (about 44 degrees), with a generous 3-unit center-height tolerance. Entities and deflected projectiles use the same cone and terrain-occlusion predicate. Entity radii soften the outer range edge. The fan VFX now uses the actual angle/range.
- Basin and seam affect feet from .2 below to .65 above their surface; terrain/slabs block propagation. Updraft reaches 3 units above its base and uses the same obstruction rule for bodies and bolt slowing. Stone stabilization reaches 1.1 units; eruption reaches 1.6. A target on another floor cannot be affected merely because its X/Z overlaps. Residual states are independent of fields.
- Cover and your own platform edge can obstruct low shots. A shot aimed at a visible upper body can clear a ledge even when its center is hidden. A lower shot still strikes the ledge. Replacing or expiring a slab removes support immediately; over the gap this still causes the existing fall/reset penalty. Capacity/lifetime were not redesigned.

## Feedback

Combat Trial 0.1 preserves spell catalogue and tuning. A Gale cast that only redirects a projectile now counts as useful and does not emit the empty-cast cue. Independent enemies share material/state rules, without elemental immunities. Ranged enemies approach if out of reach/behind cover; pursuers chase, telegraph a ground strike, lock its point for the final .3 s, then recover. Cover blocks both low bolts and melee contact; Gale/stagger affect pursuers through existing force/interrupt rules.

Small cast pulses, impact rings, wet-onset rings, structure-change rings and rising steam distinguish stages. Quiet synthesized cues separate cast/impact/transformation; Mute is always available. Heated material glows softly; burning uses a larger flickering cone. Red attack telegraphs render above effects. Slab rims pulse during the final two seconds but solid geometry stays visible until removal. The compact footprint caption reports replacement/lifetime, range limiting, buffering or rejection. Empty instant casts use a dim small ring; no damage number cloud.

Saturation remains on entities/fields, not fluid cells. Coarse hulls and contact bands are intentional approximations; no general spell-collision engine or arbitrary debris generation. See TESTING for limitations.
