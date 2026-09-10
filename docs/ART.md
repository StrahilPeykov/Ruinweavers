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

## Durable visual rules (provisional until motion comparison)

- Large upper-body mass, dark face opening, asymmetric implement and satchel. Avoid detail below roughly a few gameplay pixels.
- Mages retain personal cloth/accent plus one-disc/two-bar ground identification regardless of Principle. Shared spells never recolor the entire actor.
- Upright ranged aperture versus low forward prow/carapace. State overlays and telegraphs remain visible over both.
- Broad quiet floor surfaces; fitting/joints concentrate on architecture. Static marks never blink, radiate or use spell colors.
- Ember is a tapered shot; Tide is a bounded fluid contour; Gale is open directional strokes; Stone is fitted angular structure. Preserve existing ranges, fields and targeting previews. Open steam strokes reveal transformation without opaque smoke.
- Warm/cool and light/dark relationships matter more than one permanent regional palette. The Broken Court does not define all future regions.
- Reward cards use the same material vocabulary. Instruments remain collapsed; links between studies appear at the stopped encounter screen, not across the combat view.

Evaluation, recommendation, named environment measurements and rollout boundary will be added after matched in-engine motion checks. Do not roll this treatment across all five encounters automatically.
