# Magic in the Lab

## Operations and delivery

| Principle | Primary (both models)                                | A: tactical Secondary                       | B: inverse Secondary                                  |
| --------- | ---------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------- |
| Ember     | Fast heat bolt; first intersecting target            | Narrow persistent cinder seam               | Remove 100 heat in an aimed area                      |
| Tide      | Piercing saturating jet with modest impulse          | Saturating basin with directional current   | Drain saturation and draw targets toward caster       |
| Gale      | Immediate pressure fan; deflect nearby hostile bolts | Updraft: lift and gather bodies, slow bolts | Pull bodies toward cursor                             |
| Stone     | Delayed local eruption; damage and bind structures   | Traversable slab, cover and bridge          | Reduce cohesion, chip structure; dissolve nearby slab |

Model B is a pragmatic comparison, not a perfectly symmetric algebra. Its Stone Primary binds existing structure rather than creating a persistent bridge. This loss of traversal utility is evidence against making inverse semantics mandatory for every secondary slot. Retain it for human comparison.

## Small rule vocabulary

- **Thermal:** heat 0–150, decays 4/s. Flammable material above 65 heat and below .15 wetness burns. Cooling and wetting quench through these properties.
- **Moisture:** 0–1; slow decay. At ≥45 heat and >.16 wetness, consume heat/water to make steam, damage and briefly stagger. Thermal shock reduces structural cohesion. The rule operates on target properties, not spell names.
- **Cohesion:** −1 to 1. Positive values resist impulse. Values below −.25 make force damaging, consuming the fracture. Fixed brittle structures can shatter; loose bodies move. Stone binds structures.
- **Momentum:** Rapier mass, velocity and impulses. Heavy objects need more force. Moving loose/heavy bodies can damage structural targets. The plate senses mass occupying its area. Anchored objects retain fixed physical form until destroyed.

All target operations carry actor/source IDs. Heat and wetness retain distinct provenance. Steam events identify the transforming actor; the priming actor remains in the target's state. There is no cross-player bonus or networking.

## Cadence and commitment

No mana. Primary repeat uses the same action/cadence as tapping. Secondary is edge-triggered, including keyboard input. Dodge overrides casting; presses made during dodge are not buffered. Cast movement is 78% for .12 seconds. Primaries have .32/.42/.50/.64-second base cadences. Secondary recovery is .65 seconds. The balanced dodge travels 3.5 units over .22 seconds with .17 seconds of invulnerability and .8 seconds between starts.

One major field per actor by default, configurable 1–3; new fields replace the oldest. Fields expire after 12 seconds; residual target states survive replacement. A slab blocks low bolts from either side, including yours. Updraft slows hostile and friendly bolts. Heat seams can hurt the caster. Consistency creates costs worth testing.

Repeated stagger is capped at .4 seconds with 1.4 seconds between accepted staggers per entity. Without this gate, repeated steam suppressed the sentinel indefinitely. This is a general interrupt recovery rule, not elemental immunity.

This is a deliberately coarse simulation: saturation lives on entities/fields, not fluid cells; jets/cones use planar targeting, and structures do not generate arbitrary debris meshes. See TESTING for limitations.
