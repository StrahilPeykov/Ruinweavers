# Illustrated benchmark — current bounded study

Prefer the **bright illustrated painted court** for this one benchmark. Root startup opens it; `?scene=trial/mixed&art=illustrated` is explicit. The previous proofs remain at `art=storybook|ink`; `?scene=run` remains unmodified. `?scene=run&art=illustrated` dresses only the third court and its reward stop. No five-room rollout.

The d72ae3e Storybook preference was provisional. Its comparison bundled geometry, palette and shading; it did not isolate illustration. The corrective pair (`art=storybook&treatment=original|illustrated`) uses identical GLBs, footprint, camera and actors. Brighter value-grouped graphic shading remained readable. This corrects the old inference about illustration; it still compares palette plus shading together, not a shader in isolation. Historical evidence and both old source sets are retained below and in `artifacts/art-proof`.

Firsthand principles: [Microbird's Hinterberg account](https://80.lv/articles/dungeons-of-hinterberg-shaders-gameplay-more) describes art-directed color/light, small production tools and a mixture of textured/untextured assets. We borrow selectivity, not their deferred renderer. [Shedworks' Sable interview](https://www.cookandbecker.com/en/article/170/sable-exploration-through-line-art.html) connects sparse detail, distinctive landmarks and a sense of place. Neither source establishes that weathering means fine noise or that illustration requires a dark palette. The texture-free mantle-only old assets were prototype limits.

### Current finish and durable rules

- Human head/torso/leg proportions, short split mantle, belt, satchel and asymmetric staff. Plum/teal cloth and one-disc/two-bar marks identify players independently of spell color. Direction is carried by head, shoulders and staff, not a face close-up.
- Named articulated joints drive walking/strafe steps, knees, counter-swing and cloth follow-through. Authoritative cast events begin a purposeful arm/staff gesture immediately; bounded recovery follows. Hit recoil and a kneeling/slumped downed pose replace the flat silhouette. Existing enemy telegraph/recover phases drive lean and aperture light. No animation changes attack, damage or collision timing.
- Quiet broad floor; cool surviving painted masonry, warm exposed edges, deliberately large repair seams. The Broken Court palette is regional. The repaired lens is grounded beyond the left wall and visible from the start; terraces, distant columns and a few broad foliage masses suggest a world beyond the boundary. Decorative walls replace the same solid visual envelope; queries still use existing colliders.
- Built-in three-band Toon shading, restrained actor-only backface contour hulls, vertex pigment and **one shared 256×256 broad wash texture**. No post-process, texture noise, unsupported Blender material graph or high-resolution texture set. Lightweight carries the same forms/materials; Standard adds ground shadows; illustrated asset surfaces do not receive self-shadows, avoiding fine striping on fitted ornament. Do not make shadows carry identity.
- Preserve existing spell silhouettes, open steam strokes, state overlays, hazard edges and actual alteration geometry. Travelling Basin, Stone echo, two manifestations and tethered Updraft are real rules exercised in the paired sequences. Static ornament does not glow or pulse. Small HUD labels receive backing; normal gameplay has no title/branding.

### Editable source and export

`npm run art:finish` runs `scripts/art/finish-author.py` in free Blender 5.2, then the existing glTF Transform/validator packager for **illustrated only**. It retains `assets/art-source/illustrated.blend`, the shared PNG and all generation code. Old `npm run art:build` remains unchanged. Metres, feet at zero, Blender -Y forward → glTF +Z; the player adapter retains its existing rotation. The source human crown is 1.90 m and the view uniformly fits it to the existing 1.4 m gameplay body (the staff tip extends slightly above). The mage has 11 articulated mesh parts, eight used materials and a named transform hierarchy; its new performance is runtime joint posing, **not an exported skeletal animation clip**. The old mantle clips remain in the old proofs.

Ten GLBs total **1,375,180 raw bytes**, each independently validates with zero errors/warnings. The same embedded PNG is deduplicated to one runtime texture; a three-texel diffuse ramp and existing effect texture complete the Lightweight texture set. Cached geometry/texture resources live for the page; each instance owns disposable materials. The matching vessel uses the same palette/packaging. No external asset provenance or licenses are required: all new geometry/pigment is original scripted work.

### Evaluation and remaining gap

`/art-finish/index.html` contains actual engine contact sheets and four short paired recordings. No new concept art is used. Same footprint/camera/seed, two mages, four enemies and scripted action sequence; wall-clock input under different rendering conditions is not tick-identical playback. HP/position/AI fixtures reach the comparison and reward stop; casting, reactions, upgrades, dodge and held-E revival use real browser inputs. These are visual/lifecycle comparisons, not unassisted full runs. Grayscale/deuteranopia views are diagnostic aids, not complete accessibility validation.

The new treatment is preferred by visual judgment: more human movement, clearer crafted repairs, better foreground/background grouping and a visible landmark, without covering danger. It is substantially more coherent than the old primitive costume, but remains a small stylized benchmark: no foot IK, authored skeletal clips, facial performance or hand contact solver. Low-angle cast silhouettes and feet can still feel procedural. This does not demonstrate commercial illustration finish or prove physical laptop comfort. The generic prior concept sheet contains detail/composition absent from the engine; it is not an achieved target.

Small later rollout: reuse the mage hierarchy/material vocabulary, fit boundary modules to each existing collider arrangement, and compose one landmark per camera view. Recheck the existing paired alteration/reward/reset sequence per arrangement. Do not clone this whole court five times or add gameplay to compensate for art. Stop after this benchmark.

### Current measured conditions

Build **3e5e03333abb / protocol 3**, Windows, installed Chrome 152 headless, **ANGLE Intel UHD / Direct3D 11** (actual reported renderer). Two same-machine WebRTC contexts, 1440×900 CSS / 1152×720 Lightweight buffer. Four enemies with AI disabled for the matched load; two normally cast fields receive a labelled 120-second lifetime fixture so slow rendering cannot expire the load. Actual held Ember/Stone inputs, 60 rAF intervals/client, no video/encoding during the sample. Active AI and normal-lifetime effects are exercised separately in the motion clips.

| Current matched sample | Calls host/guest | Triangles host/guest | Textures | Mean ms host/guest | p95 ms host/guest |
|---|---:|---:|---:|---:|---:|
| Old Storybook | 126/128 | 13,506/13,698 | 1 | 16.56/16.53 | 16.7/16.8 |
| Illustrated benchmark | 245/245 | 31,904/31,904 | 3 | 16.51/16.51 | 16.8/16.8 |

This is one short hardware-backed sample, not a sustained 60 FPS guarantee, Internet/remote-laptop test or proof that added draw calls are free. Existing effect phase accounts for small client count differences. Current local fetch/parse was 66.7/87.8 ms for illustrated assets; cache/local server timing is not an Internet load estimate. Four resets return to 75 geometry resources/3 textures, without accumulation. Standard quiet view has 221 calls/42,272 triangles and five textures (including shadow resources), 1440×900 buffer. The new mage has 11 mesh parts/eight source materials; the static surround has one mesh/five materials. Preserve batching and shared pigment as production expands.

The first paired run used Chromium 153 / Vulkan SwiftShader; six checks passed but the illustrated render sample failed after its normal-duration fields expired. That invalid sample is not used as a comparison. The fixture now keeps the load alive. Native Chrome was explicitly tried without software-renderer flags and reported Intel UHD; no OS/driver settings changed. Earlier software screenshots/timings are iteration evidence, not hardware predictions. See TESTING.md for the complete validation outcome.

A separate current Standard co-op sample used the same hardware, viewport, actors, fields and real inputs at 1440×900 drawing buffer: 349/354 calls, 52,222/52,616 triangles, five textures, mean 16.39/16.38 ms and p95 16.7/16.8 ms (host/guest). It also consists of only 60 intervals/client. Both quality settings were actually exercised; the public short clips use Lightweight.

## Historical d72ae3e proof

The brief is travelling mages inside places constructed by old magic: capable small people, warm curiosity, ancient scale and readable danger. This is one existing mixed encounter footprint, not a five-room reskin. Root startup opens the study; `?scene=run` and explicit Lab/trial links keep the accepted baseline. Art is local presentation, never networked gameplay configuration. With `?scene=run&art=storybook|ink`, only the third court receives the sample treatment, including its reward stop.

## Three proposals

See `artifacts/art-proof/concept-targets.png`: original subscription-native generated concept targets, **not gameplay**. The sheet includes gameplay composition, mage/role silhouettes, materials, effects and reward treatment for each.

- **A — Sculptural Storybook / The fitted court.** Round mantle, dark face opening, crooked measuring staff, shoulder wrap and satchel. Sentinels are upright optical instruments; pursuers are low fitted carapaces. Rounded ceramic segments, muted patina, selective brass bindings, warm upper surfaces. The monument is a broken fitted lens. UI resembles a simple incised tablet. Signature: magic and architecture share purposeful fitting and construction, while active strokes alone glow. Risk: becoming generic soft low-poly; remedy is the distinct fitted silhouette, not more texture noise.
- **B — Ink & Pigment / The folded court.** Angular hood and pleated fan mantle, slit-like sentinel, prow-shaped pursuer. Cool folded planes, warm paper accents, sparse dark scored joints, a monument of stacked fins. Three-band diffuse shading and folio-like reward cards. Signature: spell strokes appear to assemble physical folds. Risk: dark silhouettes merging and hard shading crawling at low resolution; test in motion rather than adding a full-screen contour pass.
- **C — Weathered Mythic.** Heavier travel coat/boots, iron-braced constructs, eroded stone and leather journal UI. Broken masonry lens, directional wear and restrained pigment. Signature could be old magical repairs binding damaged matter. Not built in engine: much of its distinction depends on subtle wear/roughness at a scale the present camera may discard. It also introduces the largest authored texture/detail burden. A/B test stronger shape-based alternatives with comparable completion.

## Research translated into tests

These are observations and design inferences, not claims about another game's proprietary implementation. No reference images or assets are redistributed.

- [TUNIC official media](https://tunicgame.com/) and [Death's Door official media](https://playdeathsdoor.com/): small readable figures and large, composed spaces. Test compact upper-body silhouettes against restrained floors and a single landmark. Do not copy protagonists, levels or motifs.
- [Ravenswatch / Passtech](https://www.passtechgames.com/): graphic value groups and assertive shapes in elevated combat motivate B. Appearance does not establish its exact shader or texture pipeline.
- [Hades official showcase](https://www.supergiantgames.com/games/hades/): composition and coordinated world/UI contrast motivate a shared material language. We do not infer that its environment production approach fits our movable Three.js camera.
- [Valve's Character Art Guide](https://help.steampowered.com/en/faqs/view/0688-7692-4D5A-1935): orientation, silhouette, value grouping and resting areas. Retrieved the actual guide's embedded text when the page extractor exposed only an image. Test head/weapon direction at gameplay size and one-disc/two-bar personal identity in grayscale.
- [Riot: Clarity in League](https://www.leagueoflegends.com/en-us/news/dev/clarity-in-league/): match effects to hit areas, preserve importance hierarchy and limit accumulated noise. Enemy danger gets an edge/bright core; steam uses open strokes; ordinary decoration stays static and low contrast. Not a full accessibility assessment.

## Reproducible production contract

`scripts/art/author.py` runs in free Blender 5.2 background mode. It generates original meshes and an editable `assets/art-source/{storybook,ink}.blend`; each named source hierarchy exports independently to GLB. `npm run art:package` uses glTF Transform weld/dedup/prune while preserving names/animation, then Khronos glTF Validator. `artifacts/art-proof/assets.json` records byte/resource counts and errors/warnings. No external assets, texture pack, paid service or custom shader framework.

Author in metres, Z up, feet at zero, front -Y. Blender exports Y up, front +Z. The player view adapter rotates the asset 180 degrees because existing player facing uses -Z; enemies already use +Z. Body-center offsets stay in the view. Cover cap bounds are exactly the existing 1.8 × 1.7 × 2.2 collider; bevels/trim stay inside. The landmark is beyond the north boundary. Vessel is a repeatability prop on the existing boundary, not a new interactive object. No art mesh participates in picking or collision.

Materials: standard glTF base color/roughness/metalness only, texture-free. Palette factors are exported linear from sRGB author colors. A uses MeshStandardMaterial; B maps the same vocabulary to built-in MeshToonMaterial with a three-texel nearest-filter diffuse ramp. No Blender procedural nodes are assumed to transfer. Lightweight uses the same silhouettes, surfaces, effects and contact discs; Standard additionally enables the existing real-time shadows.

Mantle node animation is exported to GLB and played through AnimationMixer. Movement changes its playback rate; a bounded pursuing wind-up lean never changes the collision body. No animation controls damage/timing. Clones share immutable geometry, own disposable materials, and stop/uncache their mixers on reset. The library lives for the page lifetime; reset must not dispose shared geometry. Asset bytes participate in the build hash and fetch version.

One-command rebuild: `npm run art:build` (free Blender on PATH, `BLENDER_BIN`, or the installed Windows 5.2 location). Runtime deployment uses the committed GLBs and does not need Blender. A second complete generation/export/validation succeeded. Blender may reorder internal exported data and change bytes without changing asset counts/bounds; this is a reproducible authoring recipe, not a claim of byte-identical Blender output. All 18 final files validate with zero errors/warnings. The matching vessel uses exactly the same palette/export rules as the actors and architecture. No external asset licenses are required; source meshes are original.

Art additions exposed a child-order dependency in the existing expiry feedback: the last added owner dot received the pulse instead of the field cue. The renderer now names its expiry cue explicitly; Stone's owner dots sit above its top surface. Real-input browser regressions check a steady owner mark and a pulsing expiry cue. This changes presentation only, not field lifetime/collision/capacity.

The existing Create/Join buttons previously replaced every non-run scene with the full trial. They now retain `trial/mixed`, so both mages can enter the actual selected proof immediately. Other connection settings, host authority and party rules remain unchanged. Both clients assert encounter 2 and art activation before the performance sample. Earlier measurements with inactive art are retained as explicitly invalid evidence, not used to compare the directions.

## Durable visual rules — recommended fitted court

- Large upper-body mass, dark face opening, asymmetric implement and satchel. Avoid detail below roughly a few gameplay pixels.
- Mages retain personal cloth/accent plus one-disc/two-bar ground identification regardless of Principle. Shared spells never recolor the entire actor.
- Upright ranged aperture versus low forward prow/carapace. State overlays and telegraphs remain visible over both.
- Broad quiet floor surfaces; fitting/joints concentrate on architecture. Static marks never blink, radiate or use spell colors.
- Ember is a tapered shot; Tide is a bounded fluid contour; Gale is open directional strokes; Stone is fitted angular structure. Preserve existing ranges, fields and targeting previews. Open steam strokes reveal transformation without opaque smoke.
- Warm/cool and light/dark relationships matter more than one permanent regional palette. The Broken Court does not define all future regions.
- Reward cards use the same material vocabulary. Instruments remain collapsed; links between studies appear at the stopped encounter screen, not across the combat view.

## Recommendation and scope of confidence

Choose **A, Sculptural Storybook / the fitted court**, as the production starting point. In matched gameplay views its upper masses stay distinct from the floor, the aperture/carapace split explains the two roles, and plum versus jade plus disc/bar marks keeps the mages identifiable. The warm fitted construction better supports capable travellers and curiosity than B's darker folded planes. This is a visual judgment, not a numerical proof of taste. B remains playable; its angular forms are useful, cheaper in triangles/bytes, and may suit a different region, but its dark face/cloth planes merge more at the current screen footprint.

The generated concept sheet has much more surface finish and environmental composition than these engine samples. It is not evidence that we have already achieved that finish. The proof establishes original asset forms, the material/animation/export contract and readable spells in motion. Fine garment detail is mostly lost at this camera; the arch becomes clear when moving north, but its crown is cropped from the southern start. Neither issue justifies changing the combat camera during this study.

Matched motion cases use seed 3, the same third-court layout, two actors/four enemies, real WebRTC, real casts/movement and personal reward clicks. Labelled HP/position/AI fixtures reach and arrange the visual sample, not a human run. The two loadouts demonstrate travelling Basin + Stone echo and capacity + tethered Updraft. Existing upgrade rules, timing, damage, interference and collision remain authoritative. A/B captures use identical scripted intents but wall-clock automation under software rendering is not pixel- or tick-identical playback. Grayscale and deuteranopia emulation help inspect grouping, not validate complete accessibility. Both templates returned from the real reward menu into the unchanged next encounter.

## Measured proof footprint

Build **dc555541c837**, Windows, headless Chromium 153 / ANGLE Vulkan **SwiftShader**, i7-10750H (6 cores/12 logical). The machine reports Quadro T1000 Max-Q and Intel UHD adapters, but neither was the renderer used for these measurements. Two same-machine WebRTC clients, 1440×900 CSS / 1152×720 buffer, Lightweight; four existing enemies, two fields, actual held Ember/Stone casts. AI disabled only for the matched resource sample; active pursuit/danger is covered in the motion journeys. No video recording/encoding during these samples. Each row is one 60-rAF-window/client, not repeated statistical benchmarking.

| Sample | Draw calls | Triangles | Geometry resources host/guest | Textures | Mean frame ms host/guest | p95 ms host/guest |
|---|---:|---:|---:|---:|---:|---:|
| Greybox | 75 | 3,092 | 30/31 | 1 | 92.8/93.5 | 166.6/166.6 |
| Storybook | 112 | 12,738 | 71/72 | 1 | 153.4/153.4 | 233.4/233.3 |
| Ink | 112 | 7,290 | 71/72 | 2 | 132.2/131.4 | 199.9/183.4 |

These slow software frames are not laptop GPU predictions. A is the visual recommendation despite greater measured cost; B is the cheaper geometry/material alternative. There is no measured hardware 60 FPS claim. The extra texture in B is its tiny diffuse ramp; the GLBs themselves have zero textures. The nine GLBs total **280,860 bytes A / 174,132 bytes B**, raw file sizes, not compressed transfer. Local fetch+parse measured A 26.6/668.5 ms host/guest and B 58.3/206.7 ms; contention/cache/order makes these observations unsuitable as Internet loading estimates. Existing Rapier remains the largest bundle component.

Four reset cycles per direction did not grow texture or geometry counts; a single local mage retained one mixer. Standard screenshots use the same posed scene at 1440×900 buffer with existing shadows enabled; the visual identity is already present in Lightweight. Keep this proof's measured resource footprint as a rollout reference, not a universal polygon budget. Avoid multiplying per-object material variants, floor pieces or transparent effect layers as the room vocabulary grows. Full samples and reset data are in `artifacts/art-proof`.

### Small rollout, not automatic expansion

1. Refine this one mage's cloth/step animation and replace very fine trim with wider, calmer fitted joints. Keep the validated scale/pivots and stable personal identity.
2. Extend the winning stone/brace vocabulary into a few wall/cap/floor modules inside the existing colliders. Compose one readable landmark per existing arrangement; do not clone five identical arches or add obstacles.
3. Apply the chosen UI/effect treatment to the run and recheck the same paired reaction/upgrade/reset clips in both quality modes. Broader regional palettes come later; no new gameplay systems are needed.

Stop here. Do not reskin all five encounters or expand mechanics without the next task.
