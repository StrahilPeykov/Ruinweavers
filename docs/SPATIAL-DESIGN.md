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

Selection followed simulation, navigation probes and actual input tests; names alone were not acceptance criteria.

## Selection and revisions

The normal run now maps its unchanged compositions to **split → gallery → rotunda → yard → warden**. Ordinary diagnostic comparisons all use the same two sentinels/two pursuers; the Guardian comparison uses the same body, plates, stats and maneuvers. `run-classic` retains the previous physical Guardian run; all trial scenarios and `run-legacy` remain.

- **Split (26×18):** broad crossfire and staggered sight breaks. Moved timber away from a cover corner: its first placement made an accidental narrow pocket, not a useful material choice.
- **Gallery (22×24):** three circulation lanes around alternating piers. Shortened piers and offset the southern one; moved loose stone out of the central junction. These changes removed the observed pursuit traps while preserving sight breaks.
- **Rotunda (24×22):** a solid 5×6 island forces two broad approaches. Firing and fields must choose a side; a partner can go around the other side. The central lens makes that obstruction legible.
- **Yard (26×22, northwest area blocked):** an elbow-shaped floor turns the firing line. Timber, ballast, brittle structure and loose stone occupy the open elbow/right approach, not repeated default coordinates. Vessels on the closed block identify the work yard.
- **Warden crossing (28×24):** broad central diagonals and three separated peripheral breaks. Several march directions remain open, while cover has to be approached from different places. The final crest/bindings remain tied to authoritative victory.

Rejected, retained as greyboxes: **archive** allows ranged stalemates and isolates partners behind a long divider; **broken link** does not make enemies fall in the sampled cases but strands them at the ledge instead of using the bypass; **rising court** supports ordinary uphill/downhill pursuit after the support fix but still strands two pursuers at the upper-right material/cover arrangement. Three solo moving policies also timed out there while field/structure completed. That is partly policy/aim sensitivity, not proof that elevation or those spells are intrinsically bad. Do not build a navmesh or change spells to rescue these candidates in this milestone.

The original centre-ray steering selected paths too narrow for actual box bodies, including existing props that it ignored. A three-ray attempt improved only some corners. A shallow Rapier body sweep within the **same eight-direction steering fan**, plus the two placement revisions above, resolved the accepted ordinary-room cases. No new AI state/path search or tuning. Diagnostic stationary targets remain invulnerable only in the explicitly labelled navigation probes; combat evaluations use normal health. Every pursuer reached the six tested targets in split/gallery and the five valid yard targets. One rotunda pursuer stopped 2.85m from a target already surrounded by its peers; this is near-target crowding, not the earlier distant wall trap. Dynamic crowding and player-made geometry remain limits of reactive steering.

## Matched combat evidence

`scripts/evaluate-spatial.ts`: 320 initial candidate cases, then 240 selected/old-Guardian cases after the clearance/placement correction. Five builds × solo/pair × four movement policies × six layouts in the second batch; each is unique, not repeated identical coverage. The ordinary four rooms use identical mixed compositions. `selected-results.json` preserves compact outcomes; `/spatial/index.html` shows plans and sampled trajectories/field placements. Full local traces remain ignored. The earlier candidate results/navigation failures are retained separately.

All **50 moving selected-room cases won**, including the base mage. Seconds / damage taken for solo moving policies:

| Room | Base | Reaction | Field | Structure | Basin/Ember |
|---|---:|---:|---:|---:|---:|
| Split | 22.1 / 26 | 16.2 / 28 | 15.9 / 0 | 10.4 / 0 | 15.2 / 0 |
| Gallery | 23.6 / 26 | 16.5 / 0 | 19.1 / 0 | 11.2 / 14 | 12.6 / 42 |
| Rotunda | 23.6 / 0 | 15.9 / 0 | 20.0 / 14 | 11.9 / 14 | 11.5 / 0 |
| Yard | 21.7 / 0 | 15.3 / 0 | 16.9 / 2 | 10.0 / 0 | 10.4 / 0 |
| Warden | 45.0 / 14 | 28.2 / 0 | 32.0 / 0 | 14.3 / 0 | 14.0 / 0 |

The gallery makes the Basin policy less safe than its reaction alternative; the rotunda gives fields less direct coverage than split crossfire. These are useful spatial sensitivities, not proof of human preference. Structure remains fast, and Basin remains strong; no nerfs were applied. The yard is the easiest sampled ordinary room, though its actual run composition has three pursuers/one sentinel rather than the matched evaluator's lineup.

Warden solo base changed **43.4→45.0s** (14 damage both); field **27.7→32.0s** (0 both). Pair Basin **10.6→15.1s**, reaction **19.4→20.7s**. Geometry/starts/material positions changed, rules did not. Stationary solo base wins faster in the new arena (39.0s) but takes 82 damage; moving takes 14. Thus it does not dominate safety and speed together. Strong upgraded stationary strategies still win. No new boss HP or timing change is justified by this evidence.

The matched base probe sees three volleys, six marches and three pulses in the new room versus three/five/three previously. Total committed march travel is 19.9m versus 23.0m: a larger floor does not automatically make each route longer. Eight hostile projectiles hit cover versus six previously; these are blocks, not an estimate of damage prevented. Both physical plates detach. Actual-input captures show different committed diagonals and a readable pulse boundary; the boss did not remain stuck in these completed cases.

Negative controls start stationary, at the back wall or in a corner; they keep the same casting/observation capability and disable dodge/movement. They are not intentionally weakened aim agents. Of 30 negative cases per selected room: split wins/defeats **11/19**, gallery **8/22**, rotunda **8/22**, yard **6/24**, Warden **29/1**. None times out after the corrections. Strong stationary boss play remains viable; room geometry does not solve that broader tuning question. The old Guardian corner fixture can remain harmlessly separated, while the new corner cases resolve. Do not equate every block/deflection with prevented damage.

Diagnostics: position samples every 0.25s, 2m occupancy cells, distance, boundary/stationary time, approximate LOS exposure, field distribution, near-partner time, suspected stalled pursuit, falls, casts/reactions/control and snapshot peaks. The shared legacy keyboard motor still pulls toward the central 18×16 region: unused outer areas partly reflect that policy. Policies observe with 200ms delay and imperfect aim, not validated human skill. No uniform-occupancy or layout score target. No accepted moving case had a fall; the old-Guardian paired field comparator recorded one. A baseline Stone approach to gallery cover loses elevation on expiry in a focused regression; this does not exhaust all constructed stair/build combinations.

## Playable selection and remaining weaknesses

Root opens the fixed illustrated run; no technical selection is required. The study page links all eight plans, five matched moving-build traces per winner, base corner negative traces and a two-mage rotunda trace. Blue/rose are players, red enemy paths, purple field placements; these are sampled trajectories rather than a heatmap asserting uniform use is desirable. Actual normal-camera gameplay/contact sheet and motion are separate. Existing art assets are reused with collider-fitted cover, instanced inlay and room-specific masonry/pigment/landmarks. No new mesh library, physics material or boss adjustment.

Actual solo and two-client runs exercise the selected spaces with active enemies, normal health, real casting and all three personal cards. The isolated new Guardian additionally exercises all maneuver families, phase change, defensive Stone/Gale inputs and co-op revive/retry. A separate rotunda fixture proves an alternate physical route to a downed partner; it deliberately removes pressure and is not a claim that every revive is safe. Test and performance details: [TESTING](TESTING.md).

Remaining limits are concrete:

- All five accepted walking surfaces remain flat. Gentle elevation was tested, but its current arrangement and reactive steering were not reliable enough to ship. The broken bypass needs better authored enemy approaches before reuse. No navmesh was added.
- Reactive body-clearance steering still permits near-target crowding and has not exhausted combinations of player-created cover. No selected probe showed a permanent distant trap; that is bounded evidence, not a global reachability proof.
- Strong upgraded stationary Guardian play remains effective. The yard is relatively easy in matched probes, and Structure is consistently quick. Geometry changes opportunities, but human preference, repeat-run variety and the durability of these advantages still need hands-on play. No spell nerfs were used to manufacture distinctions.

This milestone stops at authored room quality. The five-beat sequence, reward placement and replay rules stay fixed; Run Topology has not begun.

Reproduce locally (use a fresh output directory, and do not overlap batches/encoding with browser performance samples):

```powershell
npx tsx scripts/evaluate-spatial.ts '--rooms=split,gallery,rotunda,yard,warden,guardian-old' --output=artifacts/spatial-0.3/raw/my-batch
npx tsx scripts/probe-room-navigation.ts artifacts/spatial-0.3/raw/my-navigation.json
npx tsx scripts/spatial-report.ts artifacts/spatial-0.3/raw/my-batch
```

The report command deliberately updates the compact selected report/page; archive previous evidence before using it for a new revision. Standard unit/browser commands remain in AGENTS.md. Set `RUIN_GUARDIAN_ROOM=warden` for the existing isolated Guardian journeys; omission preserves their historical arena.

### Historical prototype checkpoint (6797f89)

Eight opt-in greyboxes: `?scene=trial/mixed&room=split&art=off` (substitute the IDs in `rooms.ts`; use `scene=guardian&room=warden` for the boss). At this checkpoint the ordinary run was unchanged pending selection. Room identity/terrain travel only on network bootstrap; no new live diagnostic history.

Reproduced: a pursuer starting on raised ground travelled **0 metres in 3 seconds** because steering assumed feet above world Y=0.3 meant airborne. Terrain-relative support restores steering without changing speed, force or stagger. The first ramp/plateau join then caught its box foot; replaced that candidate with one continuous shallow slope instead of changing locomotion physics. The regression now passes. Airborne diagnostics use the same support rule.

119 units and the eight-room real keyboard/mouse smoke passed. Screenshots inspected at 1440×900; this short smoke ran alongside evaluation and makes no performance claim. Initial delayed-policy probes exposed archive stalemates and an incline aiming timeout. Historical Guardian/trial layouts remain explicit regressions.
