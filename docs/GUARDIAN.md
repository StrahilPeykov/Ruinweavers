# Guardian 0.1 — The Bound Warden

Baseline: clean main 3ddebb2, Build Identity 0.2. One Guardian replaces the ordinary fifth court; the original final lineup remains an explicit regression scene. No spell, upgrade-pool, normal-enemy or movement retuning. Prior evidence stays historical and intact.

Baseline validation: 96 units and production build pass; browser sweep 48 passed, one opt-in live TURN skip, one pre-existing failure at coop.spec.ts:265 (allied-projectile contact timeout). Its screenshots show the pointer no longer over the partner after the fixture teleport/camera follow. Preserve this as a harness finding; a constant screen pointer is not a constant world target while the camera settles. No Guardian runtime had been loaded during this sweep.

## Research → implementation hypotheses

- Supergiant's [Big Bad patch notes](https://www.supergiantgames.com/blog/hades-big-bad-update-patch-notes/) explicitly shorten boss invulnerability, restore knock-away relevance, and adjust tracking/attack speed/visual alignment. Use no immunity phase, lock committed routes, and test existing force rather than disabling it. These are documented iterations, not a claim to reproduce their implementation.
- Beca Vessal's [firsthand Psychonauts 2 GDC slides](https://media.gdcvault.com/gdc2023/Slides/CraftingEpicBoss_Vessal_Beca.pdf), especially the common telegraph/attack/recovery chain and phase reuse, support a small finite maneuver model. We need three concrete chains, not their general editor/behavior-tree tooling.
- Passtech's [June 2024 official notes](https://store.steampowered.com/news/posts/?enddate=1719501134&feed=steam_community_announcements) scale elite/boss stagger resistance by chapter. This establishes resistance as tunable rather than control deletion; first test Ruinweavers' existing .4 s / 1.4 s stagger gate and material mass/cohesion. Do not import their percentages.
- Andrii Honcharuk's [co-op design account](https://www.gamedeveloper.com/business/ready-player-two-co-op-is-a-new-big-thing-) distinguishes shared objects, targeting and support pressures. Our limited application: alternate valid living targets at maneuver selection, keep shared cover and risky revival useful. No compulsory two-person puzzle; no assumption that doubling HP solves co-op.

## Initial prototype, not final tuning

A heavy structural core and two fitted, wettable structural plates use ordinary heat, water, cohesion and impulse operations. Plates intercept real attacks and detach when cohesion fails; the core is always damageable. Existing force/stagger remains active. A plate is optional protection, never a mandatory HP gate. No ownership/build checks in Guardian behavior.

Shard volley: a small fixed fan of blockable/deflectable projectiles. Bound march: late route lock, committed travel, visible recovery. Furnace pulse: marked local heat burst; the construction retains real heat. One short phase transition loosens an exterior binding and recombines the same actions. Initial solo HP/tempo and any later co-op adjustments must be evaluated and recorded below before recommendation.

Authoritative maneuver state is replicated explicitly; cosmetic poses never choose attacks or damage. No unbounded debris. The two plate bodies themselves supply movable material. Shared Vapour remains unchanged and receives a matched with/without test.

## Implemented rules

The final run court and isolated `?scene=guardian` contain a 900-HP, mass-32 core and two 140-HP, mass-8 plates. They are ordinary wettable structural entities: core cohesion .65, plates .8. Rapier fixed joints bind plates until HP or cohesion reaches zero. Core death releases both; phase two releases one surviving binding. There is no damage transfer, immunity window or prerequisite part gate. Loose plates use the existing momentum-impact rule and keep source/recipient attribution. Two bodies are the entire debris budget.

| Maneuver | Telegraph / locked commitment / attack / recovery | Consequence |
| --- | --- | --- |
| Shard volley | 1.2 / .35 / .2 / 1.7 s | Three low shards, 8 m/s, 14 ordinary hostile damage, ±.27 rad fan. Gale redirects; Stone/terrain blocks; first body intercepts. |
| Bound march | 1.1 / .4 / up to 1.25 / 1.8 s | Target followed during preparation only; then fixed direction, at most 8.5 m. Physical drive at 7 m/s (8 in phase two), one 18-damage contact per living player per march. Cover/footing/impulses remain real. |
| Furnace pulse | 1.25 / .35 / .2 / 1.9 s | 4.5 m radius plus body radius, terrain obstruction and generous 3 m vertical tolerance. 12 direct damage +65 heat to nearby bodies; +85 heat to attached construction. Existing water/heat rules decide steam, including self-attributed thermal stress. |

At 55% HP, the next recovery becomes a .9-second construction shift. Already telegraphed attacks finish; damage is never gated. Phase two repeats Volley → March → Furnace → March with recovery at 85% of the original duration. Existing repeated-stagger gating pauses maneuver progress without resetting it. This gives control time without an endless restart loop.

Target selection rotates through sorted living actor IDs at each maneuver selection. A committed attack retains its route even if the target moves or falls; next selection excludes the downed actor. Normal revive and encounter-clear recovery remain unchanged. Co-op core HP is 1.35× (1,215); plate HP, damage, projectile count and rules are identical. Both players share the physical consequences; no build-name or elemental-weakness checks occur in Guardian AI.

## Bounded iteration log

1. `baseline-layouts.json` is the first valid 48-case configuration sweep. Earlier `baseline-full.json` is retained under ignored raw evidence: the run overrode its isolated layout labels, so it is not claimed as two-layout coverage. Same policy, 10 Hz decisions, 200 ms delayed observations plus imperfect aim; exact-state diagnostics are labelled separately.
2. Initial phase switching could cancel a promised attack. Transition now waits for recovery, with a focused regression. This is a reliability correction, not a DPS adjustment.
3. Paired Structure/Basin won in roughly 7 seconds and usually skipped Furnace. Test 1.35× core durability, retaining alternating targets and all damage. `candidate.json` gives stronger builds roughly 9–11 seconds and other paired builds about 16–34 seconds. Strong pairs can still end before Furnace; no further HP padding merely to force an identical moveset exposure.
4. A low shard at .85 m skimmed Stone's .85 m top. Move it to the existing hostile .65 m height. Both real-input and simulation blocking checks cover this boundary.
5. A 14-unit gust moved the fully bound core only about .0005 m with inherited friction. Guardian/plate bronze footing now uses .08 friction with the minimum combine rule; mass and cohesion still resist. Normal enemies and props are unchanged. This is modest sliding, not launchability or immunity. The phase/force/cover regressions pass together.
6. Loose-body impacts execute after the maneuver tick. Added final lifecycle resolution before victory freezes the world, so a final impact cannot leave a live-looking stage behind a victory result.
7. Stationary fire exposed a layout problem: the old central cover gap was about .14 m narrower than the fitted body. Three base-mage marches travelled only 4.8 m total. Guardian-only cover moves .8 m outward on each side, with matching rendered/physical geometry. The old trial and `run-legacy` footprints stay intact. Stationary base changes from victory/42 damage to defeat/100; moving base still wins (43.43 s /14 damage). Strong Basin/Structure remain fast. No spell or enemy damage inflation was used.
8. The isolated scene was not on the Create/Join scene allowlist, so hosting converted it to a normal trial. Both paths now preserve Guardian and legacy-run scenes. The two-browser regression then passed, including a real E-held revive during active Guardian AI.

## Tooling and production

`node scripts/art/build.mjs --guardian` authors the original model and plate from `warden-author.py`, reusing the illustrated export/material helpers. Editable sources: `assets/art-source/warden.blend` and `wardplate.blend`. Runtime core 188,084 bytes / six meshes / five materials; shared plate 80,436 bytes / one mesh / four materials; Khronos validation zero warnings/errors. Mesh count is not draw-call count: material groups produce multiple calls. One shared pigment texture joins the existing shared runtime texture. No external art or paid assets.

`simulation/guardian.ts` owns finite maneuver state, explicitly included in compact `live.guardian`; exact-build compatibility remains. `render/guardian.ts` has seven reusable danger meshes. Cosmetic articulated poses consume rendered motion/delta and authoritative stage changes, never advance gameplay. The final crest and binding settle on normal authoritative victory. `run-legacy` and `npm run evaluate:run` retain the original unmodified five-lineup regression; root remains the current Guardian run.

Use `npx tsx scripts/evaluate-guardian.ts --output=...` for actual Simulation/Rapier batches, `--held-out` for untouched offset/side-cover conditions, and `--stationary` for a deliberately immobile/no-dodge sensitivity check. The wrapper observing Shared Vapour delegates every operation to the real rule; it reports offered water, transfers, newly wet targets and immediate reactions, not counterfactual damage credit. These policies are not human skill models. Browser fixture builds are explicitly labelled; all claimed attacks/revival use real controls.

## Final matched evaluation and decision gate

`artifacts/guardian-0.1/final.json` and `held-out.json`: policy `guardian-policy-1`, simulation/policy source `9708f6a77d28`. All 96 cases complete: six builds × solo/pair × delayed/exact observations × four matched configurations (two development, two held-out). Identical deterministic repetitions are not additional coverage. Exact-state diagnostics are separate; the table reports only the 200 ms observation-delay / imperfect-aim policies, averaged across the four configurations. Pair damage is total party damage, not a per-player value.

| Build | Solo seconds / damage | Pair seconds / party damage |
| --- | --- | --- |
| Base, no upgrades | 48.50 / 14 | 35.69 / 10 |
| Reaction: Divided Stream, Undertow, Shared Vapour | 24.35 / 14 | 18.82 / 0 |
| Same reaction policy without Shared Vapour | 23.83 / 0 | 18.42 / 7.55 |
| Field: Double Inscription, Crosswise Seam, Migrating Inscriptions | 25.81 / 8 | 16.72 / 0 |
| Structure: Stone Remembers, Walking Fault, Break the Seal | 14.52 / 0 | 10.81 / 3.5 |
| Basin: Travelling Basin, Through the Embers, Shared Vapour | 13.87 / 0 | 10.74 / 10.5 |

These builds exploit different operations, not different boss parameters. Field policies move inscriptions (37 solo / 51 paired migrations across four delayed cases), deflect shards (10 / 14), and maintain spatial pressure. Structure releases cohesion before exploiting force (29 / 21 seal releases). Reaction distributes water and repeatedly transforms construction. Direct Ember remains viable without an upgrade. Plate/core/actor damage routes remain separate; Guardian self-heating reactions are not silently credited to a mage.

Control remains useful without indefinite stun: sampled stagger fractions are roughly .15–.26 across upgraded cases, using the unchanged repeated-stagger recovery rule. Every delayed Structure, Reaction and Field solo case sees Furnace; two of four Basin solo cases do. Strong paired Structure/Basin cases finish before Furnace, although all see March. This is a remaining exposure limit, not a reason to add immunity or pad HP again.

**Shared Vapour remains weakly supported.** Reaction yields 133/226 transfers (solo/pair), but only 16/21 newly wet targets and 5/6 immediate reactions across four delayed cases. Basin produces 342/490 transfers but only 4/5 newly wet targets. The matched ablation is not consistently faster or safer with the Theorem. Most transfer goes into already primed nearby construction; numerical activity has not established a new useful decision. Keep it unchanged for this milestone and recommend reworking/replacing it later. Do not tune another Guardian around rescuing it.

**Low-effort strength is still a design risk.** The stationary/no-dodge sensitivity check now defeats base Ember (100 damage at 32.58 s), while moving base wins. Stationary Basin still wins in 13.28 s with 14 damage; Structure in 13.60 s with 26 damage, Reaction in 26.48 s with 60, Field in 23.52 s with 86. Basin is especially forgiving here. This is evidence to investigate encounter exposure and delivery tradeoffs later, not proof that all human builds are balanced or justification for an automatic spell nerf now.

Sampled live-state payload peaks at 8,609 bytes, four fields, seven bolts and 18 pending effects. This evaluator sample excludes bootstrap/event delivery and is not a bandwidth measurement. Real browser transport and frame measurements are recorded separately below.

The decision is to retain this one Guardian: the same material construction supports direct, reaction, spatial and structural play without elemental/build gates. Solo and paired scripted play are viable; human fairness, readability in every situation and subjective enjoyment remain unvalidated. Finite maneuver chains, late commitment, rotating living targets and material attachments look reusable. This exact plate arrangement, furnace construction and loosening phase belong to the Warden. No second Guardian or upgrade expansion is authorized by this result.

## Browser production limits and handoff

Final validation: 117 unit tests and production build pass; one clean full browser sweep passes 58, skips the opt-in live TURN probe, fails zero. Five additional focused Standard/gallery checks pass. Complete solo and actual two-client runs use normal health/AI, all three real reward choices and upgraded actions, then reach authoritative Guardian victory and restart. [TESTING.md](TESTING.md) retains the earlier failures, corrections, full-run frame/transport results and exact scope.

Runtime `9dd14b9dcd8f`, protocol 3. Native installed headless Chrome 152 on this Windows computer uses ANGLE Intel UHD (0x00009BC4), Direct3D 11. CSS viewport 1440×900; Lightweight draws 1152×720, Standard 1440×900. No video encoding or simulation batch overlaps the reported frame samples. Both local co-op clients share this one computer/GPU. These are not another laptop's measurements, remote TURN validation, human timing estimates or a sustained 60-FPS guarantee.

The focused Standard base fight passed in 50.18 s wall time: 2,899 rendered frames, mean 17.28 ms / p95 16.8 / p99 33.4. Standard Reaction/Field pair passed in 17.40 s: host/guest 453/466 frames, means 38.11/37.17 ms, p95 66.7/66.6. Final-state draws 394/395 are not fight-wide peaks. Four defeat/restart cycles returned to exactly 92 geometries, five textures and 256 draws. Two textures above Lightweight are the existing Standard shadow resources. Standard remains substantially heavier under paired effects; keep Lightweight recommended on this device.

An earlier current-runtime Lightweight Reaction/Field pair in the first sweep averaged 34.85/34.28 ms, p95 50/50, while the preceding development checkpoint was about 19 ms. Preserve the slower sample in `validation.json`; the differing input/effect scheduling and shared-machine conditions do not isolate a single cause. The same first sweep's complete Reaction/Structure paired run averaged 18.96/19.36 ms across 2,689/2,623 active frames. Do not describe these as a controlled before/after speedup. There was no snapshot-frequency increase or gameplay-quality reduction.

Final isolated Lightweight sweep: five solo builds pass, 906–2,615 frames each, means 16.64–16.93 ms and p95 16.8. Reaction/Field pair repeats the heavier result: 726/743 frames, means 33.48/32.81 ms, p95 50/50, 24.49 s wall. Four resets return to 92 geometries / three textures / 152 draws. The twelve-asset kit totals 1,643,700 GLB bytes; local asset-ready samples span about 157–305 ms, not internet loading estimates. Two physical plates, seven reused hazard meshes and bounded spell descendants avoid unbounded boss-specific growth.

That paired fight's rolling final 180 network samples: 6,646-byte mean / 15,060-byte maximum JSON snapshot; guest arrival mean 71.73 ms / p95 140.2; application mean 1.04 ms / p95 2.4; input acknowledgement mean 62.65 ms / p95 129.1. These measure local arrival/main-thread handling, not geographic latency. Blocked and deflected shards are event counts, not automatically prevented damage. Host and guest diagnostic captures occur sequentially, so their final cumulative packet totals can differ by an in-flight snapshot.

Actual game media: `/guardian/index.html`, three normal-health/active-AI build fights, three ten-second silent clips and one contact sheet. Their three-choice starting builds are explicit isolated-scene fixtures; all combat uses real keyboard/mouse. Complete solo/paired runs with actual personal reward choices are separate evidence. No concept images or simulated preview effects. Package local recordings with `python scripts/guardian-captures.py artifacts/guardian-0.1/raw/recorded-final`; sanitize measurements with `node scripts/guardian-report.mjs`. Raw recordings/connection details stay ignored.

Root is the complete five-court run; `?scene=guardian` is the direct unupgraded practice fight. Create co-op, share the room code, both Ready, using matching deployed builds. Retry same seed preserves deterministic offers; New run changes the host-owned seed and clears the build. Controls/settings remain collapsed. No new account, provider, billing, reconnect or host-migration work. Existing one-hour TURN credentials still have no in-session renewal.

Remaining presentation/physics limits: simple articulated poses rather than IK, generous gameplay body volumes, and existing projectile collision behavior. Attached plates can obstruct attacks; detached plates do not magically reattach when cohesion later rises. Cover can legitimately stop a March, but the initial fitted body no longer wedges in the central gap. Dense effects can partly obscure construction detail even though danger guides render clearly above them. Human testing should judge attack explanations and recovery/revive comfort; strong pairs can still skip the Furnace entirely.
