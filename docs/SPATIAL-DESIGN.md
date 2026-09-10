# Spatial Design 0.3

Baseline: clean 4deeb7a; Guardian closure 824357e corrects README/VISION and confirms the completed 117-unit / 58-browser / held-out evidence. Fixed five-beat run, existing enemies/stats, magic/build pool, camera and authority remain. No topology generator.

## Research → room criteria

- [Hades designer Eduardo Gorinstein](https://www.digipen.edu/showcase/news/eduardo-gorinstein-delivers-challenge-and-fun-hades) describes modularizing individual chambers as more work than authoring additional rooms and varying combat. **Use:** judge a whole authored circulation/sightline arrangement first; composition and encounter content can remain separate.
- [Dodge Roll's Brent Sodman](https://videogamesuncovered.com/features/vgu-interviews-enter-the-gungeon/) describes hand-designed rooms assembled into dungeons, and physical cover interactions. **Use:** place existing materials where obstruction or movement matters. An object does not earn its place just by exhibiting an elemental reaction. No copied layouts or new table-flip mechanic.
- [Hopoo's firsthand Risk of Rain 2 interview](https://www.gamedeveloper.com/design/how-moving-from-2d-to-3d-shaped-the-design-of-i-risk-of-rain-2-i-) separates premade maps from variable objects/enemies and discusses the cost of memorable generated 3D terrain. **Use:** explicit room geometry and spawn anchors, separate existing compositions. Variable routes are outside this milestone.
- [Stratton/Martin's DOOM design account](https://www.gamedeveloper.com/design/-make-me-think-make-me-move-new-i-doom-i-s-deceptively-simple-design) describes playtest exploitation of walls/chokes and combat-space iteration. **Use:** deliberately test back-wall, corner and stationary play. Do not import DOOM's speed/resources or force movement for its own sake.
- [Firsthand GDC level-design roundtable](https://www.gamedeveloper.com/design/gdc-2018-level-design-workshop-an-expert-roundtable-q-a) warns that overly wide flank routes can dilute teamwork. **Use:** two useful approaches within readable/revivable distance, not two isolated arenas. This is a limited inference for our two-player camera, not a proven co-op formula.

Acceptance criteria: one clear spatial thesis; multiple usable positions/routes; no required one-person bottleneck; cover that changes exposure without permanent sanctuary; materials with positional purpose; readable physical boundaries; base-mage completion; and reachable revival. Occupancy need not be uniform. Traces/counters identify suspicious behavior, never produce a layout score.

## Candidate theses (greybox first)

Eight authored candidates use one small RoomSpec. Geometry, two starts, reusable enemy anchors, material props and decorative metadata are explicit. Enemy composition remains external. Candidate names are development labels.

1. **Split court:** wide shallow space; staggered sight breaks divide crossfire without one central doorway.
2. **Offset gallery:** deeper room; alternating piers create three crossing circulation lanes.
3. **Rotunda:** large central obstruction; two broad routes compete with lost sight of a partner.
4. **Rising court:** a broad shallow continuous incline rises 0.66 metres across the court; no exclusive perch or precision stairs.
5. **Broken link:** two wings with north/south normal routes; a central gap offers an optional Stone shortcut. Reject if current enemies feed themselves into it.
6. **Repair yard:** an L-shaped space and selective ballast/timber/structure change sight and impact opportunities.
7. **Warden crossing:** broad diagonal/axial march space with separated peripheral shelter, not the old two-box center gap.
8. **Narrow archive:** intentionally suspicious long divider/choke; negative candidate for congestion/camping/navigation.

No winner is selected by name alone. Record candidate revisions, navigation/cheese evidence, rejection and final mapping below after simulation and actual input tests.

### Prototype checkpoint

Eight opt-in greyboxes: `?scene=trial/mixed&room=split&art=off` (substitute the IDs in `rooms.ts`; use `scene=guardian&room=warden` for the boss). Ordinary run remains unchanged pending selection. Room identity/terrain travel only on network bootstrap; no new live diagnostic history.

Reproduced: a pursuer starting on raised ground travelled **0 metres in 3 seconds** because steering assumed feet above world Y=0.3 meant airborne. Terrain-relative support restores steering without changing speed, force or stagger. The first ramp/plateau join then caught its box foot; replaced that candidate with one continuous shallow slope instead of changing locomotion physics. The regression now passes. Airborne diagnostics use the same support rule.

119 units and the eight-room real keyboard/mouse smoke pass. Screenshots inspected at 1440×900; this short smoke ran alongside evaluation and makes no performance claim. Initial delayed-policy probes expose archive stalemates and an incline aiming timeout; neither is accepted yet. Historical Guardian/trial layouts are untouched.
