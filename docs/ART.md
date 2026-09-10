# Art direction proof — current bounded study

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
